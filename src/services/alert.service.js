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
      where: {
        isActive: true,
        OR: [{ deviceId: device.id }, { type: 'GLOBAL' }]
      },
      // ดึงข้อมูล User และ Setting ออกมาด้วย
      include: { 
        user: { include: { setting: true } }, 
        sensor: true 
      }
    });

    for (const rule of activeRules) {
      const actualValue = sensorsPayload[rule.sensor.name];
      if (actualValue === undefined) continue;

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

        if (diffMinutes >= COOLDOWN_MINUTES) {
          
          const logMessage = `[${rule.name}] ${rule.sensor.name} triggered: ${actualValue} ${rule.condition} ${rule.threshold}`;
          const deviceDisplayName = device.name || device.deviceId;

          // 1. บันทึก Log ทุกครั้งที่มีการ Trigger (เพื่อเป็นประวัติระบบ)
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

          // 2. Logic การส่งแจ้งเตือนตาม Setting
          if (rule.type === 'USER' && rule.user) {
            const user = rule.user;
            const setting = user.setting || { enableEmailAlert: true, enableSystemNoti: true }; // default ถ้ายังไม่มี setting

            // เช็ค Setting Email
            if (setting.enableEmailAlert && user.email) {
              await sendAlertEmail(user.email, deviceDisplayName, rule.sensor.name, rule.condition, rule.threshold, actualValue);
            }

            // เช็ค Setting System Notification
            if (setting.enableSystemNoti) {
              await createNotification(user.id, {
                title: '🚨 Sensor Alert',
                message: logMessage,
                alertLogId: newLog.id
              });
            }

          } else {
            // กรณี SYSTEM / GLOBAL: ดึง User ทุกคนที่เปิดรับแจ้งเตือน
            const usersWithSettings = await prisma.user.findMany({
              include: { setting: true }
            });

            for (const u of usersWithSettings) {
              const setting = u.setting || { enableEmailAlert: true, enableSystemNoti: true };

              // ส่ง Email รายบุคคลถ้าเขาเปิดไว้
              if (setting.enableEmailAlert && u.email) {
                await sendAlertEmail(u.email, rule.type === 'GLOBAL' ? 'GLOBAL SYSTEM' : deviceDisplayName, rule.sensor.name, rule.condition, rule.threshold, actualValue);
              }

              // สร้าง Notification รายบุคคลถ้าเขาเปิดไว้
              if (setting.enableSystemNoti) {
                await createNotification(u.id, {
                  title: rule.type === 'GLOBAL' ? '🌐 Global Alert' : '⚠️ System Alert',
                  message: logMessage,
                  alertLogId: newLog.id
                });
              }
            }
          }

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
  const ruleId = parseInt(id);
  
  const rule = await prisma.alertRule.findUnique({ where: { id: ruleId } });
  if (!rule || (user.role !== 'ADMIN' && rule.userId !== user.id)) {
    throw new Error("Unauthorized");
  }

  const updateData = {
    name: data.name,
    note: data.note,
    condition: data.condition,
    isActive: data.isActive,
    threshold: data.threshold !== undefined ? parseFloat(data.threshold) : undefined,
    sensorId: data.sensorId !== undefined ? parseInt(data.sensorId) : undefined,
    deviceId: data.deviceId !== undefined ? (data.deviceId ? parseInt(data.deviceId) : null) : undefined,
  };

  return await prisma.alertRule.update({
    where: { id: ruleId },
    data: updateData
  });
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