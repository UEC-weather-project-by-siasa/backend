// src/modules/upload/upload.controller.js

const fs = require("fs");
const path = require("path");

exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;

    const baseUrl =
        process.env.APP_URL ||
        `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`;

    res.json({
      status: "success",
      url: `${baseUrl}/uploads/${file.filename}`,
    });

  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;

    // skip default
    if (filename === "profilePicture.png") {
      return res.json({
        status: "success",
        message: "Default image skipped",
      });
    }

    const filePath = path.join("uploads", filename);

    // ไม่เจอไฟล์ก็ไม่เป็นไร
    if (!fs.existsSync(filePath)) {
      return res.json({
        status: "success",
        message: "File not found (ignored)",
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      status: "success",
      message: "File deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};