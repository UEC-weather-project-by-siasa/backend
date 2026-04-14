const client = require('./mqtt.client');
const { writeApi, Point } = require('../config/influx'); // ← import InfluxDB
const { getIO } = require('../socket/socket');
const prisma = require('../config/db');
const { checkSensorAlerts } = require('../services/alert.service');

// ─────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────
const sensorCache = new Map();
const deviceCache = new Map();

// ─────────────────────────────────────────────
// โหลด sensor mapping
// ─────────────────────────────────────────────
const loadDeviceSensors = async (deviceId) => {
  const mappings = await prisma.deviceSensor.findMany({
    where: {
      device: { deviceId }
    },
    include: {
      sensor: true,
    },
  });

  const sensorSet = new Set(mappings.map(m => m.sensor.name));
  sensorCache.set(deviceId, sensorSet);

  return sensorSet;
};

// ─────────────────────────────────────────────
// Update device status
// ─────────────────────────────────────────────
const updateDeviceOnline = async (deviceId, isOnline) => {
  try {
    const cached = deviceCache.get(deviceId);
    const now = Date.now();

    const statusChanged = !cached || cached.isOnline !== isOnline;

    deviceCache.set(deviceId, { lastUpdate: now, isOnline });

    await prisma.device.updateMany({
      where: { deviceId },
      data: { isOnline, lastSeen: new Date() }
    });

    if (statusChanged) {
      await logToDevice(
        deviceId,
        isOnline ? 'INFO' : 'WARN',
        isOnline ? 'Device came online' : 'Device went offline',
        isOnline ? 'DEVICE_ONLINE' : 'DEVICE_OFFLINE'
      );
    }

    // console.log(`Device ${deviceId} → ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  } catch (err) {
    console.error(`DB update failed for ${deviceId}:`, err.message);
  }
};

// ─────────────────────────────────────────────
// Log
// ─────────────────────────────────────────────
// ใน src/mqtt/mqtt.handler.js

const logToDevice = async (deviceId, level, message, eventCode = 'GENERIC', meta = null) => {
  try {
    const device = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) return;

    const newLog = await prisma.deviceLog.create({
      data: {
        deviceId: device.id,
        level,
        eventCode,
        message,
        meta,
      },
    });

    const io = getIO();
    io.emit(`device:log:${deviceId}`, newLog);
    io.emit('device:log:all', { ...newLog, deviceName: device.name });

  } catch (err) {
    console.error(`DeviceLog write failed:`, err.message);
  }
};

// ─────────────────────────────────────────────
// HEARTBEAT MONITOR
// ─────────────────────────────────────────────
const startHeartbeatMonitor = () => {
  setInterval(async () => {
    const now = Date.now();

    for (const [deviceId, cached] of deviceCache.entries()) {

      if (now - cached.lastUpdate > 60000 && cached.isOnline) {
        await updateDeviceOnline(deviceId, false); 

        const io = getIO();
        io.emit(`device:status:${deviceId}`, { deviceId, isOnline: false });
        io.emit('device:status:all', { deviceId, isOnline: false });
      }
    }

  }, 30000); // check ทุก 30 วิ
};

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
const handleMessages = () => {

  startHeartbeatMonitor();

  client.on('message', async (topic, message) => {
    const io = getIO();

    if (topic.startsWith('device/') && topic.endsWith('/data')) {
      const deviceId = topic.split('/')[1];
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (err) { return; }

      const sensorsPayload = payload.sensors || {};
      const netMode = payload.net_mode || 'N/A';

      // 1. บันทึกลง InfluxDB (วนลูปเก็บตามมาตรฐานเดิม)
      let sensors = sensorCache.get(deviceId);
      if (!sensors) sensors = await loadDeviceSensors(deviceId);
      
      let hardwareTs = Number(payload.ts);

      // ถ้าเป็น seconds → แปลงเป็น ms
      if (hardwareTs < 1000000000000) {
        hardwareTs = hardwareTs * 1000;
      }

      if (!hardwareTs || hardwareTs < 1000000000000) { 
        console.error("Invalid Timestamp received:", hardwareTs);
        return; 
      }

      for (const [sensorName, value] of Object.entries(sensorsPayload)) {
        if (!sensors.has(sensorName)) continue;

        const point = new Point('sensor_reading')
          .tag('device_id', deviceId)
          .tag('sensor', sensorName)
          .floatField('value', parseFloat(value))
          .timestamp(new Date(hardwareTs)); 

        writeApi.writePoint(point);
      }

      // 2. ⚡️ ส่ง Real-time แบบ "มัดรวม" (เหมาะกับ Dashboard มากกว่า)
      const deviceUpdate = {
        deviceId,
        sensors: sensorsPayload, // ส่งไปทั้งก้อน { temp: 25, humi: 60 }
        net_mode: netMode,
        ts: hardwareTs,
        isOnline: true, // ส่งข้อมูลมาแปลว่ายัง Online
        lastUpdate: new Date()
      };

      // console.log(`MQTT Data Received: ${deviceId} →`, deviceUpdate);

      // สำหรับหน้า Dashboard รวม (ทุกคนเห็นเหมือนกัน)
      io.emit('device:update:all', deviceUpdate);

      // สำหรับหน้าเจาะจงรายเครื่อง (Frontend ฟังเฉพาะ id ตัวเอง)
      io.emit(`device:update:${deviceId}`, deviceUpdate);

      checkSensorAlerts(deviceId, sensorsPayload).catch(err => console.error(err));

      await updateDeviceOnline(deviceId, true);
    }

    // ───────── สถานะ Online/Offline ─────────
    else if (topic.startsWith('device/') && topic.endsWith('/status')) {
      const deviceId = topic.split('/')[1];
      const isOnline = message.toString() === 'online';

      const statusUpdate = { deviceId, isOnline, timestamp: new Date() };

      // แจ้งเตือนสถานะเปลี่ยนไปที่หน้า Dashboard
      io.emit('device:status:all', statusUpdate);
      io.emit(`device:status:${deviceId}`, statusUpdate);

      await updateDeviceOnline(deviceId, isOnline);

      await logToDevice(
        deviceId,
        isOnline ? 'INFO' : 'WARN',
        isOnline ? 'Device connected' : 'Device disconnected',
        isOnline ? 'DEVICE_ONLINE' : 'DEVICE_OFFLINE'
      );
    }
  });

};

module.exports = { handleMessages };
