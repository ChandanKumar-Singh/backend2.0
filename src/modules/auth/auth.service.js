import User from '../users/user.model.js';
import { generateTokens } from '../../middlewares/auth.js';
import { AuthenticationError, NotFoundError } from '../../core/error.js';
import logger from '../../core/logger.js';
import { notificationWorker } from '../../jobs/notificationWorker.js';

export default class AuthService {
  /**
   * Login user with email and password
   */
  async login(email, password) {
    try {
      // Find user by email and include password
      const user = await User.findByEmail(email).select('+password');
      
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Generate tokens
      const tokens = generateTokens({ userId: user._id, role: user.role });

      // Store refresh token
      await user.addRefreshToken(tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      // Update last login
      await user.updateLastLogin();

      // Send login alert notification
      await notificationWorker.addNotificationJob('user-login-alert', {
        user,
        loginInfo: {
          ip: '127.0.0.1', // This would come from request in real implementation
          userAgent: 'Browser', // This would come from request in real implementation
          timestamp: new Date(),
        },
      });

      // Remove password from response
      const userResponse = user.toJSON();

      logger.info('User login successful', {
        userId: user._id,
        email: user.email,
      });

      return {
        user: userResponse,
        tokens,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(refreshToken) {
    try {
      const user = await User.findOne({
        'refreshTokens.token': refreshToken,
        'refreshTokens.expiresAt': { $gt: new Date() },
      });

      if (!user) {
        throw new AuthenticationError('Invalid refresh token');
      }

      if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      return user;
    } catch (error) {
      logger.error('Refresh token verification failed:', error);
      throw error;
    }
  }

  /**
   * Logout user (remove refresh token)
   */
  async logout(userId, refreshToken) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (refreshToken) {
        await user.removeRefreshToken(refreshToken);
      }

      logger.info('User logout successful', { userId });
      return { message: 'Logout successful' };
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email) {
    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetTokenExpiry;
      await user.save();

      // Send password reset notification
      await notificationWorker.addNotificationJob('password-reset-requested', {
        user,
        resetToken,
      });

      logger.info('Password reset token generated', { userId: user._id });
      return { message: 'Password reset token sent to email' };
    } catch (error) {
      logger.error('Password reset token generation failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    try {
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      
      // Clear all refresh tokens for security
      await user.clearRefreshTokens();
      
      await user.save();

      logger.info('Password reset successful', { userId: user._id });
      return { message: 'Password reset successful' };
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }
}
