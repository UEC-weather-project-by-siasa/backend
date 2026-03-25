const systemService = require('./system.service');

exports.getStatus = (req, res) => {
  try {
    const status = systemService.getServerStatus();
    res.json({
      status: 'success',
      data: status
    });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};