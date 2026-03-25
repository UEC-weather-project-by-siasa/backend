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
 *                   properties:
 *                     totalDevices:
 *                       type: integer
 *                       example: 100
 *                     onlineDevices:
 *                       type: integer
 *                       example: 75
 *                     offlineDevices:
 *                       type: integer
 *                       example: 25
 *                     recentErrors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           eventCode:
 *                             type: string
 *                           message:
 *                             type: string
 *                           device:
 *                             type: object
 *                             properties:
 *                               deviceId:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */

// ดึงภาพรวมระบบ (Dashboard Summary)
router.get('/summary', protect, telemetryController.getSummary);

/**
 * @swagger
 * /api/telemetry/logs/{deviceId}:
 *   get:
 *     summary: Get device logs
 *     description: Returns logs of a specific device with optional filtering and pagination.
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Device ID
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by log level (INFO, WARN, ERROR)
 *       - in: query
 *         name: eventCode
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by event code
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Filter by read status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         required: false
 *         description: Number of logs per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         required: false
 *         description: Page number
 *     responses:
 *       200:
 *         description: Device logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       level:
 *                         type: string
 *                       eventCode:
 *                         type: string
 *                       message:
 *                         type: string
 *                       isRead:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */

// ดึง Logs รายเครื่อง
router.get('/logs/:deviceId', protect, telemetryController.getLogs);

/**
 * @swagger
 * /api/telemetry/logs/{id}/read:
 *   patch:
 *     summary: Mark a log as read
 *     description: Update the `isRead` status of a log entry.
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Log ID
 *     responses:
 *       200:
 *         description: Log marked as read successfully
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
 *                   properties:
 *                     id:
 *                       type: integer
 *                     level:
 *                       type: string
 *                     eventCode:
 *                       type: string
 *                     message:
 *                       type: string
 *                     isRead:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 */
// Mark as read (เช่น กดปิด Notification ในหน้าเว็ป)
router.patch('/logs/:id/read', protect, telemetryController.markLogRead);

module.exports = router;
