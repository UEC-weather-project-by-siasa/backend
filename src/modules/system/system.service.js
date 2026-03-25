const os = require('os');

const getServerStatus = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  // ดึง IP Address ทั้งหมดของเครื่อง
  for (const iface of Object.values(interfaces)) {
    iface.forEach((i) => {
      if (i.family === 'IPv4' && !i.internal) {
        addresses.push(i.address);
      }
    });
  }

  return {
    status: 'online',
    uptime: os.uptime(), // วินาทีที่เครื่องรันมา
    platform: os.platform(),
    architecture: os.arch(),
    cpuCount: os.cpus().length,
    totalMemory: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
    freeMemory: (os.freemem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
    serverIp: addresses[0] || '127.0.0.1', // เอา IP แรกที่เจอ
    nodeVersion: process.version,
    currentTime: new Date()
  };
};

module.exports = { getServerStatus };