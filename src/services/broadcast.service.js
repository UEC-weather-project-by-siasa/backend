const prisma = require('../config/db');
const { sendBroadcastEmail } = require('./email.service');
const { createNotification } = require('./notification.service');

const sendSystemBroadcast = async (adminId, { subject, message, sendEmail = true }) => {
  // 1. ดึง User ทุกคนในระบบ (รวมถึง Setting ของเขา)
  const users = await prisma.user.findMany({
    include: { setting: true }
  });

  if (users.length === 0) return 0;

  // 2. ส่ง Notification บนเว็บ (ยิงหาทุกคนที่เปิด enableSystemNoti)
  for (const u of users) {
    if (u.setting?.enableSystemNoti !== false) {
      await createNotification(u.id, {
        title: `📢 ${subject}`,
        message: message,
        type: 'SYSTEM'
      });
    }
  }

  // 3. ส่ง Email (ถ้าเลือกให้ส่ง และ User เปิดรับเมล์)
  if (sendEmail) {
    const recipientEmails = users
      .filter(u => u.email && (u.setting?.enableEmailAlert !== false))
      .map(u => u.email);

    if (recipientEmails.length > 0) {
      await sendBroadcastEmail(recipientEmails, subject, message);
    }
  }

  return users.length;
};

module.exports = { sendSystemBroadcast };