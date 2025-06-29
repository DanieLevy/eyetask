import { logger } from './logger';
import { deduplicatedFetch } from './request-deduplication';

export interface CacheOptions {
  ttl?: number;
  namespace?: string;
}

interface CacheItem<T> {
  value: T;
  expiry?: number;
  namespace?: string;
  createdAt: number;
}

/**
 * Simple in-memory cache with TTL support
 */
class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private lastCleanup: number = Date.now();
  private readonly cleanupInterval: number = 60 * 1000; // Cleanup every minute
  private hitCount: number = 0;
  private missCount: number = 0;
  private namespaces: Set<string> = new Set();

  constructor() {
    // Periodically clean up expired cache items
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), this.cleanupInterval);
    }
  }

  /**
   * Generate a unique cache key
   */
  private generateKey(key: string, options?: CacheOptions): string {
    const namespace = options?.namespace ? `${options.namespace}:` : '';
    return `${namespace}${key}`;
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string, options?: CacheOptions): T | undefined {
    const cacheKey = this.generateKey(key, options);
    const item = this.cache.get(cacheKey);

    // Check if item exists and is not expired
    if (item) {
      if (item.expiry && item.expiry < Date.now()) {
        // Item is expired, delete it
        this.cache.delete(cacheKey);
        this.missCount++;
        logger.debug(`Cache expired: ${cacheKey}`, 'CACHE');
        return undefined;
      }

      this.hitCount++;
      logger.debug(`Cache hit: ${cacheKey}`, 'CACHE', {
        hitRatio: this.getHitRatio(),
        ttl: item.expiry ? Math.round((item.expiry - Date.now()) / 1000) + 's remaining' : 'indefinite'
      });
      
      return item.value as T;
    }

    this.missCount++;
    logger.debug(`Cache miss: ${cacheKey}`, 'CACHE', {
      hitRatio: this.getHitRatio()
    });
    return undefined;
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set<T>(key: string, value: T, options?: CacheOptions): void {
    const cacheKey = this.generateKey(key, options);
    const namespace = options?.namespace;
    
    // Store the namespace if provided
    if (namespace) {
      this.namespaces.add(namespace);
    }
    
    let expiry: number | undefined;
    
    if (options?.ttl) {
      expiry = Date.now() + options.ttl;
    }
    
    this.cache.set(cacheKey, {
      value,
      expiry,
      namespace,
      createdAt: Date.now()
    });
    
    logger.debug(`Cache set: ${cacheKey}`, 'CACHE', {
      ttl: options?.ttl ? `${Math.round(options.ttl / 1000)}s` : 'indefinite',
      namespace: options?.namespace
    });
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string, options?: CacheOptions): boolean {
    const cacheKey = this.generateKey(key, options);
    const result = this.cache.delete(cacheKey);
    
    if (result) {
      logger.debug(`Cache deleted: ${cacheKey}`, 'CACHE');
    }
    
    return result;
  }

  /**
   * Clear all values from the cache, or those in a namespace
   * Returns the number of entries cleared
   */
  clear(namespace?: string): number {
    if (!namespace) {
      const count = this.cache.size;
      this.cache.clear();
      logger.info(`Cache cleared (${count} entries)`, 'CACHE');
      return count;
    }
    
    // Clear only the namespace
    let count = 0;
    const nsPrefix = `${namespace}:`;
    
    // Collect keys to delete to avoid modifying during iteration
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (key.startsWith(nsPrefix) || item.namespace === namespace) {
        keysToDelete.push(key);
      }
    });
    
    // Delete the collected keys
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      count++;
    });
    
    // Remove namespace from tracking if all entries removed
    if (count > 0 && this.namespaces.has(namespace)) {
      let hasMoreItems = false;
      this.cache.forEach(item => {
        if (item.namespace === namespace) {
          hasMoreItems = true;
        }
      });
      
      if (!hasMoreItems) {
        this.namespaces.delete(namespace);
      }
    }
    
    logger.info(`Cache namespace cleared: ${namespace} (${count} entries)`, 'CACHE');
    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): Record<string, any> {
    const namespaces: Record<string, number> = {};
    const age: Record<string, number> = {};
    
    // Count items per namespace and age distribution
    this.cache.forEach((item, key) => {
      const ns = item.namespace || 'default';
      namespaces[ns] = (namespaces[ns] || 0) + 1;
      
      const itemAge = Math.round((Date.now() - item.createdAt) / 1000);
      if (itemAge < 60) { // < 1 minute
        age['< 1min'] = (age['< 1min'] || 0) + 1;
      } else if (itemAge < 300) { // < 5 minutes
        age['< 5min'] = (age['< 5min'] || 0) + 1;
      } else if (itemAge < 3600) { // < 1 hour
        age['< 1hr'] = (age['< 1hr'] || 0) + 1;
      } else {
        age['> 1hr'] = (age['> 1hr'] || 0) + 1;
      }
    });
    
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRatio: this.getHitRatio(true),
      namespaces,
      ageDistribution: age
    };
  }
  
  /**
   * Get a list of all namespaces in the cache
   */
  getNamespaces(): string[] {
    return Array.from(this.namespaces);
  }

  /**
   * Calculate the cache hit ratio
   */
  private getHitRatio(asNumber = false): string | number {
    const total = this.hitCount + this.missCount;
    if (total === 0) return asNumber ? 0 : '0%';
    const ratio = this.hitCount / total;
    return asNumber ? ratio : `${(ratio * 100).toFixed(2)}%`;
  }

  /**
   * Clean up expired cache items
   */
  private cleanup(): void {
    const now = Date.now();
    let count = 0;
    
    this.cache.forEach((item, key) => {
      if (item.expiry && item.expiry < now) {
        this.cache.delete(key);
        count++;
      }
    });
    
    if (count > 0) {
      logger.debug(`Cache cleanup: removed ${count} expired items`, 'CACHE');
    }
    
    this.lastCleanup = now;
  }

  /**
   * Get or set a value from/to the cache with automatic fetching on miss
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = this.get<T>(key, options);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // Cache miss, fetch the data
    try {
      const value = await fetchFn();
      this.set(key, value, options);
      return value;
    } catch (error) {
      logger.error(`Cache fetch error for key: ${key}`, 'CACHE', { error: (error as Error).message });
      throw error;
    }
  }
}

// Create a singleton instance
export const cache = new MemoryCache();

/**
 * Fetch data from an API with caching
 */
export async function fetchWithCache<T>(
  url: string,
  options: RequestInit & CacheOptions = {}
): Promise<T> {
  const { ttl, namespace, ...fetchOptions } = options;
  
  return cache.getOrSet<T>(
    url,
    async () => {
      const response = await deduplicatedFetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    },
    { ttl, namespace }
  );
}

/**
 * Preload data into cache
 */
export async function preloadCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: CacheOptions
): Promise<void> {
  try {
    const value = await fetchFn();
    cache.set(key, value, options);
    logger.info(`Cache preloaded: ${key}`, 'CACHE', { namespace: options?.namespace });
  } catch (error) {
    logger.error(`Cache preload error for key: ${key}`, 'CACHE', { error: (error as Error).message });
  }
}

/**
 * Invalidate a cache entry
 */
export function invalidateCache(key: string, options?: CacheOptions): void {
  cache.delete(key, options);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

export default {
  cache,
  fetchWithCache,
  preloadCache,
  invalidateCache,
  getCacheStats
}; 