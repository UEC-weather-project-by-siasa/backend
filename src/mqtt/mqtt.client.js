const mqtt = require('mqtt');
require('dotenv').config();

// Backend เองก็ต้องมี credentials เพื่อ connect EMQX
// สร้าง device ชื่อ "backend_server" ใน DB ไว้ก่อน
// หรือใช้ EMQX superuser ก็ได้
const client = mqtt.connect(process.env.MQTT_BROKER, {
  clientId: 'backend_server',
  username: 'test_iot',
  password: 'abc123secret',
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 10000,
});

client.on('connect', () => {
  console.log('🛰️ MQTT: Connected to EMQX');
  client.subscribe(['device/+/data', 'device/+/status'], (err) => {
    if (!err) console.log('📥 Subscribed to Weather & Status topics');
  });
});



client.on('error', (err) => {
  console.error('❌ MQTT Connection Error:', err);
});

module.exports = client;