const { runBulkWeatherPredictionByAIModel } = require('./ai.service');
const prisma = require('../../config/db');

const triggerPrediction = async (req, res) => {
  try {
    const aiResults = await runBulkWeatherPredictionByAIModel();
    
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


// ─────────────────────────────────────────────
// Pagination API
// ─────────────────────────────────────────────

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

    // filter by deviceId
    if (deviceId) {
      where.device = {
        deviceId: deviceId
      };
    }

    // search text
    if (q) {
      where.OR = [
        {
          aiInsight: {
            contains: q,
            mode: 'insensitive'
          }
        },
        {
          aiSuggestion: {
            contains: q,
            mode: 'insensitive'
          }
        }
      ];
    }

    // filter decision
    if (decision) {
      where.aiDecision = decision;
    }

    const [predictions, total] = await Promise.all([
      prisma.weatherPrediction.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip: parseInt(skip),
        take: parseInt(limit)
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


// ─────────────────────────────────────────────
// Delete All (Admin only)
// ─────────────────────────────────────────────

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


module.exports = {
  triggerPrediction,
  getPredictions,
  deleteAllPredictions
};