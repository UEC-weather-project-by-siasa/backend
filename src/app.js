const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const deviceRoutes = require('./modules/device/device.routes');
const telemetryRoutes = require('./modules/telemetry/telemetry.routes');
const systemRoutes = require('./modules/system/system.routes');

const mqttAuthRoutes = require('./modules/mqtt/mqtt.auth.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/mqtt', mqttAuthRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/device', deviceRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/system', systemRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

module.exports = app;
