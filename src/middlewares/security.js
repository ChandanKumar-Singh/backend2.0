import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import logger from '../core/logger.js';

// Rate limiting configuration
export const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
      });
      res.status(429).json({
        success: false,
        message,
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// General rate limiter
export const generalRateLimit = createRateLimit(
  config.RATE_LIMIT_WINDOW,
  config.RATE_LIMIT_MAX,
  'Too many requests from this IP, please try again later'
);

// Strict rate limiter for auth endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = new Set([
      config.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ]);

    if (config.NODE_ENV === 'development') {
      allowedOrigins.add('http://localhost:5173');
    }


    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Helmet configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
};

// Security middleware setup
export const setupSecurity = (app) => {
  // Trust proxy (important for rate limiting and IP detection)
  app.set('trust proxy', 1);

  // Helmet for security headers
  app.use(helmet(helmetOptions));

  // CORS
  app.use(cors(corsOptions));

  // General rate limiting
  app.use(generalRateLimit);

  // Auth rate limiting for specific endpoints
  app.use('/api/v1/app/auth', authRateLimit);
  app.use('/api/v1/admin/auth', authRateLimit);

  logger.info('Security middleware configured');
};
