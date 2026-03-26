const { Server } = require('socket.io');

let io;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*" } // ปรับแต่งตาม production จริง
  });

  io.on('connection', (socket) => {
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