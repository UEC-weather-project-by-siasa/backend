const prisma = require('../config/db');
const { getIO } = require('../socket/socket');
const { sendPushNotification } = require('./push.service');

const createNotification = async (userId, data) => {
  // save to db
  const noti = await prisma.notification.create({
    data: { userId, ...data }
  });

  //sent socket
  const io = getIO();
  io.to(`user:${userId}`).emit('notification:new', noti);

  // Push Notification 
  const mobileDevices = await prisma.userMobileDevice.findMany({
    where: { userId: userId }
  });

  console.log(mobileDevices);

  mobileDevices.forEach(device => {
    sendPushNotification(
      device.pushToken, 
      data.title, 
      data.message, 
      { notiId: noti.id }
    );
  });


  return noti;
};

const getMyNotifications = async (userId, query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const where = { userId: parseInt(userId) };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }, // เรียงล่าสุดมาก่อน
    }),
    prisma.notification.count({ where })
  ]);

  return {
    data: notifications,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
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