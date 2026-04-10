const notificationService = require('../../services/notification.service');

exports.getMyNotifications = async (req, res) => {
  try {
    const result = await notificationService.getMyNotifications(req.user.id, req.query);
    
    res.json({ 
      status: 'success', 
      data: result.data,
      meta: result.meta 
    });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ status: 'success', message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.clearMyNotifications = async (req, res) => {
  try {
    const count = await notificationService.clearMyNotifications(req.user.id);
    res.json({ status: 'success', message: `Cleared ${count.count} notifications` });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};