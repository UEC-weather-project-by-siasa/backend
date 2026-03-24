const adminService = require('./admin.service');

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