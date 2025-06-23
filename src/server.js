import app from './app.js';
import { config } from './config/env.js';
import database from './config/database.js';
import redisClient from './config/redis.js';
import logger from './core/logger.js';
import { setupProcessErrorHandlers } from './middlewares/error.js';
import { emailQueue } from './jobs/emailQueue.js';
import { notificationWorker } from './jobs/notificationWorker.js';

// Setup process error handlers
setupProcessErrorHandlers();

async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();
    logger.info('Database connected successfully');

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connected successfully');

    // Initialize job queues
    await emailQueue.initialize();
    logger.info('Email queue initialized');

    await notificationWorker.initialize();
    logger.info('Notification worker initialized');

    // Start server
    const server = app.listen(config.PORT, config.HOST, () => {
      logger.info(`Server running on ${config.HOST}:${config.PORT}`, {
        environment: config.NODE_ENV,
        port: config.PORT,
        host: config.HOST,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        try {
          // Close database connection
          await database.disconnect();
          logger.info('Database disconnected');

          // Close Redis connection
          await redisClient.disconnect();
          logger.info('Redis disconnected');

          // Shutdown job queues
          await emailQueue.shutdown();
          await notificationWorker.shutdown();
          logger.info('Job queues shut down');

          logger.info('Server shut down successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
