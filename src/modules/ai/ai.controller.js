const { runBulkWeatherPredictionByAIModel } = require('./ai.service');
const prisma = require('../../config/db');

const triggerPrediction = async (req, res) => {
  try {
    const aiResults = await runBulkWeatherPredictionByAIModel();
    
    res.status(200).json({
      status: 'success',
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

const getLatestPredictions = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const predictions = await prisma.weatherPrediction.findMany({
      where: {
        device: { deviceId: deviceId }
      },
      orderBy: { createdAt: 'desc' },
      take: 10 // เอาแค่ 10 รายการล่าสุด
    });

    res.json({ status: 'success', data: predictions });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  triggerPrediction,
  getLatestPredictions
};