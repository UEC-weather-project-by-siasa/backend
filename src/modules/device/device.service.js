const prisma = require('../../config/db');
const { randomUUID } = require('crypto');
const { queryApi } = require('../../config/influx');

// ─── Helper: คำนวณความห่างของเวลาเพื่อกำหนด Interval ของการยุบรวมข้อมูล (Downsampling) ───
const calculateAggregateInterval = (start, end) => {
  let interval = '1m'; // Default
  try {
    let startTime;
    let endTime = end === 'now()' ? Date.now() : new Date(end).getTime();

    // กรณี start เป็นค่า Relative ของ Influx เช่น "-1d", "-7d", "-1mo", "-1y"
    if (typeof start === 'string' && start.startsWith('-')) {
      // เพิ่มรองรับ mo (เดือน) และ y (ปี)
      const match = start.match(/-(\d+)(mo|[ywdhms])/);
      if (match) {
        const val = parseInt(match[1], 10);
        const unit = match[2];
        const now = Date.now();
        if (unit === 's') startTime = now - val * 1000;
        if (unit === 'm') startTime = now - val * 60 * 1000;
        if (unit === 'h') startTime = now - val * 60 * 60 * 1000;
        if (unit === 'd') startTime = now - val * 24 * 60 * 60 * 1000;
        if (unit === 'w') startTime = now - val * 7 * 24 * 60 * 60 * 1000;
        if (unit === 'mo') startTime = now - val * 30 * 24 * 60 * 60 * 1000; // ประเมิน 30 วัน
        if (unit === 'y') startTime = now - val * 365 * 24 * 60 * 60 * 1000;
      }
    } else {
      // กรณี start เป็น ISO Date String
      startTime = new Date(start).getTime();
    }

    if (startTime && endTime && !isNaN(startTime) && !isNaN(endTime)) {
      const timeDiffHours = (endTime - startTime) / (1000 * 60 * 60);

      // --- เงื่อนไขใหม่ ---
      if (timeDiffHours > 24 * 365 * 2) {    // ดูย้อนหลังเกิน 2 ปี
        interval = '1w';                     // เฉลี่ยรายสัปดาห์
      } else if (timeDiffHours > 24 * 180) { // ดูย้อนหลังเกิน 6 เดือน (ถึง 2 ปี)
        interval = '1d';                     // เฉลี่ยรายวัน
      } else if (timeDiffHours > 24 * 30) {  // ดูย้อนหลังเกิน 1 เดือน
        interval = '6h';                     // เฉลี่ยทุก 6 ชม.
      } else if (timeDiffHours > 24 * 7) {   // ดูย้อนหลังเกิน 1 สัปดาห์
        interval = '1h';                     // เฉลี่ยทุก 1 ชม.
      } else if (timeDiffHours > 24 * 3) {   // ดูย้อนหลังเกิน 3 วัน
        interval = '30m';                    // เฉลี่ยทุก 30 นาที
      } else if (timeDiffHours > 24) {       // ดูย้อนหลังเกิน 1 วัน
        interval = '15m';                    // เฉลี่ยทุก 15 นาที
      } else if (timeDiffHours > 6) {        // ดูย้อนหลังเกิน 6 ชั่วโมง
        interval = '5m';                     // เฉลี่ยทุก 5 นาที
      } else if (timeDiffHours > 1) {        // ดูย้อนหลัง 1-6 ชั่วโมง
        interval = '1m';                     // เฉลี่ยทุก 1 นาที
      } else {
        // ต่ำกว่า 1 ชั่วโมง (รวม 5 นาที 15 นาที) 
        // 5 วินาทีคือความถี่ของข้อมูลจริง ส่งค่า 5s ไปเลย จะได้ Raw data เกือบ 100%
        interval = '5s';                     
      }
    }
  } catch (err) {
    console.error("Error calculating interval:", err.message);
  }
  return interval;
};

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
const getDeviceSensorHistory = async (deviceId, { start='-1h', end='now()' } = {}) => {

  const deviceExists = await prisma.device.findUnique({
    where: { deviceId: deviceId }
  });

  if (!deviceExists) {
    throw new Error('Device not found in system');
  }

  const sensors = await prisma.deviceSensor.findMany({
    where: { 
      device: { deviceId: deviceId } 
    }, 
    include: { sensor: true },
  });

  const results = {};
  const aggregateInterval = calculateAggregateInterval(start, end);

  for (const s of sensors) {
    const sensorName = s.sensor.name;
    
    // Query สำหรับกราฟ: ใช้ aggregateWindow หาค่าเฉลี่ยตามเวลา (เรียงจากเก่าไปใหม่ตามธรรมชาติของ Influx)
    const query = `
      from(bucket:"${process.env.INFLUX_BUCKET}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> filter(fn: (r) => r.sensor == "${sensorName}")
        |> aggregateWindow(every: ${aggregateInterval}, fn: mean, createEmpty: false)
        |> yield(name: "mean")
    `;

    const data = [];
    try {
      for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
        const o = tableMeta.toObject(values);
        if (o._value !== null && o._value !== undefined) {
          data.push({ time: o._time, value: o._value });
        }
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
const getSensorHistory = async (deviceId, sensorName, { start='-1h', end='now()', format='json' } = {}) => {

  const deviceExists = await prisma.device.findUnique({
    where: { deviceId: deviceId }
  });

  if (!deviceExists) {
    throw new Error('Device not found in system');
  }
  
  let query = "";

  if (format === 'csv') {
    // 📌 กรณี Export CSV: ดึง Raw Data ไม่เฉลี่ย (เรียงจากใหม่ไปเก่า) และป้องกันเซิร์ฟล่มโดย Limit ไว้ที่ 50000 record
    query = `
      from(bucket:"${process.env.INFLUX_BUCKET}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> filter(fn: (r) => r.sensor == "${sensorName}")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 50000) 
    `;
  } else {
    // 📌 กรณี JSON กราฟ: ใช้ aggregateWindow ยุบรวมข้อมูล (เรียงจากเก่าไปใหม่)
    const aggregateInterval = calculateAggregateInterval(start, end);
    query = `
      from(bucket:"${process.env.INFLUX_BUCKET}")
        |> range(start: ${start}, stop: ${end})
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> filter(fn: (r) => r.sensor == "${sensorName}")
        |> aggregateWindow(every: ${aggregateInterval}, fn: mean, createEmpty: false)
        |> yield(name: "mean")
    `;
  }

  const data = [];
  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
      const o = tableMeta.toObject(values);
      if (o._value !== null && o._value !== undefined) {
        data.push({ time: o._time, value: o._value });
      }
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