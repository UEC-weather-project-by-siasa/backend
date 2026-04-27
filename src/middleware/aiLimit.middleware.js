const rateLimit = require('express-rate-limit');
const prisma = require('../config/db');

const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 15, 
  message: { status: 'error', message: 'You are asking too many questions. Please wait a minute.' }
});

const checkDailyQuota = async (req, res, next) => {
  const userId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usageCount = await prisma.aiAskLog.count({
    where: {
      userId: userId,
      createdAt: { gte: today },
      status: "SUCCESS"
    }
  });

  if (usageCount >= 20) {
    return res.status(429).json({ status: 'error', message: 'You have used up your quota of 20 questions today.' });
  }

  next();
};

module.exports = { chatRateLimiter, checkDailyQuota };