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

module.exports = router;

