const client = require('./mqtt.client');
const { writeApi, Point } = require('../config/influx');
const { getIO } = require('../socket/socket');

const handleMessages = () => {
  client.on('message', async (topic, message) => {
    const payload = JSON.parse(message.toString());
    const io = getIO();

    // กรณีข้อมูลสภาพอากาศ: weather/device_01/data
    if (topic.startsWith('weather/')) {
      const deviceId = topic.split('/')[1];

      // 1. บันทึกลง InfluxDB
      // ใน src/mqtt/mqtt.handler.js
    const point = new Point('weather_reading')
    .tag('device_id', deviceId)
    .tag('net_mode', payload.net_mode) // เก็บโหมดเน็ตไว้ดูด้วย
    .floatField('temp', payload.temperature) // แก้ให้ตรงกับ ESP32
    .floatField('hum', payload.humidity)
    .floatField('press', payload.pressure)
    .floatField('wind_speed', payload.wind_speed)
    .floatField('wind_dir', payload.wind_direction);
      
      writeApi.writePoint(point);
      // แนะนำให้ flush ตามระยะเวลา หรือจำนวน point ใน production

      // 2. ส่ง Real-time ไป Frontend ผ่าน Socket.io
      io.emit(`weather_update_${deviceId}`, payload);
      console.log(`📊 Data from ${deviceId} processed & broadcasted`);
    }
  });
};

module.exports = { handleMessages };