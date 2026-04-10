const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { protect } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: User Notification Management
 */


/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get my notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user notifications
 */
router.get('/', protect, notificationController.getMyNotifications);


/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', protect, notificationController.markAsRead);


/**
 * @swagger
 * /api/notifications/clear-all:
 *   delete:
 *     summary: Clear all my notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications cleared
 */
router.delete('/clear-all', protect, notificationController.clearMyNotifications);

module.exports = router;