const alertLogService = require('../../services/alertLog.service');

exports.getLogs = async (req, res) => {
  try {
    // ดึงค่า page, limit, deviceId จาก query string
    const result = await alertLogService.getAlertLogs(req.query, req.user);
    res.json({ 
      status: 'success', 
      data: result.data,
      meta: result.meta // { total, page, limit, totalPages }
    });
  } catch (err) { 
    res.status(500).json({ status: 'fail', message: err.message }); 
  }
};

exports.clearMyLogs = async (req, res) => {
  try {
    // ลบเฉพาะ Log ที่ตัวเองมีสิทธิ์ (User ลบเฉพาะ USER rules, Admin ลบได้หมด)
    const count = await alertLogService.clearUserAlertLogs(req.query, req.user);
    res.json({ status: 'success', message: `Successfully cleared ${count} alert logs.` });
  } catch (err) { 
    res.status(500).json({ status: 'fail', message: err.message }); 
  }
};

exports.adminClearAllLogs = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    const count = await alertLogService.clearAllLogsAdmin();
    res.json({ status: 'success', message: `Admin cleared ${count} logs` });
  } catch (err) { res.status(500).json({ status: 'fail', message: err.message }); }
};