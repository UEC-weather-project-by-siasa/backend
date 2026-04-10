const prisma = require('../config/db');
const { getIO } = require('../socket/socket');

const createNotification = async (userId, data) => {
  const noti = await prisma.notification.create({
    data: { userId, ...data }
  });

  // ยิง Socket แจ้งเตือนรายคน
  const io = getIO();
  io.to(`user:${userId}`).emit('notification:new', noti);
  
  return noti;
};

const getMyNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
};

const clearMyNotifications = async (userId) => {
  return await prisma.notification.deleteMany({ where: { userId } });
};

const markAsRead = async (id, userId) => {
  return await prisma.notification.updateMany({
    where: { id: parseInt(id), userId },
    data: { isRead: true }
  });
};

module.exports = { createNotification, getMyNotifications, clearMyNotifications, markAsRead };