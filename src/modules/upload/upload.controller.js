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