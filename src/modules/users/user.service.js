import User from './user.model.js';
import { NotFoundError, ConflictError, ValidationError } from '../../core/error.js';
import { createQueryParser } from '../../utils/queryParser.js';
import logger from '../../core/logger.js';
import { invalidateCacheByTags } from '../../middlewares/cache.js';

export default class UserService {
  /**
   * Get paginated users with filtering and sorting
   */
  async getUsers(query) {
    try {
      const queryParser = createQueryParser(query);
      const result = await queryParser
        .filter()
        .sort()
        .select()
        .paginate()
        .execute(User);

      logger.info('Users retrieved', {
        count: result.data.length,
        total: result.pagination.total,
        page: result.pagination.page,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.isActive) {
        throw new NotFoundError('User is deactivated');
      }

      logger.info('User retrieved by ID', { userId });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      logger.info('User retrieved by email', { email });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get user by email:', error);
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username) {
    try {
      const user = await User.findByUsername(username);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      logger.info('User retrieved by username', { username });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get user by username:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        if (existingUser.email === userData.email) {
          throw new ConflictError('Email already exists');
        }
        if (existingUser.username === userData.username) {
          throw new ConflictError('Username already exists');
        }
      }

      const user = new User(userData);
      await user.save();

      // Invalidate users cache
      await invalidateCacheByTags(['users']);

      logger.info('User created successfully', {
        userId: user._id,
        username: user.username,
        email: user.email,
      });

      return user;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check for email/username conflicts if they're being updated
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findByEmail(updateData.email);
        if (existingUser && existingUser._id.toString() !== userId) {
          throw new ConflictError('Email already exists');
        }
      }

      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await User.findByUsername(updateData.username);
        if (existingUser && existingUser._id.toString() !== userId) {
          throw new ConflictError('Username already exists');
        }
      }

      // Don't allow password updates through this method
      delete updateData.password;

      Object.assign(user, updateData);
      await user.save();

      // Invalidate cache
      await invalidateCacheByTags(['users', `user:${userId}`]);

      logger.info('User updated successfully', {
        userId,
        updatedFields: Object.keys(updateData),
      });

      return user;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, profileData) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.profile = { ...user.profile, ...profileData };
      await user.save();

      // Invalidate cache
      await invalidateCacheByTags([`user:${userId}`]);

      logger.info('User profile updated successfully', { userId });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.preferences = { ...user.preferences, ...preferences };
      await user.save();

      // Invalidate cache
      await invalidateCacheByTags([`user:${userId}`]);

      logger.info('User preferences updated successfully', { userId });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens for security
      await user.clearRefreshTokens();

      logger.info('User password changed successfully', { userId });
      return { message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Failed to change user password:', error);
      throw error;
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.isActive = false;
      await user.save();

      // Clear refresh tokens
      await user.clearRefreshTokens();

      // Invalidate cache
      await invalidateCacheByTags(['users', `user:${userId}`]);

      logger.info('User deactivated successfully', { userId });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to deactivate user:', error);
      throw error;
    }
  }

  /**
   * Reactivate user
   */
  async reactivateUser(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.isActive = true;
      await user.save();

      // Invalidate cache
      await invalidateCacheByTags(['users', `user:${userId}`]);

      logger.info('User reactivated successfully', { userId });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to reactivate user:', error);
      throw error;
    }
  }

  /**
   * Delete user permanently
   */
  async deleteUser(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      await User.findByIdAndDelete(userId);

      // Invalidate cache
      await invalidateCacheByTags(['users', `user:${userId}`]);

      logger.info('User deleted permanently', { userId });
      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        recentUsers
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ role: 'admin', isActive: true }),
        User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
      ]);

      const stats = {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admin: adminUsers,
        recent: recentUsers,
        user: totalUsers - adminUsers,
      };

      logger.info('User statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get user statistics:', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(searchTerm, options = {}) {
    try {
      const { limit = 10, page = 1 } = options;
      const skip = (page - 1) * limit;

      const searchQuery = {
        $and: [
          { isActive: true },
          {
            $or: [
              { username: { $regex: searchTerm, $options: 'i' } },
              { email: { $regex: searchTerm, $options: 'i' } },
              { 'profile.firstName': { $regex: searchTerm, $options: 'i' } },
              { 'profile.lastName': { $regex: searchTerm, $options: 'i' } },
            ]
          }
        ]
      };

      const [users, total] = await Promise.all([
        User.find(searchQuery)
          .select('username email profile.firstName profile.lastName avatar role')
          .skip(skip)
          .limit(limit)
          .sort({ username: 1 }),
        User.countDocuments(searchQuery)
      ]);

      const result = {
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };

      logger.info('User search completed', {
        searchTerm,
        resultsCount: users.length,
        total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to search users:', error);
      throw error;
    }
  }

  /**
   * Get active users
   */
  async getActiveUsers() {
    try {
      const users = await User.findActiveUsers();
      return users;
    } catch (error) {
      logger.error('Failed to get active users:', error);
      throw error;
    }
  }

  /**
   * Get admin users
   */
  async getAdminUsers() {
    try {
      const users = await User.findAdmins();
      return users;
    } catch (error) {
      logger.error('Failed to get admin users:', error);
      throw error;
    }
  }
}
