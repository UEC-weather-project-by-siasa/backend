const express = require('express');
const router = express.Router();
const alertLogController = require('./alertLog.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');

/**
 * @swagger
 * tags:
 *   - name: AlertLogs
 *     description: Alert History & Logs Management
 */

/**
 * @swagger
 * /api/alert-logs:
 *   get:
 *     summary: Get alert logs with pagination
 *     tags: [AlertLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: integer
 *         description: Filter logs by Device ID
 *     responses:
 *       200:
 *         description: A paginated list of alert logs
 */
router.get('/', protect, alertLogController.getLogs);

/**
 * @swagger
 * /api/alert-logs:
 *   delete:
 *     summary: Clear OWN alert logs (User can only delete logs they own)
 *     tags: [AlertLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: integer
 *         description: Delete logs only for a specific Device ID
 *     responses:
 *       200:
 *         description: Logs successfully deleted
 *       403:
 *         description: Unauthorized (Admin only)
 */
router.delete('/', protect, alertLogController.clearMyLogs);

/**
 * @swagger
 * /api/alert-logs/admin/clear:
 *   delete:
 *     summary: Clear ALL alert logs (Admin only)
 *     tags: [AlertLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: integer
 *         description: Delete logs only for a specific Device ID
 *     responses:
 *       200:
 *         description: Logs successfully deleted
 *       403:
 *         description: Unauthorized (Admin only)
 */
router.delete('/admin/clear', protect, authorize('ADMIN'), alertLogController.adminClearAllLogs);


module.exports = router;
