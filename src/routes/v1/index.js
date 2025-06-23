import express from 'express';
import adminRoutes from './admin/index.js';
import appRoutes from './app/index.js';

const router = express.Router();

// Mount admin and app routes
router.use('/admin', adminRoutes);
router.use('/app', appRoutes);

export default router;
