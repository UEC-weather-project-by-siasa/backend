const express = require('express');
const router = express.Router();
const mqttAuthController = require('../modules/mqtt/mqtt.auth.controller');

router.post('/auth', mqttAuthController.authenticate);

module.exports = router;
