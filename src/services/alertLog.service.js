const prisma = require('../config/db');

const getAlertLogs = async (query, user) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  
  // เงื่อนไขเหมือน Alert Rule: Admin ดู System/Global ได้, User ดูแค่ของตัวเอง
  const where = {
    alertRule: user.role === 'ADMIN' 
      ? { OR: [{ userId: user.id }, { type: 'SYSTEM' }, { type: 'GLOBAL' }] }
      : { userId: user.id }
  };

  if (query.deviceId) where.deviceId = parseInt(query.deviceId);

  const [logs, total] = await Promise.all([
    prisma.alertLog.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { 
        device: { select: { name: true } }, 
        alertRule: { select: { name: true, type: true } } }
    }),
    prisma.alertLog.count({ where })
  ]);

  return { data: logs, meta: { total, page, limit } };
};

// ล้าง Log ทั้งหมด (Admin Only)
const clearAllLogsAdmin = async () => {
  return await prisma.alertLog.deleteMany({});
};

const clearUserAlertLogs = async (query, user) => {
  const result = await prisma.alertLog.deleteMany({
    where: { alertRule: { userId: user.id }, ...(query.deviceId && { deviceId: parseInt(query.deviceId) }) }
  });
  return result.count;
};



module.exports = { getAlertLogs, clearUserAlertLogs, clearAllLogsAdmin };