import express from 'express';
import v1Routes from './v1/index.js';
import { config } from '../config/env.js';
import { sendSuccess } from '../core/response.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  sendSuccess(res, 'API is healthy', {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.NODE_ENV,
  });
});

// API version routes
router.use('/v1', v1Routes);

export default router;
