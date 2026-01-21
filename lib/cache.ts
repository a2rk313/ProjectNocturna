import { Redis } from 'ioredis';

// Simple in-memory cache for development
class InMemoryCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number = 3600): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Redis cache implementation (for production)
class RedisCache {
  private redis: Redis | null = null;

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }
}

// Unified cache interface
class CacheManager {
  private inMemoryCache: InMemoryCache = new InMemoryCache();
  private redisCache: RedisCache = new RedisCache();

  async get<T>(key: string): Promise<T | null> {
    // Try in-memory cache first
    const memoryValue = this.inMemoryCache.get<T>(key);
    if (memoryValue !== null) {
      return memoryValue;
    }

    // Fall back to Redis
    const redisValue = await this.redisCache.get<T>(key);
    if (redisValue !== null) {
      // Populate in-memory cache for future requests
      this.inMemoryCache.set(key, redisValue);
    }
    return redisValue;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    // Set in both caches
    this.inMemoryCache.set(key, value, ttlSeconds);
    await this.redisCache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    this.inMemoryCache.delete(key);
    await this.redisCache.delete(key);
  }

  // Convenience methods for common cache patterns
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  // Specific cache methods for common data types
  async getGeospatialData(key: string): Promise<any | null> {
    return this.get<any>(`geospatial:${key}`);
  }

  async setGeospatialData(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    await this.set(`geospatial:${key}`, data, ttlSeconds);
  }

  async getAnalysisResult(key: string): Promise<any | null> {
    return this.get<any>(`analysis:${key}`);
  }

  async setAnalysisResult(key: string, data: any, ttlSeconds: number = 7200): Promise<void> {
    await this.set(`analysis:${key}`, data, ttlSeconds);
  }
}

export const cacheManager = new CacheManager();

export default cacheManager;