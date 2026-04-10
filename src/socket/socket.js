// src/socket/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken'); // ต้องใช้เพื่อแกะ userId จาก token

let io;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  io.on('connection', (socket) => {
    const token = socket.handshake.auth.token;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret');
        const userId = decoded.userId;

        socket.join(`user:${userId}`);
        console.log(`User ${userId} joined room: user:${userId}`);

        if (decoded.role === 'ADMIN') {
          socket.join('admin:room');
        }
      } catch (err) {
        console.log("Socket connection unauthorized");
      }
    }

    console.log(`Socket Connected: ${socket.id}`);
    socket.on('disconnect', () => console.log('Socket Disconnected'));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

module.exports = { init, getIO };