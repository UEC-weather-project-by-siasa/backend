const express = require('express');
const router = express.Router();
const mqttAuthController = require('./mqtt.auth.controller');

/**
 * @swagger
 * tags:
 *   name: MQTT Auth
 *   description: MQTT Broker Authentication API
 */

/**
 * @swagger
 * /api/mqtt/auth:
 *   post:
 *     summary: Authenticate MQTT client
 *     tags: [MQTT Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "device_01"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "123456"
 *               clientid:
 *                 type: string
 *                 example: "backend_server"
 *     responses:
 *       200:
 *         description: MQTT client authenticated successfully
 *       401:
 *         description: Unauthorized - invalid credentials
 */
router.post('/auth', mqttAuthController.authenticate);

module.exports = router;