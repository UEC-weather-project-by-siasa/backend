// src/modules/search/search.controller.js

const searchService = require("./search.service");

const search = async (req, res) => {
  try {
    const { q } = req.query;

    const result = await searchService.globalSearch(q);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Search failed"
    });
  }
};

module.exports = {
  search
};