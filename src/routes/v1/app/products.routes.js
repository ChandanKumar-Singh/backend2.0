import express from 'express';
import ProductController from '../../../modules/products/product.controller.js';
import { authenticate, optionalAuth } from '../../../middlewares/auth.js';
import { validate, validateObjectId, validatePagination, commonSchemas } from '../../../middlewares/validation.js';
import { publicCache, userCache } from '../../../middlewares/cache.js';
import { asyncHandler } from '../../../middlewares/error.js';

const router = express.Router();
const productController = new ProductController();

// Get all products (public endpoint with optional auth)
router.get('/',
  optionalAuth,
  // validatePagination,
  publicCache(1800), // 30 minutes cache
  asyncHandler(productController.getProducts.bind(productController))
);

// Get product by ID (public endpoint)
router.get('/:id',
  validateObjectId('id'),
  publicCache(3600), // 1 hour cache
  asyncHandler(productController.getProductById.bind(productController))
);

// Create new product (authenticated users only)
router.post('/',
  authenticate,
  validate(commonSchemas.createProduct),
  asyncHandler(productController.createProduct.bind(productController))
);

// Update product (authenticated users only)
router.put('/:id',
  authenticate,
  validateObjectId('id'),
  validate(commonSchemas.updateProduct),
  asyncHandler(productController.updateProduct.bind(productController))
);

// Delete product (authenticated users only)
router.delete('/:id',
  authenticate,
  validateObjectId('id'),
  asyncHandler(productController.deleteProduct.bind(productController))
);

export default router;
