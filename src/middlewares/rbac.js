import { AuthorizationError } from '../core/error.js';
import { sendForbidden } from '../core/response.js';
import logger from '../core/logger.js';

/**
 * Role definitions and permissions
 */
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

export const PERMISSIONS = {
  // User permissions
  READ_USERS: 'read:users',
  CREATE_USERS: 'create:users',
  UPDATE_USERS: 'update:users',
  DELETE_USERS: 'delete:users',

  // Product permissions
  READ_PRODUCTS: 'read:products',
  CREATE_PRODUCTS: 'create:products',
  UPDATE_PRODUCTS: 'update:products',
  DELETE_PRODUCTS: 'delete:products',

  // Order permissions
  READ_ORDERS: 'read:orders',
  CREATE_ORDERS: 'create:orders',
  UPDATE_ORDERS: 'update:orders',
  DELETE_ORDERS: 'delete:orders',
  READ_ALL_ORDERS: 'read:all_orders',

  // Notification permissions
  READ_NOTIFICATIONS: 'read:notifications',
  CREATE_NOTIFICATIONS: 'create:notifications',
  UPDATE_NOTIFICATIONS: 'update:notifications',
  DELETE_NOTIFICATIONS: 'delete:notifications',
};

/**
 * Role-permission mapping
 */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Full access to everything
    PERMISSIONS.READ_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.UPDATE_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.READ_PRODUCTS,
    PERMISSIONS.CREATE_PRODUCTS,
    PERMISSIONS.UPDATE_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS,
    PERMISSIONS.READ_ORDERS,
    PERMISSIONS.CREATE_ORDERS,
    PERMISSIONS.UPDATE_ORDERS,
    PERMISSIONS.DELETE_ORDERS,
    PERMISSIONS.READ_ALL_ORDERS,
    PERMISSIONS.READ_NOTIFICATIONS,
    PERMISSIONS.CREATE_NOTIFICATIONS,
    PERMISSIONS.UPDATE_NOTIFICATIONS,
    PERMISSIONS.DELETE_NOTIFICATIONS,
  ],
  [ROLES.USER]: [
    // Limited access
    PERMISSIONS.READ_PRODUCTS,
    PERMISSIONS.READ_ORDERS, // Only their own orders
    PERMISSIONS.CREATE_ORDERS,
    PERMISSIONS.READ_NOTIFICATIONS, // Only their own notifications
  ],
};

/**
 * Get user permissions based on role
 */
export const getUserPermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (userRole, permission) => {
  const permissions = getUserPermissions(userRole);
  return permissions.includes(permission);
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return sendForbidden(res, 'Authentication required');
      }

      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn('Access denied - insufficient role', {
          userId: req.user._id,
          userRole,
          requiredRoles: allowedRoles,
          endpoint: req.originalUrl,
        });
        
        return sendForbidden(res, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      logger.error('RBAC error:', error);
      return sendForbidden(res, 'Authorization failed');
    }
  };
};

/**
 * Permission-based access control middleware
 */
export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return sendForbidden(res, 'Authentication required');
      }

      const userRole = req.user.role;
      const userPermissions = getUserPermissions(userRole);

      const hasRequiredPermission = requiredPermissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasRequiredPermission) {
        logger.warn('Access denied - insufficient permissions', {
          userId: req.user._id,
          userRole,
          userPermissions,
          requiredPermissions,
          endpoint: req.originalUrl,
        });
        
        return sendForbidden(res, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return sendForbidden(res, 'Authorization failed');
    }
  };
};

/**
 * Admin only middleware
 */
export const requireAdmin = requireRole(ROLES.ADMIN);

/**
 * Resource ownership middleware (for users accessing their own resources)
 */
export const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return sendForbidden(res, 'Authentication required');
      }

      const userRole = req.user.role;
      const userId = req.user._id.toString();

      // Admins can access any resource
      if (userRole === ROLES.ADMIN) {
        return next();
      }

      // Get resource user ID from request params, body, or query
      const resourceUserId = req.params[resourceUserIdField] || 
                           req.body[resourceUserIdField] || 
                           req.query[resourceUserIdField];

      if (!resourceUserId) {
        return sendForbidden(res, 'Resource ownership cannot be determined');
      }

      // Check if user owns the resource
      if (resourceUserId.toString() !== userId) {
        logger.warn('Access denied - resource ownership violation', {
          userId,
          resourceUserId,
          endpoint: req.originalUrl,
        });
        
        return sendForbidden(res, 'You can only access your own resources');
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return sendForbidden(res, 'Authorization failed');
    }
  };
};
