const prisma = require('../../config/db');
const { queryApi } = require('../../config/influx');

/**
 * ดึงข้อมูลย้อนหลัง 7 วัน และเฉลี่ยข้อมูลทุก 15 นาที (Downsampling)
 */
const getDeviceSensorHistoryof7days = async (deviceId) => {
  // 1. ตรวจสอบว่ามี Device นี้ในระบบ MySQL หรือไม่
  const deviceExists = await prisma.device.findUnique({
    where: { deviceId: deviceId }
  });

  if (!deviceExists) {
    throw new Error('Device not found in system');
  }

  // 2. ดึงรายชื่อ Sensors ที่ผูกกับ Device นี้
  const sensors = await prisma.deviceSensor.findMany({
    where: { 
      device: { deviceId: deviceId } 
    }, 
    include: { sensor: true },
  });

  const results = {};
  const start = '-7d';
  const interval = '30m'; // บังคับเฉลี่ยทุก 30 นาทีตามโจทย์

  for (const s of sensors) {
    const sensorName = s.sensor.name;
    
    // InfluxDB Flux Query
    const query = `
      from(bucket:"${process.env.INFLUX_BUCKET}")
        |> range(start: ${start})
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r.device_id == "${deviceId}")
        |> filter(fn: (r) => r.sensor == "${sensorName}")
        |> aggregateWindow(every: ${interval}, fn: mean, createEmpty: false)
        |> yield(name: "mean")
    `;

    const data = [];
    try {
      for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
        const o = tableMeta.toObject(values);
        if (o._value !== null && o._value !== undefined) {
          data.push({ 
            time: o._time, 
            value: Number(o._value.toFixed(2)) // ปัดเศษ 2 ตำแหน่งเพื่อความสวยงาม
          });
        }
      }
      results[sensorName] = data;
    } catch (err) {
      console.error(`Influx 7-day History error [${sensorName}]:`, err.message);
      results[sensorName] = [];
    }
  }

  return results;
};

module.exports = {
  getDeviceSensorHistoryof7days
};