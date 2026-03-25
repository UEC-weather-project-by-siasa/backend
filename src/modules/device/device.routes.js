const express = require('express');
const router = express.Router();
const deviceController = require('./device.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');

/**
 * @swagger
 * tags:
 *   name: Device
 *   description: Device Management API
 */

// ───────── Device Routes ─────────

/**
 * @swagger
 * /api/device:
 *   get:
 *     summary: Get all devices (login required)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all devices
 */
router.get('/', protect, deviceController.getDevices);

/**
 * @swagger
 * /api/device/{id}:
 *   get:
 *     summary: Get a device by ID (login required)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device info
 *       404:
 *         description: Device not found
 */
router.get('/:id', protect, deviceController.getDevice);

/**
 * @swagger
 * /api/device:
 *   post:
 *     summary: Create a new device (ADMIN only)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Weather Sensor 1"
 *               model:
 *                 type: string
 *                 example: "A7608"
 *               firmware:
 *                 type: string
 *                 example: "v1.0.0"
 *               ownerId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Device created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 12
 *                     name:
 *                       type: string
 *                       example: "Weather Sensor 1"
 *                     model:
 *                       type: string
 *                       example: "A7608"
 *                     firmware:
 *                       type: string
 *                       example: "v1.0.0"
 *                     ownerId:
 *                       type: integer
 *                       example: 1
 *                     deviceId:
 *                       type: string
 *                       example: "8f3a1b2c"
 *                     deviceKey:
 *                       type: string
 *                       example: "x9p4q7r2"
 */
router.post('/', protect, authorize('ADMIN'), deviceController.createDevice);

/**
 * @swagger
 * /api/device/{id}:
 *   put:
 *     summary: Update a device (ADMIN only)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Device updated
 */
router.put('/:id', protect, authorize('ADMIN'), deviceController.updateDevice);

/**
 * @swagger
 * /api/device/{id}:
 *   delete:
 *     summary: Delete a device (ADMIN only)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device deleted
 */
router.delete('/:id', protect, authorize('ADMIN'), deviceController.deleteDevice);

// ───────── Sensor Routes ─────────

/**
 * @swagger
 * /api/device/sensors/all:
 *   get:
 *     summary: Get all sensors (login required)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sensors
 */
router.get('/sensors/all', protect, deviceController.getSensors);

/**
 * @swagger
 * /api/device/sensors/{id}:
 *   get:
 *     summary: Get a sensor by ID (login required)
 *     tags: [DeviceSensor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sensor info
 *       404:
 *         description: Sensor not found
 */
router.get('/sensors/:id', protect, deviceController.getSensor);

/**
 * @swagger
 * /api/device/sensors:
 *   post:
 *     summary: Create a new sensor (ADMIN only)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *               model:
 *                 type: string
 *               brand:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sensor created
 */
router.post('/sensors', protect, authorize('ADMIN'), deviceController.createSensor);

/**
 * @swagger
 * /api/device/sensors/{id}:
 *   put:
 *     summary: Update a sensor (ADMIN only)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Sensor updated
 */
router.put('/sensors/:id', protect, authorize('ADMIN'), deviceController.updateSensor);

/**
 * @swagger
 * /api/device/sensors/{id}:
 *   delete:
 *     summary: Delete a sensor (ADMIN only)
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sensor deleted
 */
router.delete('/sensors/:id', protect, authorize('ADMIN'), deviceController.deleteSensor);

/**
 * @swagger
 * /api/device/{deviceId}/sensors:
 *   get:
 *     summary: Get all sensors of a device (login required)
 *     tags: [DeviceSensor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of DeviceSensor
 */
router.get('/:deviceId/sensors', protect, deviceController.getDeviceSensors);

/**
 * @swagger
 * /api/device/sensors/map:
 *   post:
 *     summary: Map a sensor to a device (ADMIN only)
 *     tags: [DeviceSensor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: integer
 *               sensorId:
 *                 type: integer
 *               alias:
 *                 type: string
 *                 example: "Temperature Living Room"
 *     responses:
 *       201:
 *         description: DeviceSensor mapping created
 */
router.post('/sensors/map', protect, authorize('ADMIN'), deviceController.createDeviceSensor);

/**
 * @swagger
 * /api/device/sensors/map/{id}:
 *   put:
 *     summary: Update a DeviceSensor mapping (ADMIN only)
 *     tags: [DeviceSensor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alias:
 *                 type: string
 *     responses:
 *       200:
 *         description: DeviceSensor mapping updated
 */
router.put('/sensors/map/:id', protect, authorize('ADMIN'), deviceController.updateDeviceSensor);

/**
 * @swagger
 * /api/device/sensors/map/{id}:
 *   delete:
 *     summary: Delete a DeviceSensor mapping (ADMIN only)
 *     tags: [DeviceSensor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: DeviceSensor mapping deleted
 */
router.delete('/sensors/map/:id', protect, authorize('ADMIN'), deviceController.deleteDeviceSensor);


/**
 * @swagger
 * tags:
 *   name: Device
 *   description: Device sensor data API
 */

/**
 * @swagger
 * /api/device/sensors/{deviceId}/last:
 *   get:
 *     summary: Get the latest value of all sensors of a device
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the device
 *     responses:
 *       200:
 *         description: Latest sensor values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       time:
 *                         type: string
 *                         format: date-time
 *                       value:
 *                         type: number
 */
router.get('/sensors/:deviceId/last', protect, deviceController.getDeviceSensorsLast);


/**
 * @swagger
 * /api/device/sensors/{deviceId}/history:
 *   get:
 *     summary: Get historical data of all sensors for a device
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the device
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           example: -1h
 *         description: Start time (Flux format or ISO timestamp)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           example: now()
 *         description: End time (Flux format or ISO timestamp)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of records per sensor
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Historical data for all sensors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         time:
 *                           type: string
 *                           format: date-time
 *                         value:
 *                           type: number
 */
router.get('/sensors/:deviceId/history', protect, deviceController.getDeviceSensorHistory);


/**
 * @swagger
 * /api/device/sensors/{deviceId}/{sensorName}/history:
 *   get:
 *     summary: Get historical data of a specific sensor
 *     tags: [Device]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the device
 *       - in: path
 *         name: sensorName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the sensor
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           example: -1h
 *         description: Start time (Flux format or ISO timestamp)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           example: now()
 *         description: End time (Flux format or ISO timestamp)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of records per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Response format
 *     responses:
 *       200:
 *         description: Historical data of the sensor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       time:
 *                         type: string
 *                         format: date-time
 *                       value:
 *                         type: number
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "time,value\n2026-03-25T07:00:00Z,23.4\n2026-03-25T07:01:00Z,23.6"
 */
router.get('/sensors/:deviceId/:sensorName/history', protect, deviceController.getSensorHistory);



module.exports = router;

