import UserService from './user.service.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../core/response.js';
import logger from '../../core/logger.js';

export default class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(req, res) {
    const result = await this.userService.getUsers(req.query);
    sendSuccess(res, 'Users retrieved successfully', result.data, {
      pagination: result.pagination,
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(req, res) {
    const { id } = req.params;
    const user = await this.userService.getUserById(id);
    sendSuccess(res, 'User retrieved successfully', user);
  }

  /**
   * Create new user
   */
  async createUser(req, res) {
    const userData = req.body;
    const user = await this.userService.createUser(userData);
    sendCreated(res, 'User created successfully', user);
  }

  /**
   * Update user
   */
  async updateUser(req, res) {
    const { id } = req.params;
    const updateData = req.body;
    const user = await this.userService.updateUser(id, updateData);
    sendSuccess(res, 'User updated successfully', user);
  }

  /**
   * Deactivate user
   */
  async deactivateUser(req, res) {
    const { id } = req.params;
    const user = await this.userService.deactivateUser(id);
    sendSuccess(res, 'User deactivated successfully', user);
  }

  /**
   * Reactivate user
   */
  async reactivateUser(req, res) {
    const { id } = req.params;
    const user = await this.userService.reactivateUser(id);
    sendSuccess(res, 'User reactivated successfully', user);
  }

  /**
   * Delete user permanently
   */
  async deleteUser(req, res) {
    const { id } = req.params;
    const result = await this.userService.deleteUser(id);
    sendSuccess(res, result.message);
  }

  /**
   * Get user statistics
   */
  async getUserStats(req, res) {
    const stats = await this.userService.getUserStats();
    sendSuccess(res, 'User statistics retrieved successfully', stats);
  }

  /**
   * Search users
   */
  async searchUsers(req, res) {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      return sendBadRequest(res, 'Search term is required');
    }

    const result = await this.userService.searchUsers(searchTerm, req.query);
    sendSuccess(res, 'User search completed', result.data, {
      pagination: result.pagination,
    });
  }
}
