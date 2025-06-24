import Joi from 'joi';
import { ValidationError } from '../core/error.js';
import { sendBadRequest } from '../core/response.js';
import logger from '../core/logger.js';

/**
 * Validation middleware factory
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value,
        }));

        logger.warn('Validation error', {
          property,
          errors,
          originalValue: req[property],
        });

        return sendBadRequest(res, 'Validation failed', errors);
      }

      // Replace the original data with validated and sanitized data
      req[property] = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return sendBadRequest(res, 'Validation error occurred');
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // MongoDB ObjectId
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ObjectId format'),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string().optional(),
    fields: Joi.string().optional(),
  }),

  // User schemas
  createUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      }),
    role: Joi.string().valid('user', 'admin').default('user'),
  }),

  updateUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid('user', 'admin').optional(),
    isActive: Joi.boolean().optional(),
  }),

  // Auth schemas
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      }),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      }),
  }),

  // Product schemas
  createProduct: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    description: Joi.string().trim().max(1000).optional(),
    price: Joi.number().positive().precision(2).required(),
    category: Joi.string().trim().min(1).max(100).required(),
    stock: Joi.number().integer().min(0).default(0),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
  }),

  updateProduct: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    description: Joi.string().trim().max(1000).optional(),
    price: Joi.number().positive().precision(2).optional(),
    category: Joi.string().trim().min(1).max(100).optional(),
    stock: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
  }),

  // Order schemas
  createOrder: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().positive().precision(2).required(),
      })
    ).min(1).required(),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
    }).optional(),
  }),

  updateOrder: Joi.object({
    status: Joi.string().valid('pending', 'processing', 'completed', 'cancelled').optional(),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
    }).optional(),
  }),

  // Notification schemas
  createNotification: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    title: Joi.string().trim().min(1).max(255).required(),
    message: Joi.string().trim().min(1).max(1000).required(),
    type: Joi.string().valid('info', 'success', 'warning', 'error').default('info'),
  }),

  updateNotification: Joi.object({
    isRead: Joi.boolean().required(),
  }),
};

/**
 * Param validation middleware
 */
export const validateParam = (paramName, schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params[paramName]);
    
    if (error) {
      return sendBadRequest(res, `Invalid ${paramName}: ${error.details[0].message}`);
    }
    
    req.params[paramName] = value;
    next();
  };
};

/**
 * Query validation middleware
 */
export const validateQuery = (schema) => {
  return validate(schema, 'query');
};

/**
 * Common parameter validators
 */
export const validateObjectId = (paramName = 'id') => 
  validateParam(paramName, commonSchemas.objectId);

export const validatePagination = validateQuery(commonSchemas.pagination);
