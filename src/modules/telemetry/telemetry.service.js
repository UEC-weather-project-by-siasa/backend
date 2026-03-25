const prisma = require('../../config/db');

/**
 * ดึงรายการ Logs แบบแบ่งหน้า (Pagination)
 */
const getDeviceLogs = async (deviceId, { 
  level, 
  eventCode, 
  limit = 50, 
  page = 1, 
  isRead 
} = {}) => {
  const skip = (page - 1) * limit;
  
  // หา ID ของ Device ก่อน เพราะ Log ผูกกับ ID (Int) ไม่ใช่ deviceId (String)
  const device = await prisma.device.findUnique({
    where: { deviceId },
    select: { id: true }
  });

  if (!device) throw new Error('Device not found');

  const where = {
    deviceId: device.id,
    ...(level && { level }),
    ...(eventCode && { eventCode }),
    ...(isRead !== undefined && { isRead: isRead === 'true' })
  };

  const [logs, total] = await prisma.$transaction([
    prisma.deviceLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
    }),
    prisma.deviceLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * ทำเครื่องหมายว่าอ่านแล้ว (Notification)
 */
const markAsRead = async (logId) => {
  return await prisma.deviceLog.update({
    where: { id: parseInt(logId) },
    data: { isRead: true }
  });
};

/**
 * คำนวณสรุปสถานะ Device ทั้งหมด (Dashboard Summary)
 */
const getTelemetrySummary = async () => {
  const totalDevices = await prisma.device.count();
  const onlineDevices = await prisma.device.count({ where: { isOnline: true } });
  
  // ดึง Error log ล่าสุด 5 รายการจากระบบ
  const recentErrors = await prisma.deviceLog.findMany({
    where: { level: 'ERROR' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { device: { select: { deviceId: true, name: true } } }
  });

  return {
    totalDevices,
    onlineDevices,
    offlineDevices: totalDevices - onlineDevices,
    recentErrors
  };
};

/**
 * ลบ Log เก่า (Retention Policy) - แนะนำให้รันเป็น Cron Job
 */
const purgeOldLogs = async (days = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return await prisma.deviceLog.deleteMany({
    where: {
      createdAt: { lt: date }
    }
  });
};

module.exports = {
  getDeviceLogs,
  markAsRead,
  getTelemetrySummary,
  purgeOldLogs
};