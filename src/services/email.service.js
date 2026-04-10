const prisma = require('../config/db');
const { sendAlertEmail } = require('./email.service');
const { createNotification } = require('./notification.service');

const COOLDOWN_MINUTES = 15;

const checkSensorAlerts = async (deviceId, sensorsPayload) => {
  try {
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return;

    // ดึง Rule ทั้งหมดที่เกี่ยวข้อง (ของ Device นี้ หรือที่เป็น Global)
    const activeRules = await prisma.alertRule.findMany({
      where: {
        isActive: true,
        OR: [{ deviceId: device.id }, { type: 'GLOBAL' }]
      },
      include: { user: true, sensor: true }
    });

    for (const rule of activeRules) {
      const actualValue = sensorsPayload[rule.sensor.name];
      if (actualValue === undefined) continue;

      // --- 1. Logic Condition Check ---
      let isTriggered = false;
      switch (rule.condition) {
        case '>': isTriggered = actualValue > rule.threshold; break;
        case '<': isTriggered = actualValue < rule.threshold; break;
        case '>=': isTriggered = actualValue >= rule.threshold; break;
        case '<=': isTriggered = actualValue <= rule.threshold; break;
        case '==': isTriggered = actualValue === rule.threshold; break;
      }

      if (isTriggered) {
        const now = new Date();
        const diffMinutes = (now - (rule.lastTrigger || 0)) / (1000 * 60);

        // เช็ค Cooldown ป้องกัน Email/Notification รัว
        if (diffMinutes >= COOLDOWN_MINUTES) {
          
          // --- 2. Prepare Data & Save Alert Log ---
          const logMessage = `[${rule.name}] ${rule.sensor.name} triggered: ${actualValue} ${rule.condition} ${rule.threshold}`;
          
          const newLog = await prisma.alertLog.create({
            data: {
              ruleId: rule.id,
              deviceId: device.id,
              sensorName: rule.sensor.name,
              condition: rule.condition,
              threshold: rule.threshold,
              actualValue: actualValue,
              message: logMessage,
            }
          });

          // --- 3. Notification & Email Logic ---
          const deviceDisplayName = device.name || device.deviceId;

          if (rule.type === 'USER' && rule.user?.id) {
            // กรณี USER: ส่งให้เจ้าของคนเดียว
            if (rule.user.email) {
              await sendAlertEmail(rule.user.email, deviceDisplayName, rule.sensor.name, rule.condition, rule.threshold, actualValue);
            }
            await createNotification(rule.user.id, {
              title: '🚨 Sensor Alert',
              message: logMessage,
              alertLogId: newLog.id
            });
          } else {
            // กรณี SYSTEM / GLOBAL: ส่งให้ทุกคนในระบบ
            const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
            
            // ส่ง Email กลุ่ม (BCC)
            const emails = allUsers.map(u => u.email).filter(e => e);
            if (emails.length > 0) {
              await sendAlertEmail(emails, rule.type === 'GLOBAL' ? 'GLOBAL SYSTEM' : deviceDisplayName, rule.sensor.name, rule.condition, rule.threshold, actualValue);
            }

            // สร้าง Notification รายคน + ยิง WebSocket (ผ่าน notificationService)
            for (const u of allUsers) {
              await createNotification(u.id, {
                title: rule.type === 'GLOBAL' ? '🌐 Global Alert' : '⚠️ System Alert',
                message: logMessage,
                alertLogId: newLog.id
              });
            }
          }

          // อัปเดตเวลาที่ Trigger ล่าสุด
          await prisma.alertRule.update({ 
            where: { id: rule.id }, 
            data: { lastTrigger: now } 
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in checkSensorAlerts:", error);
  }
};

const createAlertRule = async (user, data) => {
  const isSpecType = data.type === 'SYSTEM' || data.type === 'GLOBAL';
  if (isSpecType && user.role !== 'ADMIN') throw new Error("Admin only for SYSTEM/GLOBAL");

  return await prisma.alertRule.create({
    data: {
      name: data.name,
      note: data.note,
      type: data.type,
      condition: data.condition,
      isActive: data.isActive !== undefined ? data.isActive : true,
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
    : { userId: user.id };

  return await prisma.alertRule.findMany({
    where,
    include: { device: { select: { name: true } }, sensor: { select: { name: true, unit: true } } },
    orderBy: { createdAt: 'desc' }
  });
};

const updateAlertRule = async (id, user, data) => {
  const rule = await prisma.alertRule.findUnique({ where: { id: parseInt(id) } });
  if (!rule || (user.role !== 'ADMIN' && rule.userId !== user.id)) throw new Error("Unauthorized");
  
  // ปรับข้อมูลก่อนอัปเดต (ถ้ามีการส่งมา)
  const updateData = { ...data };
  if (data.deviceId) updateData.deviceId = parseInt(data.deviceId);
  if (data.sensorId) updateData.sensorId = parseInt(data.sensorId);
  if (data.threshold) updateData.threshold = parseFloat(data.threshold);

  return await prisma.alertRule.update({ where: { id: parseInt(id) }, data: updateData });
};

const deleteAlertRule = async (id, user) => {
  const rule = await prisma.alertRule.findUnique({ where: { id: parseInt(id) } });
  if (!rule) throw new Error("Not found");
  if (user.role !== 'ADMIN' && rule.userId !== user.id) throw new Error("Unauthorized");
  
  return await prisma.alertRule.delete({ where: { id: parseInt(id) } });
};

module.exports = { 
  checkSensorAlerts, 
  createAlertRule, 
  getUserAlerts, 
  updateAlertRule, 
  deleteAlertRule 
};