import express from 'express';
import { authenticate, requireAdmin } from '../../../middlewares/auth.js';
import usersRoutes from './users.routes.js';
import ordersRoutes from './orders.routes.js';

const router = express.Router();

// Apply authentication and admin role requirement to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// Mount admin routes
router.use('/users', usersRoutes);
router.use('/orders', ordersRoutes);

export default router;
