import Notification from './notification.model.js';
import User from '../users/user.model.js';
import { NotFoundError, AuthorizationError } from '../../core/error.js';
import { createQueryParser } from '../../utils/queryParser.js';
import { invalidateCacheByTags } from '../../middlewares/cache.js';
import logger from '../../core/logger.js';

export default class NotificationService {
  /**
   * Get user notifications
   */
  async getUserNotifications(userId, query) {
    try {
      const queryParser = createQueryParser({ ...query, userId });
      const result = await queryParser
        .filter()
        .sort()
        .select()
        .paginate()
        .execute(Notification);

      logger.info('User notifications retrieved', {
        userId,
        count: result.data.length,
        total: result.pagination.total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({ userId, isRead: false });
      
      logger.info('Unread notifications count retrieved', { userId, count });
      return count;
    } catch (error) {
      logger.error('Failed to get unread count:', error);
      throw error;
    }
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });
      
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      // Auto-mark as read when fetched
      if (!notification.isRead) {
        await notification.markAsRead();
        await invalidateCacheByTags([`user:${userId}:notifications`]);
      }

      logger.info('Notification retrieved by ID', { notificationId, userId });
      return notification;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get notification by ID:', error);
      throw error;
    }
  }

  /**
   * Create notification
   */
  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();

      // Invalidate cache
      await invalidateCacheByTags([`user:${notificationData.userId}:notifications`]);

      logger.info('Notification created successfully', {
        notificationId: notification._id,
        userId: notification.userId,
        type: notification.type,
      });

      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });
      
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      await notification.markAsRead();

      // Invalidate cache
      await invalidateCacheByTags([`user:${userId}:notifications`]);

      logger.info('Notification marked as read', { notificationId, userId });
      return notification;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });
      
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      await notification.markAsUnread();

      // Invalidate cache
      await invalidateCacheByTags([`user:${userId}:notifications`]);

      logger.info('Notification marked as unread', { notificationId, userId });
      return notification;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to mark notification as unread:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.markAllAsRead(userId);

      // Invalidate cache
      await invalidateCacheByTags([`user:${userId}:notifications`]);

      logger.info('All notifications marked as read', {
        userId,
        modifiedCount: result.modifiedCount,
      });

      return {
        message: 'All notifications marked as read',
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });
      
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      await Notification.findByIdAndDelete(notificationId);

      // Invalidate cache
      await invalidateCacheByTags([`user:${userId}:notifications`]);

      logger.info('Notification deleted', { notificationId, userId });
      return { message: 'Notification deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(userId) {
    try {
      const result = await Notification.deleteMany({ userId });

      // Invalidate cache
      await invalidateCacheByTags([`user:${userId}:notifications`]);

      logger.info('All notifications deleted', {
        userId,
        deletedCount: result.deletedCount,
      });

      return {
        message: 'All notifications deleted successfully',
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      logger.error('Failed to delete all notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to user
   */
  async sendNotificationToUser(userId, notificationData) {
    try {
      const notification = await this.createNotification({
        ...notificationData,
        userId,
      });

      return notification;
    } catch (error) {
      logger.error('Failed to send notification to user:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(userIds, notificationData) {
    try {
      const notifications = await Promise.all(
        userIds.map(userId =>
          this.createNotification({
            ...notificationData,
            userId,
          })
        )
      );

      logger.info('Bulk notifications sent', {
        userCount: userIds.length,
        notificationCount: notifications.length,
      });

      return notifications;
    } catch (error) {
      logger.error('Failed to send bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats() {
    try {
      const [
        totalNotifications,
        unreadNotifications,
        readNotifications,
        notificationsByType,
        notificationsByCategory,
        recentNotifications
      ] = await Promise.all([
        Notification.countDocuments(),
        Notification.countDocuments({ isRead: false }),
        Notification.countDocuments({ isRead: true }),
        Notification.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Notification.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Notification.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      ]);

      const stats = {
        total: totalNotifications,
        unread: unreadNotifications,
        read: readNotifications,
        recent: recentNotifications,
        byType: notificationsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byCategory: notificationsByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      };

      logger.info('Notification statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get notification statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteExpired();
      
      logger.info('Expired notifications cleaned up', {
        deletedCount: result.deletedCount,
      });

      return {
        message: 'Expired notifications cleaned up',
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      logger.error('Failed to cleanup expired notifications:', error);
      throw error;
    }
  }

  /**
   * Get active users
   */
  async getActiveUsers() {
    try {
      const users = await User.findActiveUsers();
      return users;
    } catch (error) {
      logger.error('Failed to get active users:', error);
      throw error;
    }
  }

  /**
   * Get admin users
   */
  async getAdminUsers() {
    try {
      const users = await User.findAdmins();
      return users;
    } catch (error) {
      logger.error('Failed to get admin users:', error);
      throw error;
    }
  }
}
