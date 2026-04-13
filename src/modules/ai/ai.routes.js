const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const { chatRateLimiter, checkDailyQuota } = require('../../middleware/aiLimit.middleware');

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI Weather Prediction and Insights (Gemini)
 */


/**
 * @swagger
 * /api/ai/trigger:
 *   post:
 *     summary: Trigger AI Weather Prediction (Bulk)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI Prediction completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.post(
  '/trigger',
  protect,
  authorize('ADMIN'),
  aiController.triggerPrediction
);



/**
 * @swagger
 * /api/ai/predictions:
 *   get:
 *     summary: Get AI Predictions (Pagination + Search + Filter)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           example: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           example: 10
 *
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *           example: DEVICE001
 *
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search AI insight or suggestion
 *
 *       - in: query
 *         name: decision
 *         schema:
 *           type: string
 *           example: alert_warning
 *
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  '/predictions',
  protect,
  aiController.getPredictions
);



/**
 * @swagger
 * /api/ai/predictions:
 *   delete:
 *     summary: Delete All AI Predictions (Admin Only)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All predictions deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
router.delete(
  '/predictions',
  protect,
  authorize('ADMIN'),
  aiController.deleteAllPredictions
);



/**
 * @swagger
 * /api/ai/logs:
 *   get:
 *     summary: Get AI Chat Logs (Pagination + Search)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           example: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           example: 10
 *
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search question or answer
 *
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/logs', protect, aiController.getLogs);



/**
 * @swagger
 * /api/ai/logs:
 *   delete:
 *     summary: Delete AI Logs (Single or All)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: number
 *         description: Log ID (optional - delete single log)
 *
 *     responses:
 *       200:
 *         description: Logs deleted
 */
router.delete('/logs', protect, aiController.clearLogs);



/**
 * @swagger
 * /api/ai/ask:
 *   post:
 *     summary: Ask AI Weather Assistant
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *                 example: วันนี้ฝนจะตกไหม
 *
 *               deviceId:
 *                 type: number
 *                 example: 1
 *
 *     responses:
 *       200:
 *         description: AI response
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/ask',
  protect,
  chatRateLimiter,
  checkDailyQuota,
  aiController.handleAskAI
);


/**
 * @swagger
 * /api/ai/predictions/last:
 *   get:
 *     summary: Get latest AI prediction for each device
 *     description: Returns the most recent AI prediction for every device in the system
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved latest predictions
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
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/predictions/last',
  aiController.getLastPredictions
);


module.exports = router;