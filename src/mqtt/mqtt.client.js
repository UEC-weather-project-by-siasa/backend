const mqtt = require('mqtt');
require('dotenv').config();


const client = mqtt.connect(process.env.MQTT_BROKER, {
  clientId: 'backend_server',
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
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