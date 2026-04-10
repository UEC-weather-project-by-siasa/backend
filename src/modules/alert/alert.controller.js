const alertService = require('../../services/alert.service');

exports.createAlert = async (req, res) => {
  try {
    const rule = await alertService.createAlertRule(req.user, req.body);
    res.status(201).json({ status: 'success', data: rule });
  } catch (err) { res.status(400).json({ status: 'fail', message: err.message }); }
};

exports.getAlerts = async (req, res) => {
  try {
    const rules = await alertService.getUserAlerts(req.user);
    res.json({ status: 'success', data: rules });
  } catch (err) { res.status(500).json({ status: 'fail', message: err.message }); }
};

exports.updateAlert = async (req, res) => {
  try {
    const rule = await alertService.updateAlertRule(req.params.id, req.user, req.body);
    res.json({ status: 'success', data: rule });
  } catch (err) { res.status(400).json({ status: 'fail', message: err.message }); }
};

exports.deleteAlert = async (req, res) => {
  try {
    await alertService.deleteAlertRule(req.params.id, req.user);
    res.json({ status: 'success', message: 'Deleted' });
  } catch (err) { res.status(400).json({ status: 'fail', message: err.message }); }
};