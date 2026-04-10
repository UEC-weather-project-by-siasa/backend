const adminService = require('./admin.service');
const broadcastService = require('../../services/broadcast.service');

exports.broadcastMessage = async (req, res) => {
  try {
    const { subject, message, sendEmail } = req.body;
    if (!subject || !message) throw new Error("Subject and message are required");

    const count = await broadcastService.sendSystemBroadcast(req.user.id, {
      subject,
      message,
      sendEmail
    });

    res.json({ 
      status: 'success', 
      message: `Broadcast sent successfully to ${count} users.` 
    });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await adminService.getAllUsers();
    res.json({ status: 'success', data: users });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const result = await adminService.deleteUser(
      parseInt(req.params.id),
      req.user.id
    );
    res.json({ status: 'success', ...result });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await adminService.getUserById(
      parseInt(req.params.id)
    );

    res.json({ status: 'success', data: user });
  } catch (error) {
    res.status(404).json({ status: 'fail', message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const result = await adminService.updateUserRole(
      parseInt(req.params.id),
      req.body.role,
      req.user.id
    );

    res.json({ status: 'success', data: result });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const result = await adminService.updateUser(
      parseInt(req.params.id),
      req.body
    );

    res.json({ status: 'success', data: result });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

exports.forceLogout = async (req, res) => {
  try {
    const result = await adminService.forceLogout(
      parseInt(req.params.id)
    );

    res.json({ status: 'success', data: result });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};