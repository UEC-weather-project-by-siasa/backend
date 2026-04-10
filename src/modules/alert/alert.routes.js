const express = require('express');
const router = express.Router();
const alertController = require('./alert.controller');
const { protect } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Alert Rules Management (User / System / Global)
 */


/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get all alert rules (Admin sees all, User sees theirs + SYSTEM/GLOBAL)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of alerts
 */
router.get('/', protect, alertController.getAlerts);


/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Create new alert rule
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sensorId
 *               - condition
 *               - threshold
 *             properties:
 *               name:
 *                 type: string
 *                 example: "High Temperature"
 *               note:
 *                 type: string
 *                 example: "Check cooling fan"
 *               type:
 *                 type: string
 *                 enum: [USER, SYSTEM, GLOBAL]
 *                 default: USER
 *                 example: USER
 *               deviceId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: null when GLOBAL
 *               sensorId:
 *                 type: integer
 *                 example: 2
 *               condition:
 *                 type: string
 *                 enum: [">", "<", ">=", "<=", "=="]
 *                 example: ">"
 *               threshold:
 *                 type: number
 *                 example: 35.5
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Alert created
 */
router.post('/', protect, alertController.createAlert);


/**
 * @swagger
 * /api/alerts/{id}:
 *   put:
 *     summary: Update alert rule
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Temp Alert"
 *               note:
 *                 type: string
 *                 example: "Check device"
 *               condition:
 *                 type: string
 *                 example: ">"
 *               threshold:
 *                 type: number
 *                 example: 30
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Alert updated
 */
router.put('/:id', protect, alertController.updateAlert);


/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Delete alert rule
 *     tags: [Alerts]
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
 *         description: Alert deleted
 */
router.delete('/:id', protect, alertController.deleteAlert);

module.exports = router;