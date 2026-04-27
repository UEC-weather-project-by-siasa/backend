const cron = require('node-cron');
const { runBulkWeatherPredictionByAIModel } = require('./ai.service');

// ตั้งเวลาให้ทำงานทุกๆ 60 นาที
const initAiCron = () => {
  cron.schedule('*/60 * * * *', () => {
    console.log('Running Scheduled AI Weather Prediction...');
    runBulkWeatherPredictionByAIModel();
  });
};

module.exports = initAiCron;