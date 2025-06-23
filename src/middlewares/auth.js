import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AuthenticationError, AuthorizationError } from '../core/error.js';
import { sendUnauthorized, sendForbidden } from '../core/response.js';
import logger from '../core/logger.js';
import User from '../modules/users/user.model.js';

/**
 * Generate JWT tokens
 */
export const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

/**
 * Verify JWT token
 */
export const verifyToken = (token, secret = config.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    } else {
      throw new AuthenticationError('Token verification failed');
    }
  }
};

/**
 * Extract token from request headers
 */
export const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Authentication middleware
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return sendUnauthorized(res, 'Access token is required');
    }

    const decoded = verifyToken(token);
    
    // Fetch user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return sendUnauthorized(res, 'User not found');
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Account is deactivated');
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof AuthenticationError) {
      return sendUnauthorized(res, error.message);
    }
    
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id;
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue without user
    next();
  }
};

/**
 * Refresh token middleware
 */
export const refreshAuth = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return sendUnauthorized(res, 'Refresh token is required');
    }

    const decoded = verifyToken(refreshToken, config.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return sendUnauthorized(res, 'Invalid refresh token');
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    logger.error('Refresh token error:', error);
    return sendUnauthorized(res, 'Invalid refresh token');
  }
};
