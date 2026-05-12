const cron = require('node-cron');
const { 
  runBulkWeatherPredictionByAIModel, 
  cleanupOldPredictions 
} = require('./ai.service');

const initAiCron = () => {
  // 1. งานพยากรณ์อากาศ: ทำงานทุกๆ 30 นาที
  cron.schedule('*/30 * * * *', () => {
    const now = new Date().toLocaleString();
    console.log(`[${now}] Running Scheduled AI Weather Prediction...`);
    runBulkWeatherPredictionByAIModel();
  });

  // 2. งานล้างข้อมูลเก่า: ทำงานทุกวัน เวลา 00:00 น. (เที่ยงคืน)
  cron.schedule('0 0 * * *', () => {
    const now = new Date().toLocaleString();
    console.log(`[${now}] Running Daily Cleanup: Removing predictions older than 14 days...`);
    cleanupOldPredictions();
  });
};

module.exports = initAiCron;