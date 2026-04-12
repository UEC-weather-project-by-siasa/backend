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
 *     summary: Manually trigger AI Bulk Prediction
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
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
 *                   example: AI Bulk Prediction triggered and processed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Internal Server Error
 */
router.post('/trigger', protect, authorize('ADMIN'), aiController.triggerPrediction);

module.exports = router;