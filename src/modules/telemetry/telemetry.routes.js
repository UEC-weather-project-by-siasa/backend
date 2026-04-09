const express = require('express');
const router = express.Router();
const telemetryController = require('./telemetry.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');


/**
 * @swagger
 * tags:
 *   name: Telemetry
 *   description: System Health & Device Logs API
 */


/**
 * @swagger
 * /api/telemetry/summary:
 *   get:
 *     summary: Get dashboard summary
 *     description: Returns total devices, online/offline count, and latest 5 error logs.
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
 */
router.get('/summary', protect, telemetryController.getSummary);


/**
 * @swagger
 * /api/telemetry/logs/{deviceId}:
 *   get:
 *     summary: Get device logs
 *     description: Returns logs of a specific device or all devices
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID or "all"
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           example: ERROR
 *       - in: query
 *         name: eventCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 */
router.get('/logs/:deviceId', protect, telemetryController.getLogs);


/**
 * @swagger
 * /api/telemetry/logs/{id}/read:
 *   patch:
 *     summary: Mark log as read
 *     description: Update isRead status
 *     tags: [Telemetry]
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
 *         description: Log marked as read
 */
router.patch('/logs/:id/read', protect, telemetryController.markLogRead);


/**
 * @swagger
 * /api/telemetry/logs:
 *   delete:
 *     summary: Clear all logs
 *     description: Delete all logs (Admin only)
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs cleared successfully
 */
router.delete('/logs', protect, authorize('ADMIN'), telemetryController.clearLogs);

module.exports = router;
