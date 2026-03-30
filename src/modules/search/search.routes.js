// src/modules/search/search.routes.js

const express = require("express");
const router = express.Router();
const { search } = require("./search.controller");
const { protect } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Global search API
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Global search (Device, Sensor, User)
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Search result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     type: object
 *                 sensors:
 *                   type: array
 *                   items:
 *                     type: object
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: device
 *       401:
 *         description: Unauthorized
 */

router.get("/", protect, search);

module.exports = router;