const prisma = require('../../config/db');

exports.authenticate = async (req, res) => {
  try {
    const username = req.body.username || req.body.clientid;
    const password = req.body.password;

    console.log(`🔐 MQTT Auth: username=${username} clientid=${req.body.clientid}`);

    if (!username || !password) {
      return res.json({ result: 'deny' });
    }

    // ✅ allow backend
    if (req.body.clientid === 'backend_server') {
      return res.json({ result: 'allow' });
    }

    // ✅ check device จาก DB
    const device = await prisma.device.findUnique({
      where: { deviceId: username },
    });

    if (!device) {
      console.log(`Device not found: ${username}`);
      return res.json({ result: 'deny' });
    }

    if (device.deviceKey !== password) {
      console.log(`Wrong key: ${username}`);
      return res.json({ result: 'deny' });
    }

    console.log(`Device allowed: ${username}`);
    return res.json({ result: 'allow' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ result: 'deny' });
  }
};