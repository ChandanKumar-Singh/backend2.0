import express from 'express';
import authRoutes from './auth.routes.js';
import productsRoutes from './products.routes.js';

const router = express.Router();

// Mount app routes
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);

export default router;
