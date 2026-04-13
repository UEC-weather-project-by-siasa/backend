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
    You are an expert in meteorology and AI analyzing IoT weather data (UEC Weather).

    Input Data (JSON): 
    ${JSON.stringify(batchInput)}

    Analysis Conditions:
    1. historyData: Each sensor contains an array of values [t-60, t-55, ..., t-5, t-0]
      **Ordered from past (Index 0) to present (last index)** with 5-minute intervals
    2. units: Use the provided sensor units to evaluate the severity of values
    3. location: Use geographic coordinates to assess local environmental context 
      (e.g., near sea, mountain, urban area)

    Your Tasks:
    - Analyze the Trend (Rising / Stable / Falling) from historical data
    - Predict 'next_values' for each sensor for the next 15-30 minutes
    - aiDecision: Choose one from [none, alert_warning, alert_critical] 
      based on severity and predicted values
    - aiSuggestion: Provide a short recommendation for users 
      (e.g., "Close windows", "Prepare for rain")
    - aiInsight: Provide a concise summary of the weather condition and important changes 
      (Write in English language, focus on key insights, avoid repeating numbers)

    Return JSON ARRAY ONLY. No additional explanation.

    Output Format:
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

    // const result = await model.generateContent(prompt);
    // const aiResponse = JSON.parse(result.response.text());

    // const predictionData = aiResponse.map(res => {
    //   const original = batchInput.find(b => b.internalId === res.internalId);
      
    //   const currentSnapshot = {};
    //   Object.keys(original.historyData).forEach(key => {
    //     const arr = original.historyData[key];
    //     currentSnapshot[key] = arr[arr.length - 1];
    //   });

    //   return {
    //     deviceId: res.internalId,
    //     aiModel: "Gemini-2.5-Flash",
    //     InputData: currentSnapshot, 
    //     predictionOutput: res.predictionOutput,
    //     predictFor: new Date(Date.now() + 15 * 60000),
    //     aiDecision: res.aiDecision,
    //     aiSuggestion: res.aiSuggestion,
    //     aiInsight: res.aiInsight
    //   };
    // });

    // // บันทึกแบบ Bulk ลง Postgres
    // if (predictionData.length > 0) {
    //   await prisma.weatherPrediction.createMany({ data: predictionData });
    // }

    // console.log(`Bulk Prediction completed for ${predictionData.length} devices.`);
    // return aiResponse;
    return "ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนาและทดสอบครับ โปรดรอการอัปเดตในเร็วๆ นี้!";

  } catch (error) {
    console.error('AI Bulk Prediction Error:', error);
    throw error;
  }
};

const askWeatherAI = async (userId, userQuestion, deviceId = null) => {
  let weatherSummary = [];

  try {
    if (deviceId) {
      const device = await prisma.device.findUnique({
        where: { deviceId: deviceId },
        select: { deviceId: true, name: true }
      });
      
      if (device) {
        const data = await getDeviceHistorySummary(device.deviceId, "-24h", "1h");
        if (Object.keys(data).length > 0) {
          weatherSummary.push({ deviceId: device.deviceId, name: device.name, data });
        }
      }
    } else {
      const allDevices = await prisma.device.findMany({
        select: { deviceId: true, name: true }
      });

      const historyPromises = allDevices.map(async (d) => {
        const data = await getDeviceHistorySummary(d.deviceId, "-24h", "1h");
        if (Object.keys(data).length > 0) {
          return { deviceId: d.deviceId, name: d.name, data };
        }
        return null;
      });

      const results = await Promise.all(historyPromises);
      weatherSummary = results.filter(res => res !== null);
    }

    console.log(`Collected data from ${weatherSummary.length} devices for AI`);

    if (weatherSummary.length === 0) return "ขออภัยครับ ไม่พบข้อมูลสภาพอากาศจากอุปกรณ์ใดๆ ในระบบเลย";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
    You are an intelligent weather data analysis AI (UEC Weather Platform).

    Here is the hourly summary data for the past 24 hours from all devices in the system:
    ${JSON.stringify(weatherSummary)}

    User Question: "${userQuestion}"

    Response Requirements:
    1. If the question is about trends, analyze using the provided historical data
    2. If comparing devices (e.g., which station is hotter), clearly mention device names
    3. Respond in English or Same Question Language , professional, concise, and easy to understand
    4. If some devices have missing or offline data, inform the user
    5. Provide helpful and practical insights when possible
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
    // return "ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนาและทดสอบครับ โปรดรอการอัปเดตในเร็วๆ นี้!";

  } catch (error) {
    console.error("❌ AskWeatherAI Error:", error);
    return "เกิดข้อผิดพลาดในการประมวลผลคำถามของคุณ กรุณาลองใหม่อีกครั้ง";
  }
};

const getDeviceHistorySummary = async (deviceId, range, interval) => {
  const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: ${range})
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> aggregateWindow(every: ${interval}, fn: mean, createEmpty: false)
  `;
  const results = {};
  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
      const o = tableMeta.toObject(values);
      if (!results[o.sensor]) results[o.sensor] = [];
      results[o.sensor].push({ time: o._time, value: o._value.toFixed(2) });
    }
  } catch (err) { console.error(err); }
  return results;
};

const getAiLogs = async (userId, { page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  const where = {
    userId: userId,
    OR: [
      { question: { contains: search, mode: 'insensitive' } },
      { answer: { contains: search, mode: 'insensitive' } }
    ]
  };

  const [logs, total] = await Promise.all([
    prisma.aiAskLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: { device: { select: { name: true } } }
    }),
    prisma.aiAskLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

const deleteAiLogs = async (userId, logId = null) => {
  if (logId) {
    // ลบเฉพาะรายการ
    return await prisma.aiAskLog.deleteMany({
      where: { id: parseInt(logId), userId: userId }
    });
  }
  // ลบทั้งหมดของ User คนนั้น
  return await prisma.aiAskLog.deleteMany({
    where: { userId: userId }
  });
};

const getLatestPredictionsForAllDevices = async () => {
  const devices = await prisma.device.findMany({
    select: { id: true, deviceId: true, name: true }
  });
  const latestPredictions = await Promise.all(
    devices.map(async (device) => {
      const lastPred = await prisma.weatherPrediction.findFirst({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'desc' },
        include: {
          device: {
            select: { name: true, deviceId: true }
          }
        }
      });
      return lastPred;
    })
  );

  return latestPredictions.filter(p => p !== null);
};

module.exports = { 
  runBulkWeatherPredictionByAIModel, 
  askWeatherAI,
  getAiLogs,
  deleteAiLogs,
  getLatestPredictionsForAllDevices
};