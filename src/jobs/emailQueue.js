import { Queue, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import redisClient from '../config/redis.js';
import { config } from '../config/env.js';
import logger from '../core/logger.js';

/**
 * Email queue for handling email notifications
 */
export class EmailQueue {
  constructor() {
    this.queueName = 'email-queue';
    this.queue = null;
    this.worker = null;
    this.transporter = null;
  }

  /**
   * Initialize email queue and worker
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

      // Setup email transporter
      this.transporter = nodemailer.createTransporter({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });

      // Create worker
      this.worker = new Worker(
        this.queueName,
        this.processEmailJob.bind(this),
        {
          connection: {
            host: redisClient.getClient().options.host,
            port: redisClient.getClient().options.port,
          },
          concurrency: 5,
        }
      );

      // Worker event handlers
      this.worker.on('completed', (job) => {
        logger.info('Email job completed', {
          jobId: job.id,
          email: job.data.to,
          subject: job.data.subject,
        });
      });

      this.worker.on('failed', (job, err) => {
        logger.error('Email job failed', {
          jobId: job?.id,
          error: err.message,
          email: job?.data?.to,
          subject: job?.data?.subject,
        });
      });

      this.worker.on('error', (err) => {
        logger.error('Email worker error:', err);
      });

      logger.info('Email queue initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email queue:', error);
      // throw error;
    }
  }

  /**
   * Process email job
   */
  async processEmailJob(job) {
    const { to, subject, html, text, attachments } = job.data;

    try {
      const mailOptions = {
        from: config.SMTP_USER,
        to,
        subject,
        html,
        text,
        attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        jobId: job.id,
        messageId: result.messageId,
        to,
        subject,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email', {
        jobId: job.id,
        error: error.message,
        to,
        subject,
      });
      throw error;
    }
  }

  /**
   * Add email to queue
   */
  async sendEmail(emailData, options = {}) {
    try {
      const job = await this.queue.add('send-email', emailData, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options,
      });

      logger.info('Email job added to queue', {
        jobId: job.id,
        to: emailData.to,
        subject: emailData.subject,
      });

      return job;
    } catch (error) {
      logger.error('Failed to add email job to queue:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    const emailData = {
      to: user.email,
      subject: 'Welcome to Enterprise Backend!',
      html: this.getWelcomeEmailTemplate(user),
      text: `Welcome ${user.username}! Thank you for joining Enterprise Backend.`,
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const emailData = {
      to: user.email,
      subject: 'Password Reset Request',
      html: this.getPasswordResetEmailTemplate(user, resetUrl),
      text: `Password reset requested. Use this link: ${resetUrl}`,
    };

    return this.sendEmail(emailData, { priority: 10 });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(user, order) {
    const emailData = {
      to: user.email,
      subject: `Order Confirmation - #${order._id}`,
      html: this.getOrderConfirmationEmailTemplate(user, order),
      text: `Order confirmed. Order ID: ${order._id}, Total: $${order.total}`,
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(user, notification) {
    const emailData = {
      to: user.email,
      subject: notification.title,
      html: this.getNotificationEmailTemplate(user, notification),
      text: notification.message,
    };

    return this.sendEmail(emailData);
  }

  /**
   * Email templates
   */
  getWelcomeEmailTemplate(user) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to Enterprise Backend!</h1>
        <p>Hello ${user.username},</p>
        <p>Thank you for joining our platform. We're excited to have you on board!</p>
        <p>You can now access all the features of our enterprise-grade backend system.</p>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The Enterprise Backend Team</p>
      </div>
    `;
  }

  getPasswordResetEmailTemplate(user, resetUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>Hello ${user.username},</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        </div>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>Best regards,<br>The Enterprise Backend Team</p>
      </div>
    `;
  }

  getOrderConfirmationEmailTemplate(user, order) {
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name || 'Product'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">$${item.price}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Order Confirmation</h1>
        <p>Hello ${user.username},</p>
        <p>Thank you for your order! Here are the details:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3>Order #${order._id}</h3>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Total:</strong> $${order.total}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Quantity</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p>We'll send you another email when your order ships.</p>
        <p>Best regards,<br>The Enterprise Backend Team</p>
      </div>
    `;
  }

  getNotificationEmailTemplate(user, notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">${notification.title}</h1>
        <p>Hello ${user.username},</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          ${notification.message}
        </div>
        <p>Best regards,<br>The Enterprise Backend Team</p>
      </div>
    `;
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
      logger.error('Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanup() {
    try {
      await this.queue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Remove completed jobs older than 24 hours
      await this.queue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // Remove failed jobs older than 7 days
      logger.info('Email queue cleanup completed');
    } catch (error) {
      logger.error('Email queue cleanup failed:', error);
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
      logger.info('Email queue shutdown completed');
    } catch (error) {
      logger.error('Email queue shutdown failed:', error);
    }
  }
}

// Create singleton instance
export const emailQueue = new EmailQueue();
