const prisma = require('../config/db');
const { sendAlertEmail } = require('./email.service');
const { getIO } = require('../socket/socket');
const { createNotification } = require('./notification.service');

const COOLDOWN_MINUTES = 15;


const checkSensorAlerts = async (deviceId, sensorsPayload) => {
  try {
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return;

    const activeRules = await prisma.alertRule.findMany({
      where: { isActive: true, OR: [{ deviceId: device.id }, { type: 'GLOBAL' }] },
      include: { user: true, sensor: true }
    });

    for (const rule of activeRules) {
      const actualValue = sensorsPayload[rule.sensor.name];
      if (actualValue === undefined) continue;

      let isTriggered = false;
      // ... logic condition (>, <, >=) เหมือนเดิม ...

      if (isTriggered) {
        const now = new Date();
        const diffMinutes = (now - (rule.lastTrigger || 0)) / (1000 * 60);

        if (diffMinutes >= COOLDOWN_MINUTES) {
          // 1. Email Logic เหมือนเดิม
          
          // 2. Save Alert Log
          const newLog = await prisma.alertLog.create({
            data: {
              ruleId: rule.id,
              deviceId: device.id,
              sensorName: rule.sensor.name,
              condition: rule.condition,
              threshold: rule.threshold,
              actualValue: actualValue,
              message: `[${rule.name}] ${rule.sensor.name} triggered: ${actualValue} ${rule.condition} ${rule.threshold}`,
            }
          });

          // 3. ✨ NEW: Create Notifications & WebSocket ✨
          // ถ้าเป็น USER rule ส่งให้เจ้าของคนเดียว
          if (rule.type === 'USER' && rule.userId) {
            await createNotification(rule.userId, {
              title: 'Sensor Alert',
              message: newLog.message,
              alertLogId: newLog.id
            });
          } else {
            // ถ้าเป็น SYSTEM/GLOBAL ส่งให้ทุกคน (หรือเฉพาะ Admin ตามความต้องการ)
            const users = await prisma.user.findMany({ select: { id: true } });
            for (const u of users) {
              await createNotification(u.id, {
                title: rule.type === 'GLOBAL' ? 'Global Alert' : 'System Alert',
                message: newLog.message,
                alertLogId: newLog.id
              });
            }
          }

          await prisma.alertRule.update({ where: { id: rule.id }, data: { lastTrigger: now } });
        }
      }
    }
  } catch (error) { console.error(error); }
};


const createAlertRule = async (user, data) => {
  const isSpecType = data.type === 'SYSTEM' || data.type === 'GLOBAL';
  if (isSpecType && user.role !== 'ADMIN') throw new Error("Admin only for SYSTEM/GLOBAL");

  return await prisma.alertRule.create({
    data: {
      name: data.name,           // ระบุทีละตัวเพื่อความชัวร์
      note: data.note,
      type: data.type,
      condition: data.condition,
      isActive: data.isActive !== undefined ? data.isActive : true,
      
      // จัดการเรื่องความสัมพันธ์และตัวเลข
      userId: isSpecType ? null : user.id,
      deviceId: data.type === 'GLOBAL' ? null : parseInt(data.deviceId),
      sensorId: parseInt(data.sensorId),
      threshold: parseFloat(data.threshold),
      createdBy: user.id
    }
  });
};

const getUserAlerts = async (user) => {
  const where = user.role === 'ADMIN' 
    ? { OR: [{ userId: user.id }, { type: 'SYSTEM' }, { type: 'GLOBAL' }] }
    : { userId: user.id }; // User ธรรมดาดูได้แค่ของตัวเอง

  return await prisma.alertRule.findMany({
    where,
    include: { device: { select: { name: true } }, sensor: { select: { name: true, unit: true } } },
    orderBy: { createdAt: 'desc' }
  });
};

const updateAlertRule = async (id, user, data) => {
  const rule = await prisma.alertRule.findUnique({ where: { id: parseInt(id) } });
  if (!rule || (user.role !== 'ADMIN' && rule.userId !== user.id)) throw new Error("Unauthorized");
  return await prisma.alertRule.update({ where: { id: parseInt(id) }, data });
};

const deleteAlertRule = async (id, user) => {
  const rule = await prisma.alertRule.findUnique({ where: { id: parseInt(id) } });
  if (!rule) throw new Error("Not found");
  
  // Admin ลบได้หมด, User ลบได้เฉพาะ userId ตนเอง
  if (user.role !== 'ADMIN' && rule.userId !== user.id) {
    throw new Error("Unauthorized");
  }
  
  return await prisma.alertRule.delete({ where: { id: parseInt(id) } });
};

module.exports = { checkSensorAlerts, createAlertRule, getUserAlerts, updateAlertRule, deleteAlertRule };