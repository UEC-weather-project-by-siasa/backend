const deviceService = require('./data.service');

exports.getDeviceSensorHistoryof7days = async (req, res) => {
  const { deviceId } = req.params;
  try {
    const data = await deviceService.getDeviceSensorHistoryof7days(deviceId);
    
    res.json({ 
      status: 'success', 
      message: '7-day historical data with 30-minute interval',
      data 
    });
  } catch (err) {
    const statusCode = err.message === 'Device not found in system' ? 404 : 500;
    res.status(statusCode).json({ 
      status: 'fail', 
      message: err.message 
    });
  }
};