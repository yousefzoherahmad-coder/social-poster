import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Social Poster Platform API',
      version: '1.0.0',
      description: 'REST API for the Social Poster Telegram Bot & Dashboard platform',
      contact: { name: 'Admin', email: 'admin@example.com' },
    },
    servers: [{ url: '/api', description: 'API Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./api/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
