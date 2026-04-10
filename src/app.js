const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const hpp = require('hpp'); 
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const deviceRoutes = require('./modules/device/device.routes');
const telemetryRoutes = require('./modules/telemetry/telemetry.routes');
const systemRoutes = require('./modules/system/system.routes');
const mqttAuthRoutes = require('./modules/mqtt/mqtt.auth.routes');
const searchRoutes = require("./modules/search/search.routes");
const uploadRoutes = require("./modules/upload/upload.routes");
const alertRoutes = require('./modules/alert/alert.routes');
const alertLogRoutes = require('./modules/alertLog/alertLog.routes');

const app = express();

// ─── Security Middlewares ───
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(hpp()); 

// ─── Standard Middlewares ───
app.use(morgan('dev')); 
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' })); 

// ─── Swagger Documentation ───
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/mqtt', mqttAuthRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/device', deviceRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/system', systemRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/alert-logs', alertLogRoutes);

// ─── Upload ───
app.use("/uploads", express.static("uploads"));

// ─── Health Check ───
app.get('/', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'UEC Weather IoT API is running',
    version: '1.0.0'
  });
});

app.use((err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;