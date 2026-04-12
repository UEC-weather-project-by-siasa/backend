const prisma = require('../../config/db');
const { queryApi } = require('../../config/influx');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const runBulkWeatherPredictionByAIModel = async () => {
  try {
    const devices = await prisma.device.findMany({
      include: { sensors: { include: { sensor: true } } },
    });

    if (devices.length === 0) return [];

    const batchInput = [];

    for (const d of devices) {
      const sensorHistory = {}; 
      const sensorUnits = {};

      d.sensors.forEach(ds => {
        sensorUnits[ds.sensor.name] = ds.sensor.unit;
      });

      const query = `
        from(bucket: "${process.env.INFLUX_BUCKET}")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "sensor_reading")
          |> filter(fn: (r) => r.device_id == "${d.deviceId}")
          |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
          |> yield(name: "mean")
      `;

      try {
        for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
          const o = tableMeta.toObject(values);
          const sName = o.sensor;
          if (!sensorHistory[sName]) sensorHistory[sName] = [];
          
          sensorHistory[sName].push(parseFloat(o._value.toFixed(2)));
        }
      } catch (err) {
        console.error(`Influx error for ${d.deviceId}:`, err.message);
      }

      if (Object.keys(sensorHistory).length > 0) {
        batchInput.push({
          internalId: d.id,
          deviceId: d.deviceId,
          name: d.name,
          location: { lat: d.latitude, lon: d.longitude },
          units: sensorUnits,
          historyData: sensorHistory 
        });
      }
    }

    if (batchInput.length === 0) {
      console.log("⚠️ No active sensor data to predict.");
      return [];
    }

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      คุณคือผู้เชี่ยวชาญด้านอุตุนิยมวิทยาและ AI วิเคราะห์ข้อมูล IoT (UEC Weather)
      
      ข้อมูล Input (JSON): 
      ${JSON.stringify(batchInput)}
      
      เงื่อนไขการวิเคราะห์:
      1. historyData: ในแต่ละเซ็นเซอร์ ข้อมูลเป็น Array [t-60, t-55, ..., t-5, t-0] 
        **เรียงจาก อดีต (Index 0) ไปหา ปัจจุบัน (Index สุดท้าย)** เก็บทุกๆ 5 นาที
      2. units: ใช้หน่วยที่ระบุในฟิลด์นี้ในการวิเคราะห์ความรุนแรงของค่าที่ได้รับ
      3. location: ใช้พิกัดทางภูมิศาสตร์เพื่อประเมินสภาพแวดล้อมท้องถิ่น (เช่น ใกล้ทะเล, บนเขา, เขตเมือง)

      งานของคุณ:
      - วิเคราะห์ Trend (Rising/Stable/Falling) จากลำดับข้อมูล
      - พยากรณ์ค่า 'next_values' ของทุกเซ็นเซอร์ในอีก 15 นาทีข้างหน้า
      - aiDecision: เลือกตอบจาก [none, alert_warning, alert_critical] ตามความรุนแรงของการเปลี่ยนแปลงและค่าที่คาดการณ์
      - aiSuggestion: คำแนะนำสั้นๆ สำหรับผู้ใช้ (เช่น "ควรปิดหน้าต่าง", "พกเสื้อกันฝน")
      - aiInsight: สรุปสภาวะและความเปลี่ยนแปลงที่สำคัญ (ภาษาไทย) **เน้นใจความสำคัญ ไม่ต้องทวนตัวเลขทั้งหมด**

      **ตอบกลับเป็น JSON ARRAY เท่านั้น ห้ามมีคำอธิบายอื่น**
        โครงสร้าง Output:
        [{
            "internalId": number,
            "predictionOutput": { 
            "confidence": float (0.0 - 1.0), 
            "trend": "rising" | "stable" | "falling", 
            "next_values": { "sensor_name": value } 
            },
            "aiDecision": "string",
            "aiSuggestion": "string",
            "aiInsight": "string"
        }]
    `;

    // console.log(prompt); // Debug: ดู Prompt ที่ส่งไปยัง AI

    const result = await model.generateContent(prompt);
    const aiResponse = JSON.parse(result.response.text());

    const predictionData = aiResponse.map(res => {
      const original = batchInput.find(b => b.internalId === res.internalId);
      
      const currentSnapshot = {};
      Object.keys(original.historyData).forEach(key => {
        const arr = original.historyData[key];
        currentSnapshot[key] = arr[arr.length - 1];
      });

      return {
        deviceId: res.internalId,
        aiModel: "Gemini-2.5-Flash",
        InputData: currentSnapshot, 
        predictionOutput: res.predictionOutput,
        predictFor: new Date(Date.now() + 15 * 60000),
        aiDecision: res.aiDecision,
        aiSuggestion: res.aiSuggestion,
        aiInsight: res.aiInsight
      };
    });

    // บันทึกแบบ Bulk ลง Postgres
    if (predictionData.length > 0) {
      await prisma.weatherPrediction.createMany({ data: predictionData });
    }

    console.log(`Bulk Prediction completed for ${predictionData.length} devices.`);
    return aiResponse;

  } catch (error) {
    console.error('AI Bulk Prediction Error:', error);
    throw error;
  }
};

module.exports = { runBulkWeatherPredictionByAIModel };