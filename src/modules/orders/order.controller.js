import OrderService from './order.service.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../core/response.js';
import logger from '../../core/logger.js';

export default class OrderController {
  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(req, res) {
    const result = await this.orderService.getAllOrders(req.query);
    sendSuccess(res, 'Orders retrieved successfully', result.data, {
      pagination: result.pagination,
    });
  }

  /**
   * Get user's orders
   */
  async getUserOrders(req, res) {
    const userId = req.user._id;
    const result = await this.orderService.getUserOrders(userId, req.query);
    sendSuccess(res, 'Orders retrieved successfully', result.data, {
      pagination: result.pagination,
    });
  }

  /**
   * Get order by ID
   */
  async getOrderById(req, res) {
    const { id } = req.params;
    const userId = req.user.role === 'admin' ? null : req.user._id;
    const order = await this.orderService.getOrderById(id, userId);
    sendSuccess(res, 'Order retrieved successfully', order);
  }

  /**
   * Create new order
   */
  async createOrder(req, res) {
    const userId = req.user._id;
    const orderData = { ...req.body, userId };
    const order = await this.orderService.createOrder(orderData);
    sendCreated(res, 'Order created successfully', order);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req, res) {
    const { id } = req.params;
    const { status, reason } = req.body;
    const order = await this.orderService.updateOrderStatus(id, status, reason);
    sendSuccess(res, 'Order status updated successfully', order);
  }

  /**
   * Cancel order
   */
  async cancelOrder(req, res) {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.role === 'admin' ? null : req.user._id;
    const order = await this.orderService.cancelOrder(id, userId, reason);
    sendSuccess(res, 'Order cancelled successfully', order);
  }

  /**
   * Delete order (admin only)
   */
  async deleteOrder(req, res) {
    const { id } = req.params;
    const result = await this.orderService.deleteOrder(id);
    sendSuccess(res, result.message);
  }

  /**
   * Get order statistics (admin only)
   */
  async getOrderStats(req, res) {
    const stats = await this.orderService.getOrderStats();
    sendSuccess(res, 'Order statistics retrieved successfully', stats);
  }
}
