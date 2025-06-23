import AuthService from './auth.service.js';
import UserService from '../users/user.service.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../core/response.js';
import { asyncHandler } from '../../middlewares/error.js';
import { generateTokens } from '../../middlewares/auth.js';
import logger from '../../core/logger.js';
import { notificationWorker } from '../../jobs/notificationWorker.js';

export default class AuthController {
  constructor() {
    this.authService = new AuthService();
    this.userService = new UserService();
  }

  /**
   * Register new user
   */
  async register(req, res) {
    const userData = req.body;
    
    const user = await this.userService.createUser(userData);
    const tokens = generateTokens({ userId: user._id, role: user.role });
    
    // Store refresh token
    await user.addRefreshToken(tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    // Send welcome notification
    await notificationWorker.addNotificationJob('user-registered', { user });
    
    logger.info('User registered successfully', {
      userId: user._id,
      email: user.email,
    });
    
    sendCreated(res, 'User registered successfully', {
      user,
      tokens,
    });
  }

  /**
   * Login user
   */
  async login(req, res) {
    const { email, password } = req.body;
    
    const result = await this.authService.login(email, password);
    
    logger.info('User logged in successfully', {
      userId: result.user._id,
      email: result.user.email,
    });
    
    sendSuccess(res, 'Login successful', result);
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    const user = req.user;
    
    const tokens = generateTokens({ userId: user._id, role: user.role });
    
    // Update refresh token
    await user.removeRefreshToken(req.body.refreshToken);
    await user.addRefreshToken(tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    sendSuccess(res, 'Token refreshed successfully', { tokens });
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await req.user.removeRefreshToken(refreshToken);
    }
    
    logger.info('User logged out', { userId: req.user._id });
    
    sendSuccess(res, 'Logout successful');
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    const user = req.user;
    sendSuccess(res, 'Profile retrieved successfully', user);
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    const userId = req.user._id;
    const updateData = req.body;
    
    const user = await this.userService.updateUser(userId, updateData);
    
    sendSuccess(res, 'Profile updated successfully', user);
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;
    
    const result = await this.userService.changePassword(userId, currentPassword, newPassword);
    
    sendSuccess(res, result.message);
  }
}
