const cron = require('node-cron');
const { runBulkWeatherPredictionByAIModel } = require('./ai.service');

// ตั้งเวลาให้ทำงานทุกๆ 30 นาทีตามที่ต้องการ
const initAiCron = () => {
  cron.schedule('*/30 * * * *', () => {
    const now = new Date().toLocaleString();
    console.log(`[${now}] Running Scheduled AI Weather Prediction (30m interval)...`);
    runBulkWeatherPredictionByAIModel();
  });
};

module.exports = initAiCron;