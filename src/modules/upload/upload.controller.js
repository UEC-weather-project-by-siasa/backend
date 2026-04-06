const fs = require("fs");
const path = require("path");
exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;

    res.json({
      status: "success",
      url: `/uploads/${file.filename}`,
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

    const filePath = path.join("uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: "fail",
        message: "File not found",
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