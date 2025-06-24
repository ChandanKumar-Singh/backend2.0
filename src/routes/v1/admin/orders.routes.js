import express from 'express';
import OrderController from '../../../modules/orders/order.controller.js';
import { validate, validateObjectId, validatePagination, commonSchemas } from '../../../middlewares/validation.js';
import { adminCache } from '../../../middlewares/cache.js';
import { asyncHandler } from '../../../middlewares/error.js';

const router = express.Router();
const orderController = new OrderController();

// Get all orders with pagination and filtering
router.get('/',
  // validatePagination,
  adminCache(600), // 10 minutes cache
  asyncHandler(orderController.getAllOrders.bind(orderController))
);

// Get order statistics
router.get('/stats',
  adminCache(900), // 15 minutes cache
  asyncHandler(orderController.getOrderStats.bind(orderController))
);

// Get order by ID
router.get('/:id',
  validateObjectId('id'),
  asyncHandler(orderController.getOrderById.bind(orderController))
);

// Update order status
router.patch('/:id/status',
  validateObjectId('id'),
  validate(commonSchemas.updateOrder),
  asyncHandler(orderController.updateOrderStatus.bind(orderController))
);

// Delete order
router.delete('/:id',
  validateObjectId('id'),
  asyncHandler(orderController.deleteOrder.bind(orderController))
);

export default router;
