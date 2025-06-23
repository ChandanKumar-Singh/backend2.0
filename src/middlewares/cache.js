import redisClient from '../config/redis.js';
import logger from '../core/logger.js';
import { config } from '../config/env.js';

/**
 * Cache middleware factory
 */
export const cache = (options = {}) => {
  const {
    ttl = 3600, // 1 hour default
    keyGenerator = null,
    condition = null,
    compress = false,
  } = options;

  return async (req, res, next) => {
    // Skip caching in development if specified
    if (config.NODE_ENV === 'development' && options.skipInDev) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req) 
        : generateDefaultCacheKey(req);

      // Check condition if provided
      if (condition && !condition(req)) {
        return next();
      }

      // Try to get cached response
      const cachedResponse = await redisClient.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Cache hit', { key: cacheKey });
        
        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
        });

        return res.json(cachedResponse);
      }

      logger.debug('Cache miss', { key: cacheKey });

      // Store original res.json
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response
        redisClient.set(cacheKey, data, ttl)
          .catch(error => {
            logger.error('Cache set error:', error);
          });

        // Set cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
        });

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Generate default cache key
 */
const generateDefaultCacheKey = (req) => {
  const { method, originalUrl, user } = req;
  const userId = user ? user._id.toString() : 'anonymous';
  
  // Include relevant query parameters in key
  const queryString = Object.keys(req.query)
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join('&');

  return `${method}:${originalUrl}:${userId}:${queryString}`;
};

/**
 * Cache invalidation helpers
 */
export const invalidateCache = async (pattern) => {
  try {
    const keys = await redisClient.getClient().keys(`app:${pattern}`);
    
    if (keys.length > 0) {
      // Remove the prefix from keys before deleting
      const keysWithoutPrefix = keys.map(key => key.replace('app:', ''));
      await redisClient.getClient().del(...keysWithoutPrefix);
      logger.info('Cache invalidated', { pattern, count: keys.length });
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
};

/**
 * Invalidate cache by tags
 */
export const invalidateCacheByTags = async (tags) => {
  if (!Array.isArray(tags)) {
    tags = [tags];
  }

  for (const tag of tags) {
    await invalidateCache(`*:${tag}:*`);
  }
};

/**
 * User-specific cache
 */
export const userCache = (ttl = 3600) => {
  return cache({
    ttl,
    keyGenerator: (req) => {
      const userId = req.user ? req.user._id.toString() : 'anonymous';
      return `user:${userId}:${req.method}:${req.originalUrl}`;
    },
    condition: (req) => req.user !== undefined,
  });
};

/**
 * Public cache (no user context)
 */
export const publicCache = (ttl = 3600) => {
  return cache({
    ttl,
    keyGenerator: (req) => `public:${req.method}:${req.originalUrl}`,
  });
};

/**
 * Admin cache (admin-specific data)
 */
export const adminCache = (ttl = 1800) => {
  return cache({
    ttl,
    keyGenerator: (req) => `admin:${req.method}:${req.originalUrl}`,
    condition: (req) => req.user && req.user.role === 'admin',
  });
};

/**
 * Cache warming utility
 */
export const warmCache = async (key, data, ttl = 3600) => {
  try {
    await redisClient.set(key, data, ttl);
    logger.info('Cache warmed', { key });
  } catch (error) {
    logger.error('Cache warming error:', error);
  }
};

/**
 * Cache statistics
 */
export const getCacheStats = async () => {
  try {
    const info = await redisClient.getClient().info('memory');
    const keyspace = await redisClient.getClient().info('keyspace');
    
    return {
      memory: info,
      keyspace: keyspace,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Cache stats error:', error);
    return null;
  }
};
