import { Queue, Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import logger from '../core/logger.js';
import NotificationService from '../modules/notifications/notification.service.js';
import { emailQueue } from './emailQueue.js';

/**
 * Notification worker for handling various notification tasks
 */
export class NotificationWorker {
  constructor() {
    this.queueName = 'notification-queue';
    this.queue = null;
    this.worker = null;
    this.notificationService = new NotificationService();
  }

  /**
   * Initialize notification queue and worker
   */
  async initialize() {
    try {
      // Create queue
      this.queue = new Queue(this.queueName, {
        connection: {
          host: redisClient.getClient().options.host,
          port: redisClient.getClient().options.port,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // Create worker
      this.worker = new Worker(
        this.queueName,
        this.processNotificationJob.bind(this),
        {
          connection: {
            host: redisClient.getClient().options.host,
            port: redisClient.getClient().options.port,
          },
          concurrency: 3,
        }
      );

      // Worker event handlers
      this.worker.on('completed', (job) => {
        logger.info('Notification job completed', {
          jobId: job.id,
          type: job.data.type,
          userId: job.data.userId,
        });
      });

      this.worker.on('failed', (job, err) => {
        logger.error('Notification job failed', {
          jobId: job?.id,
          error: err.message,
          type: job?.data?.type,
          userId: job?.data?.userId,
        });
      });

      this.worker.on('error', (err) => {
        logger.error('Notification worker error:', err);
      });

      logger.info('Notification worker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification worker:', error);
      // throw error;
    }
  }

  /**
   * Process notification job
   */
  async processNotificationJob(job) {
    const { type, data } = job.data;

    try {
      switch (type) {
        case 'user-registered':
          await this.handleUserRegistered(data);
          break;
        case 'order-created':
          await this.handleOrderCreated(data);
          break;
        case 'order-status-changed':
          await this.handleOrderStatusChanged(data);
          break;
        case 'password-reset-requested':
          await this.handlePasswordResetRequested(data);
          break;
        case 'product-low-stock':
          await this.handleProductLowStock(data);
          break;
        case 'user-login-alert':
          await this.handleUserLoginAlert(data);
          break;
        case 'system-maintenance':
          await this.handleSystemMaintenance(data);
          break;
        default:
          logger.warn('Unknown notification type', { type, jobId: job.id });
      }

      logger.info('Notification processed successfully', {
        jobId: job.id,
        type,
      });
    } catch (error) {
      logger.error('Failed to process notification', {
        jobId: job.id,
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle user registered notification
   */
  async handleUserRegistered(data) {
    const { user } = data;

    // Create in-app notification
    await this.notificationService.createNotification({
      userId: user._id,
      title: 'Welcome to Enterprise Backend!',
      message: 'Thank you for joining our platform. Explore all the features we have to offer.',
      type: 'success',
    });

    // Send welcome email
    await emailQueue.sendWelcomeEmail(user);
  }

  /**
   * Handle order created notification
   */
  async handleOrderCreated(data) {
    const { user, order } = data;

    // Create in-app notification
    await this.notificationService.createNotification({
      userId: user._id,
      title: 'Order Confirmed',
      message: `Your order #${order._id} has been confirmed. Total: $${order.total}`,
      type: 'success',
    });

    // Send order confirmation email
    await emailQueue.sendOrderConfirmationEmail(user, order);
  }

  /**
   * Handle order status changed notification
   */
  async handleOrderStatusChanged(data) {
    const { user, order, previousStatus } = data;

    const statusMessages = {
      processing: 'Your order is being processed.',
      shipped: 'Your order has been shipped!',
      completed: 'Your order has been completed.',
      cancelled: 'Your order has been cancelled.',
    };

    const message = statusMessages[order.status] || `Order status updated to ${order.status}`;

    // Create in-app notification
    await this.notificationService.createNotification({
      userId: user._id,
      title: 'Order Status Update',
      message: `Order #${order._id}: ${message}`,
      type: order.status === 'cancelled' ? 'warning' : 'info',
    });

    // Send email notification for significant status changes
    if (['shipped', 'completed', 'cancelled'].includes(order.status)) {
      await emailQueue.sendNotificationEmail(user, {
        title: 'Order Status Update',
        message: `Your order #${order._id} status has been updated to: ${order.status}. ${message}`,
      });
    }
  }

  /**
   * Handle password reset requested notification
   */
  async handlePasswordResetRequested(data) {
    const { user, resetToken } = data;

    // Create in-app notification
    await this.notificationService.createNotification({
      userId: user._id,
      title: 'Password Reset Requested',
      message: 'A password reset was requested for your account. Check your email for instructions.',
      type: 'info',
    });

    // Send password reset email
    await emailQueue.sendPasswordResetEmail(user, resetToken);
  }

  /**
   * Handle product low stock notification
   */
  async handleProductLowStock(data) {
    const { product, threshold = 10 } = data;

    // Notify all admin users
    const adminUsers = await this.notificationService.getAdminUsers();

    for (const admin of adminUsers) {
      await this.notificationService.createNotification({
        userId: admin._id,
        title: 'Low Stock Alert',
        message: `Product "${product.name}" is running low on stock. Current stock: ${product.stock}`,
        type: 'warning',
      });
    }
  }

  /**
   * Handle user login alert notification
   */
  async handleUserLoginAlert(data) {
    const { user, loginInfo } = data;

    // Create in-app notification for security
    await this.notificationService.createNotification({
      userId: user._id,
      title: 'New Login Detected',
      message: `New login from ${loginInfo.ip} using ${loginInfo.userAgent}`,
      type: 'info',
    });
  }

  /**
   * Handle system maintenance notification
   */
  async handleSystemMaintenance(data) {
    const { message, scheduledTime, duration } = data;

    // Notify all active users
    const activeUsers = await this.notificationService.getActiveUsers();

    for (const user of activeUsers) {
      await this.notificationService.createNotification({
        userId: user._id,
        title: 'Scheduled Maintenance',
        message: `${message} Scheduled for: ${scheduledTime}. Expected duration: ${duration}`,
        type: 'warning',
      });
    }
  }

  /**
   * Add notification job to queue
   */
  async addNotificationJob(type, data, options = {}) {
    try {
      const job = await this.queue.add(
        'process-notification',
        { type, data },
        {
          priority: options.priority || 0,
          delay: options.delay || 0,
          ...options,
        }
      );

      logger.info('Notification job added to queue', {
        jobId: job.id,
        type,
      });

      return job;
    } catch (error) {
      logger.error('Failed to add notification job to queue:', error);
      throw error;
    }
  }

  /**
   * Bulk notification job
   */
  async addBulkNotificationJob(notifications, options = {}) {
    try {
      const jobs = notifications.map(notification => ({
        name: 'process-notification',
        data: notification,
        opts: options,
      }));

      const bulkJobs = await this.queue.addBulk(jobs);

      logger.info('Bulk notification jobs added to queue', {
        count: bulkJobs.length,
      });

      return bulkJobs;
    } catch (error) {
      logger.error('Failed to add bulk notification jobs to queue:', error);
      throw error;
    }
  }

  /**
   * Schedule recurring notifications
   */
  async scheduleRecurringNotification(type, data, cronExpression, options = {}) {
    try {
      const job = await this.queue.add(
        'process-notification',
        { type, data },
        {
          repeat: { cron: cronExpression },
          ...options,
        }
      );

      logger.info('Recurring notification scheduled', {
        jobId: job.id,
        type,
        cron: cronExpression,
      });

      return job;
    } catch (error) {
      logger.error('Failed to schedule recurring notification:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    } catch (error) {
      logger.error('Failed to get notification queue stats:', error);
      return null;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanup() {
    try {
      await this.queue.clean(24 * 60 * 60 * 1000, 100, 'completed');
      await this.queue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');
      logger.info('Notification queue cleanup completed');
    } catch (error) {
      logger.error('Notification queue cleanup failed:', error);
    }
  }

  /**
   * Shutdown queue and worker
   */
  async shutdown() {
    try {
      if (this.worker) {
        await this.worker.close();
      }
      if (this.queue) {
        await this.queue.close();
      }
      logger.info('Notification worker shutdown completed');
    } catch (error) {
      logger.error('Notification worker shutdown failed:', error);
    }
  }
}

// Create singleton instance
export const notificationWorker = new NotificationWorker();
