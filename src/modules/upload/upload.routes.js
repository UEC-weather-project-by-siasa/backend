const express = require("express");
const router = express.Router();

const upload = require("../../middleware/upload.middleware");
const uploadController = require("./upload.controller");
const { protect } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File Upload API
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload file (Profile image, device image, etc.)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 url:
 *                   type: string
 *                   example: /uploads/profile-123.png
 *       401:
 *         description: Unauthorized
 */
router.post("/", protect, upload.single("file"), uploadController.uploadFile);

module.exports = router;