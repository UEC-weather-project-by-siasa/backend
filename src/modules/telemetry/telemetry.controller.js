const telemetryService = require('./telemetry.service');

exports.getLogs = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { level, eventCode, limit, page, isRead } = req.query;
    
    const result = await telemetryService.getDeviceLogs(deviceId, {
      level,
      eventCode,
      limit: parseInt(limit) || 50,
      page: parseInt(page) || 1,
      isRead
    });

    res.json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.markLogRead = async (req, res) => {
  try {
    const log = await telemetryService.markAsRead(req.params.id);
    res.json({ status: 'success', data: log });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const summary = await telemetryService.getTelemetrySummary();
    res.json({ status: 'success', data: summary });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};