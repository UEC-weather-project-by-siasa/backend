const http = require('http');
const app = require('./app');
const socketConfig = require('./socket/socket');
const mqttHandler = require('./mqtt/mqtt.handler');
require('dotenv').config();

const server = http.createServer(app);

// 1. Init Socket.io
socketConfig.init(server);

// 2. Start MQTT Logic
mqttHandler.handleMessages();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Docs available at http://localhost:${PORT}/api-docs`);
});