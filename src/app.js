import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { setupSecurity } from './middlewares/security.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';
import apiRoutes from './routes/index.js';
import logger from './core/logger.js';
import { setupSwagger } from '../swagger.config.js';

const app = express();

// Trust proxy for proper IP detection
app.set('trust proxy', 1);
/// test ip and protocol
/* app.use((req, res, next) => {
  console.log('IP:', req.ip);
  console.log('Protocol:', req.protocol);
  next();
}); */


// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
setupSecurity(app);

// Swagger setup — add BEFORE API routes
setupSwagger(app);

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

export default app;
