const mqtt = require('mqtt');
require('dotenv').config();

const client = mqtt.connect(process.env.MQTT_BROKER, {
  clientId: process.env.MQTT_CLIENT_ID,
  clean: true,
  reconnectPeriod: 5000,
});

client.on('connect', () => {
  console.log('🛰️ MQTT: Connected to EMQX');
  // Subscribe topics พื้นฐาน
  client.subscribe(['weather/+/data', 'device/+/status'], (err) => {
    if (!err) console.log('📥 Subscribed to Weather & Status topics');
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT Connection Error:', err);
});

module.exports = client;