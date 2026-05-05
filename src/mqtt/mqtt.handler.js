const client = require('./mqtt.client');
const { writeApi, Point } = require('../config/influx');
const { getIO } = require('../socket/socket');
const prisma = require('../config/db');
const { checkSensorAlerts } = require('../services/alert.service');

// ─────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────
const sensorCache = new Map();
const deviceCache = new Map();

const resetAllDeviceStatus = async () => {
  try {
    console.log('🔄 Resetting all devices to offline on startup...');
    await prisma.device.updateMany({ data: { isOnline: false } });
    deviceCache.clear();
  } catch (err) {
    console.error('Failed to reset device status:', err.message);
  }
};

// ─────────────────────────────────────────────
// โหลด sensor mapping
// ─────────────────────────────────────────────
const loadDeviceSensors = async (deviceId) => {
  const mappings = await prisma.deviceSensor.findMany({
    where: { device: { deviceId } },
    include: { sensor: true },
  });
  const sensorSet = new Set(mappings.map(m => m.sensor.name));
  sensorCache.set(deviceId, sensorSet);
  return sensorSet;
};

// ─────────────────────────────────────────────
// Update device status
// ─────────────────────────────────────────────
const updateDeviceOnline = async (deviceId, isOnline, netMode = null) => {
  try {
    const cached = deviceCache.get(deviceId) || {};
    const now = Date.now();
    const statusChanged = cached.isOnline !== isOnline;

    deviceCache.set(deviceId, {
      ...cached,
      lastUpdate: now,
      isOnline,
      netMode: netMode || cached.netMode
    });

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
  } catch (err) {
    console.error(`DB update failed for ${deviceId}:`, err.message);
  }
};

// ─────────────────────────────────────────────
// Log
// ─────────────────────────────────────────────
const logToDevice = async (deviceId, level, message, eventCode = 'GENERIC', meta = null) => {
  try {
    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return;

    const newLog = await prisma.deviceLog.create({
      data: { deviceId: device.id, level, eventCode, message, meta },
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
  const syncCacheFromDB = async () => {
    const onlineDevices = await prisma.device.findMany({ where: { isOnline: true } });
    onlineDevices.forEach(d => {
      if (!deviceCache.has(d.deviceId)) {
        deviceCache.set(d.deviceId, { lastUpdate: Date.now(), isOnline: true });
      }
    });
  };

  syncCacheFromDB();

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
  }, 30000);
};

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
const handleMessages = async () => {
  await resetAllDeviceStatus();
  startHeartbeatMonitor();

  client.on('message', async (topic, message) => {
    const io = getIO();

    // ───────── Data ─────────
    if (topic.startsWith('device/') && topic.endsWith('/data')) {
      const deviceId = topic.split('/')[1];
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (err) { return; }

      const sensorsPayload = payload.sensors || {};
      const netMode        = payload.net_mode || 'N/A';

      // ── FIX 1: คำนวณ IS_REALTIME ก่อนใช้ ───────────────────────────────
      let hardwareTs = Number(payload.ts);
      if (hardwareTs < 1000000000000) hardwareTs = hardwareTs * 1000;

      if (!hardwareTs || hardwareTs < 1000000000000) {
        console.error("Invalid Timestamp received:", hardwareTs);
        return;
      }

      const now        = Date.now();
      const timeDiff   = Math.abs(now - hardwareTs);
      const IS_REALTIME = timeDiff < 30000;   // ← declare ก่อนใช้

      // ── FIX 2: อ่าน cached จาก deviceCache ก่อนใช้ ──────────────────────
      const cached = deviceCache.get(deviceId) || {};

      // ตรวจ network switch เฉพาะ realtime และมี netMode เดิม
      if (IS_REALTIME && cached.netMode && cached.netMode !== netMode) {
        await logToDevice(
          deviceId,
          'INFO',
          `Network switched from ${cached.netMode} to ${netMode}`,
          'NETWORK_SWITCH',
          { from: cached.netMode, to: netMode }
        );
      }

      // โหลด sensor mapping ถ้ายังไม่มี
      let sensors = sensorCache.get(deviceId);
      if (!sensors) sensors = await loadDeviceSensors(deviceId);

      // เขียน InfluxDB ทุก record (realtime + backlog)
      for (const [sensorName, value] of Object.entries(sensorsPayload)) {
        if (!sensors.has(sensorName)) continue;
        const numValue = parseFloat(value);
        if (isNaN(numValue)) continue;

        const point = new Point('sensor_reading')
          .tag('device_id', deviceId)
          .tag('sensor', sensorName)
          .floatField('value', numValue)
          .timestamp(new Date(hardwareTs));

        writeApi.writePoint(point);
      }

      if (IS_REALTIME) {
        const deviceUpdate = {
          deviceId,
          sensors: sensorsPayload,
          net_mode: netMode,
          ts: hardwareTs,
          isOnline: true,
          lastUpdate: new Date()
        };

        io.emit('device:update:all', deviceUpdate);
        io.emit(`device:update:${deviceId}`, deviceUpdate);

        checkSensorAlerts(deviceId, sensorsPayload).catch(err => console.error(err));
        await updateDeviceOnline(deviceId, true, netMode);
      }
      // backlog → InfluxDB เท่านั้น (ไม่ emit socket, ไม่ update online status)
    }

    // ───────── Online / Offline Status ─────────
    else if (topic.startsWith('device/') && topic.endsWith('/status')) {
      const deviceId = topic.split('/')[1];
      const isOnline = message.toString() === 'online';

      const statusUpdate = { deviceId, isOnline, timestamp: new Date() };
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