const prisma = require('../../config/db');
const { randomUUID } = require('crypto');
const { queryApi } = require('../../config/influx');

const generateUniqueDeviceId = async () => {
  let id;
  let exists = true;
  while (exists) {
    id = randomUUID().slice(0, 8); // สั้น 8 ตัว
    const device = await prisma.device.findUnique({ where: { deviceId: id } });
    if (!device) exists = false;
  }
  return id;
};

const generateDeviceKey = () => {
  return Math.random().toString(36).slice(-8); // random 8 ตัวอักษร a-z0-9
};

const createDevice = async (data) => {
  const deviceId = await generateUniqueDeviceId();
  const deviceKey = generateDeviceKey();

  return await prisma.device.create({
    data: {
      ...data,     // name, model, firmware, ownerId
      deviceId,
      deviceKey,
    },
  });
};

const updateDevice = async (id, data) => {
  return await prisma.device.update({
    where: { id: parseInt(id) },
    data,
  });
};

const deleteDevice = async (id) => {
  return await prisma.device.delete({
    where: { id: parseInt(id) },
  });
};

const getAllDevices = async () => {
  return await prisma.device.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      sensors: { include: { sensor: true } },
    },
  });
};

const getDeviceById = async (id) => {
  return await prisma.device.findUnique({
    where: { id: parseInt(id) },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      sensors: { include: { sensor: true } },
    },
  });
};

// ───────── Sensor Management ─────────
const getSensorById = async (id) => {
  return await prisma.sensor.findUnique({
    where: { id: parseInt(id) },
    include: {
      devices: { include: { device: true } }, 
    },
  });
};

const createSensor = async (data) => {
  return await prisma.sensor.create({ data });
};

const updateSensor = async (id, data) => {
  return await prisma.sensor.update({
    where: { id: parseInt(id) },
    data,
  });
};

const deleteSensor = async (id) => {
  return await prisma.sensor.delete({
    where: { id: parseInt(id) },
  });
};

const getAllSensors = async () => {
  return await prisma.sensor.findMany({
    include: {
      devices: { include: { device: true } },
    },
  });
};

// ───────── DeviceSensor ─────────
const createDeviceSensor = async ({ deviceId, sensorId, alias }) => {
  return await prisma.deviceSensor.create({
    data: {
      deviceId,
      sensorId,
      alias,
    },
  });
};

const updateDeviceSensor = async (id, data) => {
  return await prisma.deviceSensor.update({
    where: { id: parseInt(id) },
    data,
  });
};

const deleteDeviceSensor = async (id) => {
  return await prisma.deviceSensor.delete({
    where: { id: parseInt(id) },
  });
};

const getDeviceSensors = async (deviceId) => {
  return await prisma.deviceSensor.findMany({
    where: { deviceId: parseInt(deviceId) },
    include: { sensor: true },
  });
};

// ───────── SensorHistory ─────────

// ─── 1. ดึงค่าล่าสุดของทุก sensor (ใช้ deviceId เช่น "test_iot") ───
const getDeviceSensorsLast = async (deviceId) => {
  const deviceExists = await prisma.device.findUnique({
    where: { deviceId: deviceId }
  });

  if (!deviceExists) {
    throw new Error('Device not found in system'); // ให้ Controller พ่น 404
  }

  // หา sensors ที่ผูกกับ device นี้จาก MySQL/Postgres ก่อน
  const sensors = await prisma.deviceSensor.findMany({
    where: { 
      device: { deviceId: deviceId } 
    },
    include: { sensor: true },
  });

  const results = {};

  for (const s of sensors) {
    const sensorName = s.sensor.name;
    const query = `
      from(bucket:"${process.env.INFLUX_BUCKET}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r["device_id"] == "${deviceId}")
        |> filter(fn: (r) => r["sensor"] == "${sensorName}")
        |> last()
    `;

    try {
      let lastPoint = null;
      // ใช้ tableMeta.toObject เพื่อความปลอดภัยและลด Error row.reduce
      for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
        const o = tableMeta.toObject(values);
        lastPoint = { time: o._time, value: o._value };
      }
      results[sensorName] = lastPoint;
    } catch (err) {
      console.error(`Influx error [${sensorName}]:`, err.message);
      results[sensorName] = null;
    }
  }

  return results;
};

// ─── 2. ดึง history ของทุก sensor ───
const getDeviceSensorHistory = async (deviceId, { start='-1h', end='now()', limit=100, page=1 } = {}) => {

  const deviceExists = await prisma.device.findUnique({
    where: { deviceId: deviceId }
  });

  if (!deviceExists) {
    throw new Error('Device not found in system'); // ให้ Controller พ่น 404
  }

  const sensors = await prisma.deviceSensor.findMany({
    where: { 
      device: { deviceId: deviceId } 
    }, 
    include: { sensor: true },
  });

  const results = {};
  const offset = (page - 1) * limit;

  for (const s of sensors) {
    const sensorName = s.sensor.name;
    const query = `
      from(bucket:"${process.env.INFLUX_BUCKET}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> filter(fn: (r) => r.sensor == "${sensorName}")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: ${limit}, offset: ${offset})
    `;

    const data = [];
    try {
      for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
        const o = tableMeta.toObject(values);
        data.push({ time: o._time, value: o._value });
      }
      results[sensorName] = data;
    } catch (err) {
      console.error(`Influx History error [${sensorName}]:`, err.message);
      results[sensorName] = [];
    }
  }

  return results;
};

// ─── 3. ดึง history sensor เดียว ───
const getSensorHistory = async (deviceId, sensorName, { start='-1h', end='now()', limit=100, page=1, format='json' } = {}) => {

  const deviceExists = await prisma.device.findUnique({
    where: { deviceId: deviceId }
  });

  if (!deviceExists) {
    throw new Error('Device not found in system'); // ให้ Controller พ่น 404
  }
  
  const offset = (page - 1) * limit;

  const query = `
    from(bucket:"${process.env.INFLUX_BUCKET}")
      |> range(start: ${start}, stop: ${end})
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.device_id == "${deviceId}")
      |> filter(fn: (r) => r.sensor == "${sensorName}")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: ${limit}, offset: ${offset})
  `;

  const data = [];
  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
      const o = tableMeta.toObject(values);
      data.push({ time: o._time, value: o._value });
    }
  } catch (err) {
    console.error(`Influx Single Sensor error:`, err.message);
  }

  return { data, format };
};





module.exports = {
  createDevice,
  updateDevice,
  deleteDevice,
  getAllDevices,
  getDeviceById,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
  getAllSensors,
  createDeviceSensor,
  updateDeviceSensor,
  deleteDeviceSensor,
  getDeviceSensors,
  getDeviceSensorsLast, 
  getDeviceSensorHistory, 
  getSensorHistory ,
};