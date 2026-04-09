const prisma = require('../../config/db');

/**
 * ดึงรายการ Logs แบบแบ่งหน้า (Pagination)
 * รองรับการดึงของ 1 เครื่อง หรือ ดึงของ "all" (ทุกเครื่อง)
 */
const getDeviceLogs = async (deviceId, { 
  level, 
  eventCode, 
  limit = 50, 
  page = 1, 
  isRead 
} = {}) => {
  const skip = (page - 1) * limit;
  let where = {};

  // ถ้าไม่ได้ระบุว่าเป็น 'all' ให้ทำการ filter เฉพาะ deviceId ที่ส่งมา
  if (deviceId && deviceId !== 'all') {
    const device = await prisma.device.findUnique({
      where: { deviceId },
      select: { id: true }
    });

    if (!device) throw new Error('Device not found');
    where.deviceId = device.id;
  }

  // เพิ่ม Filter อื่นๆ
  if (level && level !== 'ALL') where.level = level;
  if (eventCode) where.eventCode = eventCode;
  if (isRead !== undefined && isRead !== 'ALL') {
    where.isRead = isRead === 'true';
  }

  const [logs, total] = await prisma.$transaction([
    prisma.deviceLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
      // ดึงข้อมูลชื่ออุปกรณ์มาด้วย เพื่อแสดงในหน้า Frontend ตอนเลือก 'All Devices'
      include: {
        device: {
          select: { name: true, deviceId: true }
        }
      }
    }),
    prisma.deviceLog.count({ where })
  ]);

  // Map ข้อมูลให้ Frontend เรียกใช้งานง่ายขึ้น (แบนข้อมูล deviceName ออกมา)
  const formattedLogs = logs.map(log => ({
    ...log,
    deviceName: log.device ? (log.device.name || log.device.deviceId) : 'Unknown'
  }));

  return {
    logs: formattedLogs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
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
 * ล้าง Log ทั้งหมดในระบบ (Clear All Logs)
 */
const deleteAllLogs = async () => {
  return await prisma.deviceLog.deleteMany({});
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
  deleteAllLogs,
  purgeOldLogs
};