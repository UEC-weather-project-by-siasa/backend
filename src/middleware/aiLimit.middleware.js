const rateLimit = require('express-rate-limit');
const prisma = require('../config/db');

const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 15, 
  message: { status: 'error', message: 'คุณถามเร็วเกินไป กรุณารอ 1 นาที' }
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
    return res.status(429).json({ status: 'error', message: 'วันนี้คุณใช้โควตาครบ 20 คำถามแล้ว' });
  }

  next();
};

module.exports = { chatRateLimiter, checkDailyQuota };