const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');

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
 *                   example: AI Bulk Prediction triggered successfully
 *                 count:
 *                   type: number
 *                   example: 5
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
 *
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search AI insight / suggestion
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


module.exports = router;