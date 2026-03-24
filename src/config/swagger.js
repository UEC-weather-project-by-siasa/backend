const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UEC Weather IoT API',
      version: '1.0.0',
      description: 'API documentation for IoT Platform'
    },
    servers: [
      {
        url: 'http://localhost:4000'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        UserRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Tanakrit' },
            email: { type: 'string', example: 'admin@example.com' },
            password: { type: 'string', example: 'password123' },
            profilePicture: { type: 'string' },
            role: { 
              type: 'string',
              enum: ['USER', 'ADMIN'],
              example: 'USER'
            },
          }
        }
      }
    }
  },
  apis: ['./src/modules/**/*.routes.js'] // 👈 อ่าน swagger จาก routes
};

module.exports = swaggerJsdoc(options);