const { Expo } = require('expo-server-sdk');
let expo = new Expo();

const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!Expo.isExpoPushToken(pushToken)) return;

  const messages = [{
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  }];

  try {
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    console.error('Push Error:', error);
  }
};

module.exports = { sendPushNotification };