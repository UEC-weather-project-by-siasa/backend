const express = require('express');
const router = express.Router();
const deviceController = require('./data.controller');

/**
 * @swagger
 * tags:
 *   name: Data
 *   description: Data Management API of (public api)
 */

// ───────── data Routes ─────────

/**
 * @swagger
 * /api/data/sensors/{deviceId}/history:
 *   get:
 *     summary: Get 7-day sensor history (30-minute average)
 *     description: Retrieve 7 days of historical sensor data averaged every 30 minutes for a specific device (Public API)
 *     tags: [Data]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Successfully retrieved historical data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: 7-day historical data with 30-minute interval
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
 *                           example: 2026-04-10T10:00:00Z
 *                         value:
 *                           type: number
 *                           example: 28.45
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Device not found in system
 *       500:
 *         description: Server error
 */
router.get('/sensors/:deviceId/history', deviceController.getDeviceSensorHistoryof7days); 

module.exports = router;

