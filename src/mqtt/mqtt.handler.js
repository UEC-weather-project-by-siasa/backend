const client = require('./mqtt.client');
const { writeApi, Point } = require('../config/influx');
const { getIO } = require('../socket/socket');
const prisma = require('../config/db');

// ─────────────────────────────────────────────
// Cache sensor mapping (ลด DB query)
// deviceId → Set(sensorName)
// ─────────────────────────────────────────────
const sensorCache = new Map();
const deviceCache = new Map();

// โหลด sensor mapping จาก DB
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

    if (!cached || now - cached.lastUpdate > 30000 || cached.isOnline !== isOnline) {
      await prisma.device.updateMany({
        where: { deviceId },
        data: { isOnline, lastSeen: new Date() },
      });

      deviceCache.set(deviceId, { lastUpdate: now, isOnline });
    }
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
// MAIN HANDLER
// ─────────────────────────────────────────────
const handleMessages = () => {
  client.on('message', async (topic, message) => {
    const io = getIO();

    // ───────── sensor/{deviceId}/{sensorName} ─────────
    if (topic.startsWith('sensor/')) {
      const parts = topic.split('/');
      if (parts.length !== 3) return;

      const [, deviceId, sensorName] = parts;

      let value;

      try {
        value = parseFloat(message.toString());
      } catch {
        console.warn(`⚠️ Invalid value on topic: ${topic}`);
        return;
      }

      // โหลด sensor จาก cache / DB
      let sensors = sensorCache.get(deviceId);
      if (!sensors) {
        sensors = await loadDeviceSensors(deviceId);
      }

      // ❌ sensor ไม่ได้ register ใน DB → ignore
      if (!sensors.has(sensorName)) {
        console.warn(`⚠️ Unknown sensor "${sensorName}" for device ${deviceId}`);
        return;
      }

      // ───────── InfluxDB ─────────
      const point = new Point('sensor_reading')
        .tag('device_id', deviceId)
        .tag('sensor', sensorName)
        .floatField('value', value);

      writeApi.writePoint(point);

      // ───────── Update status ─────────
      await updateDeviceOnline(deviceId, true);

      // ───────── realtime ─────────
      io.emit(`sensor:${deviceId}`, { sensor: sensorName, value });
      io.emit('sensor:all', { deviceId, sensor: sensorName, value });

      console.log(`📊 [${deviceId}] ${sensorName} = ${value}`);
    }

    // ───────── device/{deviceId}/data ─────────
    else if (topic.startsWith('device/') && topic.endsWith('/data')) {
      const deviceId = topic.split('/')[1];

      let payload;

      try {
        payload = JSON.parse(message.toString());
      } catch (err) {
        console.warn(`⚠️ Invalid JSON from ${deviceId}`);
        return;
      }

      const sensorsPayload = payload.sensors || {};

      // โหลด sensor mappin
      let sensors = sensorCache.get(deviceId);
      if (!sensors) {
        sensors = await loadDeviceSensors(deviceId);
      }

      // loop sensors
      for (const [sensorName, value] of Object.entries(sensorsPayload)) {

        if (!sensors.has(sensorName)) {
          console.warn(`Unknown sensor "${sensorName}" for device ${deviceId}`);
          continue;
        }

        const point = new Point('sensor_reading')
          .tag('device_id', deviceId)
          .tag('sensor', sensorName)
          .floatField('value', parseFloat(value));

        writeApi.writePoint(point);

        io.emit(`sensor:${deviceId}`, {
          sensor: sensorName,
          value,
        });

        io.emit('sensor:all', {
          deviceId,
          sensor: sensorName,
          value,
        });

        console.log(`[${deviceId}] ${sensorName} = ${value}`);
      }

      await updateDeviceOnline(deviceId, true);
    }
  });
};

module.exports = { handleMessages };