import Order from './order.model.js';
import Product from '../products/product.model.js';
import User from '../users/user.model.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../../core/error.js';
import { createQueryParser } from '../../utils/queryParser.js';
import { invalidateCacheByTags } from '../../middlewares/cache.js';
import logger from '../../core/logger.js';
import { notificationWorker } from '../../jobs/notificationWorker.js';

export default class OrderService {
  /**
   * Get all orders with pagination and filtering (admin only)
   */
  async getAllOrders(query) {
    try {
      const queryParser = createQueryParser(query);
      const result = await queryParser
        .filter()
        .sort()
        .select()
        .paginate()
        .execute(Order);

      // Populate user information
      await Order.populate(result.data, {
        path: 'userId',
        select: 'username email',
      });

      logger.info('All orders retrieved', {
        count: result.data.length,
        total: result.pagination.total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get all orders:', error);
      throw error;
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId, query) {
    try {
      const queryParser = createQueryParser({ ...query, userId });
      const result = await queryParser
        .filter()
        .sort()
        .select()
        .paginate()
        .execute(Order);

      logger.info('User orders retrieved', {
        userId,
        count: result.data.length,
        total: result.pagination.total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get user orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId, userId = null) {
    try {
      const query = { _id: orderId };
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query).populate('userId', 'username email');
      
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      logger.info('Order retrieved by ID', { orderId, userId });
      return order;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get order by ID:', error);
      throw error;
    }
  }

  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      const { userId, items, shippingAddress } = orderData;

      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Validate and process items
      const processedItems = await this.validateAndProcessItems(items);
      
      // Calculate total
      const total = processedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create order
      const order = new Order({
        userId,
        items: processedItems,
        total,
        shippingAddress,
      });

      await order.save();

      // Update product stock
      await this.updateProductStock(processedItems);

      // Invalidate cache
      await invalidateCacheByTags(['orders', `user:${userId}:orders`]);

      // Send order confirmation notification
      await notificationWorker.addNotificationJob('order-created', { user, order });

      logger.info('Order created successfully', {
        orderId: order._id,
        userId,
        total,
        itemCount: processedItems.length,
      });

      return order;
    } catch (error) {
      logger.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Validate and process order items
   */
  async validateAndProcessItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Order must contain at least one item');
    }

    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        throw new NotFoundError(`Product not found: ${item.productId}`);
      }

      if (product.status !== 'active') {
        throw new ValidationError(`Product is not available: ${product.name}`);
      }

      if (product.stock < item.quantity) {
        throw new ValidationError(`Insufficient stock for product: ${product.name}`);
      }

      processedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity,
      });
    }

    return processedItems;
  }

  /**
   * Update product stock after order creation
   */
  async updateProductStock(items) {
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );

      // Check for low stock
      const product = await Product.findById(item.productId);
      if (product.stock <= 10) {
        await notificationWorker.addNotificationJob('product-low-stock', { product });
      }
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus, reason = null) {
    try {
      const order = await Order.findById(orderId).populate('userId', 'username email');
      
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      const statusChange = await order.updateStatus(newStatus, reason);

      // Invalidate cache
      await invalidateCacheByTags(['orders', `user:${order.userId._id}:orders`]);

      // Send status change notification
      await notificationWorker.addNotificationJob('order-status-changed', {
        user: order.userId,
        order,
        previousStatus: statusChange.previousStatus,
      });

      logger.info('Order status updated', {
        orderId,
        previousStatus: statusChange.previousStatus,
        newStatus,
      });

      return order;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update order status:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, userId = null, reason = null) {
    try {
      const query = { _id: orderId };
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query).populate('userId', 'username email');
      
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      if (order.status === 'completed') {
        throw new ValidationError('Cannot cancel completed order');
      }

      if (order.status === 'cancelled') {
        throw new ValidationError('Order is already cancelled');
      }

      // Restore product stock
      await this.restoreProductStock(order.items);

      // Update order status
      await order.updateStatus('cancelled', reason);

      // Invalidate cache
      await invalidateCacheByTags(['orders', `user:${order.userId._id}:orders`]);

      // Send cancellation notification
      await notificationWorker.addNotificationJob('order-status-changed', {
        user: order.userId,
        order,
        previousStatus: order.status,
      });

      logger.info('Order cancelled', { orderId, userId, reason });
      return order;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * Restore product stock after order cancellation
   */
  async restoreProductStock(items) {
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.quantity } }
      );
    }
  }

  /**
   * Delete order (admin only)
   */
  async deleteOrder(orderId) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Restore product stock if order was not cancelled
      if (order.status !== 'cancelled') {
        await this.restoreProductStock(order.items);
      }

      await Order.findByIdAndDelete(orderId);

      // Invalidate cache
      await invalidateCacheByTags(['orders', `user:${order.userId}:orders`]);

      logger.info('Order deleted', { orderId });
      return { message: 'Order deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to delete order:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats() {
    try {
      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        monthlyRevenue
      ] = await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ status: 'processing' }),
        Order.countDocuments({ status: 'completed' }),
        Order.countDocuments({ status: 'cancelled' }),
        Order.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Order.aggregate([
          {
            $match: {
              status: 'completed',
              createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
            }
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]);

      const stats = {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        revenue: {
          total: totalRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0,
        },
      };

      logger.info('Order statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get order statistics:', error);
      throw error;
    }
  }
}
