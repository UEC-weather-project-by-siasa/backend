const aiService = require('./ai.service');
const prisma = require('../../config/db');

/**
 * สั่งให้ AI ทำงานพยากรณ์อากาศสำหรับทุก Device ที่มีข้อมูล (Bulk)
 */
const triggerPrediction = async (req, res) => {
  try {
    const aiResults = await aiService.runBulkWeatherPredictionByAIModel();
    
    res.status(200).json({
      status: 'success',
      message: 'AI Bulk Prediction triggered successfully',
      count: aiResults.length,
      data: aiResults 
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * ดึงรายการประวัติคำทำนายอากาศ (มีระบบ Pagination, Search, และ Filter)
 */
const getPredictions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      deviceId,
      q,
      decision
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {};

    // กรองตามรหัสอุปกรณ์ (Internal String ID)
    if (deviceId) {
      where.device = {
        deviceId: deviceId
      };
    }

    // ค้นหาข้อความใน Insight หรือ Suggestion
    if (q) {
      where.OR = [
        { aiInsight: { contains: q, mode: 'insensitive' } },
        { aiSuggestion: { contains: q, mode: 'insensitive' } }
      ];
    }

    // กรองตามการตัดสินใจของ AI (เช่น none, alert_warning)
    if (decision) {
      where.aiDecision = decision;
    }

    const [predictions, total] = await Promise.all([
      prisma.weatherPrediction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          device: { select: { name: true, deviceId: true } }
        }
      }),
      prisma.weatherPrediction.count({ where })
    ]);

    res.json({
      status: 'success',
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      },
      data: predictions
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * ลบประวัติคำทำนายทั้งหมด (Admin Only)
 */
const deleteAllPredictions = async (req, res) => {
  try {
    const deleted = await prisma.weatherPrediction.deleteMany();

    res.json({
      status: 'success',
      message: 'All predictions deleted successfully',
      deletedCount: deleted.count
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * ถามคำถามเกี่ยวกับสภาพอากาศ (Ask AI) และบันทึกลง Log
 */
const handleAskAI = async (req, res) => {
  try {
    const { deviceId, question } = req.body;
    const userId = req.user.id;

    // เรียก AI Service เพื่อประมวลผลคำตอบจากข้อมูล InfluxDB
    const answer = await aiService.askWeatherAI(userId, question, deviceId);

    // บันทึกประวัติการถาม-ตอบลงในตาราง AiAskLog
    await prisma.aiAskLog.create({
      data: {
        userId: userId,
        deviceId: deviceId ? parseInt(deviceId) : null,
        question: question,
        answer: answer,
        status: "SUCCESS"
      }
    });

    res.json({ 
      status: 'success', 
      data: answer 
    });
  } catch (error) {
    // จัดการกรณีโควตาเต็ม (ถ้ามีการเช็คใน Service เพิ่มเติม) หรือ Error ทั่วไป
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

/**
 * ดึงประวัติการถาม-ตอบ AI (AI Chat Logs)
 */
const getLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, q } = req.query;
    
    const result = await aiService.getAiLogs(userId, { 
      page: parseInt(page), 
      limit: parseInt(limit), 
      search: q 
    });
    
    res.json({ 
      status: 'success', 
      ...result 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

/**
 * ลบประวัติการถาม AI (ลบทั้งหมดหรือรายตัว)
 */
const clearLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.query; // รับ ID ของ Log ถ้าต้องการลบแค่แถวเดียว

    await aiService.deleteAiLogs(userId, id);
    
    res.json({ 
      status: 'success', 
      message: id ? `Log ID ${id} deleted` : 'All your AI logs deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};



const getLastPredictions = async (req, res) => {
  try {
    const data = await aiService.getLatestPredictionsForAllDevices();
    
    res.status(200).json({
      status: 'success',
      count: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  triggerPrediction,
  getPredictions,
  deleteAllPredictions,
  handleAskAI,
  getLogs,
  clearLogs,
  getLastPredictions
};