import Redis from 'ioredis';
import { config } from './env.js';
import logger from '../core/logger.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
  }

  async connect() {
    try {
      const redisOptions = {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
        lazyConnect: true,
      };

      // Main client for general operations
      this.client = new Redis(config.REDIS_URL, {
        ...redisOptions,
        keyPrefix: 'app:',
      });

      // Separate clients for pub/sub
      this.subscriber = new Redis(config.REDIS_URL, redisOptions);
      this.publisher = new Redis(config.REDIS_URL, redisOptions);

      await this.client.connect();
      await this.subscriber.connect();
      await this.publisher.connect();

      logger.info('Redis connected successfully');

      // Handle connection events
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis client disconnected');
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    if (this.publisher) {
      await this.publisher.quit();
    }
  }

  getClient() {
    return this.client;
  }

  getSubscriber() {
    return this.subscriber;
  }

  getPublisher() {
    return this.publisher;
  }

  // Cache helper methods
  async get(key) {
    try {
      const value = await this.client.get(key);
      console.log(`Redis get: ${key}`, value);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      console.log(`Redis set: ${key}`, serialized);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      console.log(`Redis del: ${key}`);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      console.log(`Redis exists: ${key}`);
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }
}

export default new RedisClient();
