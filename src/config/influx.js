const { InfluxDB, Point } = require('@influxdata/influxdb-client');
require('dotenv').config();

const client = new InfluxDB({ 
  url: process.env.INFLUX_URL, 
  token: process.env.INFLUX_TOKEN 
});

const writeApi = client.getWriteApi(
  process.env.INFLUX_ORG, 
  process.env.INFLUX_BUCKET,
  'ms' , {
  flushInterval: 1000,
  batchSize: 500
}
);
const queryApi = client.getQueryApi(process.env.INFLUX_ORG);
console.log('InfluxDB: Client Initialized');

module.exports = { writeApi, queryApi, Point };