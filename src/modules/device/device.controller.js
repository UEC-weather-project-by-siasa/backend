const deviceService = require('./device.service');

// ───────── Device Controllers ─────────
exports.getDevices = async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.json({ status: 'success', data: devices });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.getDevice = async (req, res) => {
  try {
    const device = await deviceService.getDeviceById(req.params.id);
    if (!device) return res.status(404).json({ status: 'fail', message: 'Device not found' });
    res.json({ status: 'success', data: device });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.createDevice = async (req, res) => {
  try {
    const device = await deviceService.createDevice(req.body);
    res.status(201).json({ status: 'success', data: device });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const device = await deviceService.updateDevice(req.params.id, req.body);
    res.json({ status: 'success', data: device });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    await deviceService.deleteDevice(req.params.id);
    res.json({ status: 'success', message: 'Device deleted' });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// ───────── Sensor Controllers ─────────
exports.getSensors = async (req, res) => {
  try {
    const sensors = await deviceService.getAllSensors();
    res.json({ status: 'success', data: sensors });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.getSensor = async (req, res) => {
  try {
    const sensor = await deviceService.getSensorById(req.params.id);
    if (!sensor) {
      return res.status(404).json({ status: 'fail', message: 'Sensor not found' });
    }
    res.json({ status: 'success', data: sensor });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.createSensor = async (req, res) => {
  try {
    const sensor = await deviceService.createSensor(req.body);
    res.status(201).json({ status: 'success', data: sensor });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updateSensor = async (req, res) => {
  try {
    const sensor = await deviceService.updateSensor(req.params.id, req.body);
    res.json({ status: 'success', data: sensor });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteSensor = async (req, res) => {
  try {
    await deviceService.deleteSensor(req.params.id);
    res.json({ status: 'success', message: 'Sensor deleted' });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// ───────── DeviceSensor Controllers ─────────
exports.getDeviceSensors = async (req, res) => {
  try {
    const sensors = await deviceService.getDeviceSensors(req.params.deviceId);
    res.json({ status: 'success', data: sensors });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

exports.createDeviceSensor = async (req, res) => {
  try {
    const mapping = await deviceService.createDeviceSensor(req.body);
    res.status(201).json({ status: 'success', data: mapping });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updateDeviceSensor = async (req, res) => {
  try {
    const mapping = await deviceService.updateDeviceSensor(req.params.id, req.body);
    res.json({ status: 'success', data: mapping });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteDeviceSensor = async (req, res) => {
  try {
    await deviceService.deleteDeviceSensor(req.params.id);
    res.json({ status: 'success', message: 'DeviceSensor deleted' });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};


// ─── GET last values ───
exports.getDeviceSensorsLast = async (req, res) => {
  const { deviceId } = req.params; 
  try {
    const data = await deviceService.getDeviceSensorsLast(deviceId);
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

// ─── GET history ของทุก sensor ───
exports.getDeviceSensorHistory = async (req, res) => {
  const { deviceId } = req.params;
  const { start, end } = req.query; // ลบ limit, page ออก
  try {
    const data = await deviceService.getDeviceSensorHistory(deviceId, { start, end });
    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};
// ─── GET history ของ sensor เดียว ───
exports.getSensorHistory = async (req, res) => {
  const { deviceId, sensorName } = req.params;
  const { start, end, format } = req.query; // ลบ limit, page ออก
  try {
    const { data } = await deviceService.getSensorHistory(deviceId, sensorName, {
      start, end, format
    });

    if (format === 'csv') {
      let csv = 'time,value\n';
      data.forEach(d => { csv += `${d.time},${d.value}\n`; });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${deviceId}_${sensorName}_history.csv"`);
      return res.send(csv);
    }

    res.json({ status: 'success', data });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};