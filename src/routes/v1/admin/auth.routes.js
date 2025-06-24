import express from 'express';
import AuthController from '../../../modules/auth/auth.controller.js';
import { authenticate, refreshAuth } from '../../../middlewares/auth.js';
import { validate, commonSchemas } from '../../../middlewares/validation.js';
import { asyncHandler } from '../../../middlewares/error.js';

const router = express.Router();
const authController = new AuthController();

// Register new user
router.post('/register',
  validate(commonSchemas.register),
  asyncHandler(authController.register.bind(authController))
);

// Login user
router.post('/login',
  validate(commonSchemas.login),
  asyncHandler(authController.login.bind(authController))
);

// Refresh access token
router.post('/refresh',
  validate(commonSchemas.refreshToken),
  refreshAuth,
  asyncHandler(authController.refreshToken.bind(authController))
);

// Logout user
router.post('/logout',
  authenticate,
  asyncHandler(authController.logout.bind(authController))
);

// Get current user profile
router.get('/profile',
  authenticate,
  asyncHandler(authController.getProfile.bind(authController))
);

// Update user profile
router.put('/profile',
  authenticate,
  validate(commonSchemas.updateUser),
  asyncHandler(authController.updateProfile.bind(authController))
);

// Change password
router.post('/change-password',
  authenticate,
  validate(commonSchemas.changePassword),
  asyncHandler(authController.changePassword.bind(authController))
);

export default router;
