import express from 'express';
import UserController from '../../../modules/users/user.controller.js';
import { validate, validateObjectId, validatePagination, commonSchemas } from '../../../middlewares/validation.js';
import { adminCache } from '../../../middlewares/cache.js';
import { asyncHandler } from '../../../middlewares/error.js';

const router = express.Router();
const userController = new UserController();

// Get all users with pagination and filtering
router.get('/',
  adminCache(1800), // 30 minutes cache
  asyncHandler(userController.getUsers.bind(userController))
);

// Get user statistics
router.get('/stats',
  adminCache(900), // 15 minutes cache
  asyncHandler(userController.getUserStats.bind(userController))
);

// Search users
router.get('/search',
  validate(commonSchemas.pagination, 'query'),
  asyncHandler(userController.searchUsers.bind(userController))
);

// Get user by ID
router.get('/:id',
  validateObjectId('id'),
  asyncHandler(userController.getUserById.bind(userController))
);

// Create new user
router.post('/',
  validate(commonSchemas.createUser),
  asyncHandler(userController.createUser.bind(userController))
);

// Update user
router.put('/:id',
  validateObjectId('id'),
  validate(commonSchemas.updateUser),
  asyncHandler(userController.updateUser.bind(userController))
);

// Deactivate user
router.patch('/:id/deactivate',
  validateObjectId('id'),
  asyncHandler(userController.deactivateUser.bind(userController))
);

// Reactivate user
router.patch('/:id/reactivate',
  validateObjectId('id'),
  asyncHandler(userController.reactivateUser.bind(userController))
);

// Delete user permanently
router.delete('/:id',
  validateObjectId('id'),
  asyncHandler(userController.deleteUser.bind(userController))
);

export default router;
