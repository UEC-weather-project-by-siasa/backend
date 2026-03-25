const client = require('./mqtt.client');
const { writeApi, Point } = require('../config/influx'); // ← import InfluxDB
const { getIO } = require('../socket/socket');
const prisma = require('../config/db');

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

    // update cache
    deviceCache.set(deviceId, {
      lastUpdate: now,
      isOnline
    });

    // update DB
    await prisma.device.updateMany({
      where: { deviceId },
      data: {
        isOnline,
        lastSeen: new Date()
      }
    });

    console.log(`${isOnline ? '🟢' : '🔴'} Device ${deviceId} → ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

  } catch (err) {
    console.error(`❌ DB update failed for ${deviceId}:`, err.message);
  }
};

// ─────────────────────────────────────────────
// Log
// ─────────────────────────────────────────────
const logToDevice = async (deviceId, level, message, meta = null) => {
  try {
    const device = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) return;

    await prisma.deviceLog.create({
      data: {
        deviceId: device.id,
        level,
        message,
        meta,
      },
    });
  } catch (err) {
    console.error(`❌ DeviceLog write failed:`, err.message);
  }
};

// ─────────────────────────────────────────────
// HEARTBEAT MONITOR
// ─────────────────────────────────────────────
const startHeartbeatMonitor = () => {
  setInterval(async () => {
    const now = Date.now();

    for (const [deviceId, cached] of deviceCache.entries()) {

      // 60 วิ ไม่ส่งข้อมูล = offline
      if (now - cached.lastUpdate > 60000 && cached.isOnline) {

        await updateDeviceOnline(deviceId, false);

        await logToDevice(
          deviceId,
          'WARN',
          'Device timeout (no data)'
        );

        const io = getIO();

        io.emit(`device:status:${deviceId}`, {
          deviceId,
          isOnline: false
        });

        io.emit('device:status:all', {
          deviceId,
          isOnline: false
        });

        console.log(`⚠️ Device timeout: ${deviceId}`);
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

    // ───────── device/{deviceId}/data ─────────
    if (topic.startsWith('device/') && topic.endsWith('/data')) {
      const deviceId = topic.split('/')[1];

      let payload;

      try {
        payload = JSON.parse(message.toString());
      } catch (err) {
        console.warn(`⚠️ Invalid JSON from ${deviceId}`);
        return;
      }

      const sensorsPayload = payload.sensors || {};

      let sensors = sensorCache.get(deviceId);
      if (!sensors) {
        sensors = await loadDeviceSensors(deviceId);
      }

      for (const [sensorName, value] of Object.entries(sensorsPayload)) {

        if (!sensors.has(sensorName)) {
          console.warn(`Unknown sensor "${sensorName}" for device ${deviceId}`);
          continue;
        }

        // ───── เพิ่ม InfluxDB Write ─────
        const point = new Point('sensor_reading')
          .tag('device_id', deviceId)
          .tag('sensor', sensorName)
          .floatField('value', parseFloat(value))
          .timestamp(new Date());

        writeApi.writePoint(point);  // เขียนเข้า InfluxDB

        // ───── ส่ง realtime ไป WebSocket ─────
        io.emit(`sensor:${deviceId}`, {
          sensor: sensorName,
          value,
        });

        io.emit('sensor:all', {
          deviceId,
          sensor: sensorName,
          value,
        });

        console.log(`📊 [${deviceId}] ${sensorName} = ${value}`);
      }

      // update online
      await updateDeviceOnline(deviceId, true);
    }


    // ───────── device/{deviceId}/status ─────────
    else if (topic.startsWith('device/') && topic.endsWith('/status')) {

      const deviceId = topic.split('/')[1];
      const status = message.toString();

      const isOnline = status === 'online';

      await updateDeviceOnline(deviceId, isOnline);

      await logToDevice(
        deviceId,
        isOnline ? 'INFO' : 'WARN',
        `Device ${isOnline ? 'online' : 'offline'}`
      );

      io.emit(`device:status:${deviceId}`, {
        deviceId,
        isOnline
      });

      io.emit('device:status:all', {
        deviceId,
        isOnline
      });
    }

  });
};

module.exports = { handleMessages };
