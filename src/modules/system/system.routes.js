const express = require('express');
const router = express.Router();
const systemController = require('./system.controller');
const { protect } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   - name: System
 *     description: Server status and information
 */

/**
 * @swagger
 * /api/system/status:
 *   get:
 *     summary: Get server health and network info
 *     description: Returns detailed server status including uptime, platform, memory, CPU, IP address, Node.js version, and current time.
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Server status information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: online
 *                 data:
 *                   type: object
 *                   properties:
 *                     uptime:
 *                       type: number
 *                       description: Seconds since server started
 *                       example: 12345
 *                     platform:
 *                       type: string
 *                       example: linux
 *                     architecture:
 *                       type: string
 *                       example: x64
 *                     cpuCount:
 *                       type: integer
 *                       example: 8
 *                     totalMemory:
 *                       type: string
 *                       example: 15.92 GB
 *                     freeMemory:
 *                       type: string
 *                       example: 7.84 GB
 *                     serverIp:
 *                       type: string
 *                       example: 192.168.1.10
 *                     nodeVersion:
 *                       type: string
 *                       example: v20.4.0
 *                     currentTime:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-03-25T14:30:00.000Z
 */

router.get('/status', protect, systemController.getStatus);

module.exports = router;
