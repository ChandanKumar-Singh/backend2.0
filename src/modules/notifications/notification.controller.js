import NotificationService from './notification.service.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../core/response.js';
import logger from '../../core/logger.js';

export default class NotificationController {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(req, res) {
    const userId = req.user._id;
    const result = await this.notificationService.getUserNotifications(userId, req.query);
    sendSuccess(res, 'Notifications retrieved successfully', result.data, {
      pagination: result.pagination,
    });
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(req, res) {
    const userId = req.user._id;
    const count = await this.notificationService.getUnreadCount(userId);
    sendSuccess(res, 'Unread count retrieved successfully', { count });
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(req, res) {
    const { id } = req.params;
    const userId = req.user._id;
    const notification = await this.notificationService.getNotificationById(id, userId);
    sendSuccess(res, 'Notification retrieved successfully', notification);
  }

  /**
   * Create notification (admin only)
   */
  async createNotification(req, res) {
    const notificationData = req.body;
    const notification = await this.notificationService.createNotification(notificationData);
    sendCreated(res, 'Notification created successfully', notification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req, res) {
    const { id } = req.params;
    const userId = req.user._id;
    const notification = await this.notificationService.markAsRead(id, userId);
    sendSuccess(res, 'Notification marked as read', notification);
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(req, res) {
    const { id } = req.params;
    const userId = req.user._id;
    const notification = await this.notificationService.markAsUnread(id, userId);
    sendSuccess(res, 'Notification marked as unread', notification);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    const userId = req.user._id;
    const result = await this.notificationService.markAllAsRead(userId);
    sendSuccess(res, 'All notifications marked as read', result);
  }

  /**
   * Delete notification
   */
  async deleteNotification(req, res) {
    const { id } = req.params;
    const userId = req.user._id;
    const result = await this.notificationService.deleteNotification(id, userId);
    sendSuccess(res, result.message);
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(req, res) {
    const userId = req.user._id;
    const result = await this.notificationService.deleteAllNotifications(userId);
    sendSuccess(res, result.message);
  }

  /**
   * Get notification statistics (admin only)
   */
  async getNotificationStats(req, res) {
    const stats = await this.notificationService.getNotificationStats();
    sendSuccess(res, 'Notification statistics retrieved successfully', stats);
  }
}
