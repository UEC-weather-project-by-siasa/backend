const prisma = require('../../config/db');
const { queryApi } = require('../../config/influx');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");

// Initialize APIs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * ฟังก์ชันช่วยสำหรับ Exponential Backoff
 */
const retryWithBackoff = async (fn, retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if ((error.status === 503 || error.status === 429) && i < retries - 1) {
        const waitTime = delay * Math.pow(2, i) + Math.random() * 1000;
        console.warn(`⚠️ AI Busy/Limit, Retrying in ${waitTime.toFixed(0)}ms...`);
        await new Promise(res => setTimeout(res, waitTime));
        continue;
      }
      throw error;
    }
  }
};

/**
 * งานพยากรณ์อากาศแบบกลุ่ม (ใช้ Groq 100% เพราะเร็วและโควตาเยอะ)
 */
const runBulkWeatherPredictionByAIModel = async () => {
  try {
    const devices = await prisma.device.findMany({
      include: { sensors: { include: { sensor: true } } },
    });

    if (devices.length === 0) return [];

    const batchInput = [];
    // --- ส่วนดึงข้อมูลจาก InfluxDB ---
    for (const d of devices) {
      const sensorHistory = {}; 
      const sensorUnits = {};
      d.sensors.forEach(ds => { sensorUnits[ds.sensor.name] = ds.sensor.unit; });

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
      } catch (err) { console.error(`Influx error for ${d.deviceId}:`, err.message); }

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

    if (batchInput.length === 0) return [];

    const predictionResults = [];

    for (const input of batchInput) {
      try {
        const detailedPrompt = `
          You are an expert in meteorology analyzing IoT weather data for device: ${input.name}.
          Input Data: ${JSON.stringify(input)}

          Tasks:
          - Analyze the Trend (Rising / Stable / Falling) from historical data
          - Predict 'next_values' for the next 15-30 minutes
          - aiDecision: Choose from [none, alert_warning, alert_critical]
          - aiSuggestion: Short recommendation
          - aiInsight: Concise summary in English.

          Return JSON OBJECT ONLY.
          Format:
          {
              "internalId": number,
              "predictionOutput": { 
                  "confidence": float (0.0 - 1.0), 
                  "trend": "rising" | "stable" | "falling", 
                  "next_values": { "sensor_name": value } 
              },
              "aiDecision": "string",
              "aiSuggestion": "string",
              "aiInsight": "string"
          }
        `;

        const chatCompletion = await retryWithBackoff(() => groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are a professional meteorologist. You must respond with valid JSON only based on the provided format."
            },
            {
              role: "user",
              content: detailedPrompt
            }
          ],
          model: GROQ_MODEL,
          response_format: { type: "json_object" }
        }));

        const aiRes = JSON.parse(chatCompletion.choices[0].message.content);
        
        const currentSnapshot = {};
        Object.keys(input.historyData).forEach(key => {
          const arr = input.historyData[key];
          currentSnapshot[key] = arr[arr.length - 1];
        });

        predictionResults.push({
          deviceId: input.internalId, 
          aiModel: GROQ_MODEL,
          InputData: currentSnapshot,
          predictionOutput: aiRes.predictionOutput, 
          predictFor: new Date(Date.now() + 30 * 60000),
          aiDecision: aiRes.aiDecision,
          aiSuggestion: aiRes.aiSuggestion,
          aiInsight: aiRes.aiInsight
        });

        console.log(`Groq Processed: ${input.name}`);
        
        await new Promise(res => setTimeout(res, 1500)); 

      } catch (err) {
        console.error(`Skip device ${input.deviceId}:`, err.message);
      }
    }

    if (predictionResults.length > 0) {
      await prisma.weatherPrediction.createMany({ data: predictionResults });
      console.log(`Saved ${predictionResults.length} predictions via Groq.`);
    }

    return predictionResults;
  } catch (error) {
    console.error('AI Bulk Prediction Failed:', error.message);
    return null;
  }
};

/**
 * ถามคำตอบสภาพอากาศ (ใช้ Gemini เป็นหลัก และ Groq เป็นสำรอง)
 */
const askWeatherAI = async (userId, userQuestion, deviceId = null) => {
  let weatherSummary = [];

  try {
    if (deviceId) {
      const device = await prisma.device.findUnique({ where: { deviceId }, select: { deviceId: true, name: true } });
      if (device) {
        const data = await getDeviceHistorySummary(device.deviceId, "-24h", "1h");
        weatherSummary.push({ deviceId: device.deviceId, name: device.name, data });
      }
    } else {
      const allDevices = await prisma.device.findMany({ select: { deviceId: true, name: true } });
      const historyPromises = allDevices.map(async (d) => {
        const data = await getDeviceHistorySummary(d.deviceId, "-24h", "1h");
        return Object.keys(data).length > 0 ? { deviceId: d.deviceId, name: d.name, data } : null;
      });
      weatherSummary = (await Promise.all(historyPromises)).filter(res => res !== null);
    }

    if (weatherSummary.length === 0) throw new Error("NO_DATA");

        const prompt = `
        You are the "UEC Weather AI", a professional meteorology expert for an IoT platform.

        ### LANGUAGE LOCK (VERY IMPORTANT)
        - Detect the language of the USER QUESTION.
        - You MUST respond ONLY in that language.
        - DO NOT switch language.
        - DO NOT translate unless user asks.
        - If user writes in English → answer ONLY in English.
        - If user writes in Thai → answer ONLY in Thai.

        If you respond in the wrong language, your answer is considered INVALID.

        ---

        ### DATA PRIORITY RULE (CRITICAL)
        - Use ONLY the provided sensor data as your PRIMARY source.
        - Do NOT invent or assume missing values.
        - If external knowledge is needed (e.g., general weather patterns), it must be SECONDARY and clearly based on the provided data trends.
        - Always prioritize real sensor data over assumptions.

        ---

        ### LOCATION AWARENESS
        - Use device location (latitude, longitude) to enhance analysis.
        - Consider environment context (urban, rural, humidity patterns, etc.) ONLY if relevant.
        - Do NOT hallucinate geography.

        ---

        ### CONTEXT DATA (Last 24 Hours)
        ${JSON.stringify(weatherSummary)}

        ### USER QUESTION
        "${userQuestion}"

        ---

        ### RESPONSE RULES

        1. Start with a direct answer immediately.
        2. Keep it concise but insightful (max ~12 sentences).
        3. Focus on:
          - Trends (rising / falling / stable)
          - Recent anomalies (last 3–6 hours)
          - Comparison between devices (if multiple)
        4. Avoid listing raw numbers — summarize instead.
        5. If tomorrow is asked:
          - Infer ONLY from trends (DO NOT claim certainty)
        6. If insufficient data:
          - Say: "Insufficient data to conclude."

        ---

        ### OUTPUT STYLE
        - Plain text only
        - No JSON
        - No markdown
        - No greetings
        - No AI disclaimers

        ---

        ### GOAL
        Act like a real meteorologist giving precise, data-driven insight.
        `;

    // --- TRY GEMINI FIRST ---
    try {
      console.log("Attempting Gemini 1.5 Flash...");
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (geminiError) {
      console.warn("Gemini failed or limited, falling back to Groq...");
      
      // --- FALLBACK TO GROQ ---
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: GROQ_MODEL,
      });
      return chatCompletion.choices[0].message.content + "\n\n(Answered by Backup AI)";
    }

  } catch (error) {
    console.error("AskWeatherAI Error:", error);
    throw error;
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
    status: 'SUCCESS',
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

const cleanupOldPredictions = async () => {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const deleted = await prisma.weatherPrediction.deleteMany({
      where: {
        createdAt: {
          lt: fourteenDaysAgo, // lt = less than (น้อยกว่า/เก่ากว่า)
        },
      },
    });

    console.log(`[Cleanup] Deleted ${deleted.count} old weather predictions.`);
    return deleted.count;
  } catch (error) {
    console.error('[Cleanup Error]:', error.message);
    return 0;
  }
};

module.exports = { 
  runBulkWeatherPredictionByAIModel, 
  askWeatherAI,
  getAiLogs,
  deleteAiLogs,
  getLatestPredictionsForAllDevices,
  cleanupOldPredictions
};