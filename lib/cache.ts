import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string; // Cache version for invalidation
  background?: boolean; // Allow background refresh
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STALE_TIME = 2 * 60 * 1000; // 2 minutes

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  private generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `cache_${btoa(url + paramString)}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt;
  }

  private isStale(entry: CacheEntry<any>): boolean {
    return Date.now() > (entry.timestamp + this.STALE_TIME);
  }

  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = this.DEFAULT_TTL,
      version = '1',
      background = false,
      staleWhileRevalidate = true
    } = options;

    const cacheKey = this.generateKey(key, { version });
    const cached = this.memoryCache.get(cacheKey);

    // If we have valid cached data, return it
    if (cached && !this.isExpired(cached) && cached.version === version) {
      // If data is stale but not expired, maybe refresh in background
      if (staleWhileRevalidate && this.isStale(cached) && background) {
        this.refreshInBackground(cacheKey, fetcher, { ttl, version });
      }
      return cached.data;
    }

    // If we have stale data and staleWhileRevalidate is enabled, return stale data
    // while fetching fresh data
    if (cached && staleWhileRevalidate && cached.version === version) {
      this.refreshInBackground(cacheKey, fetcher, { ttl, version });
      return cached.data;
    }

    // Fetch fresh data
    try {
      const data = await fetcher();
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        version
      };
      
      this.memoryCache.set(cacheKey, entry);
      
      // Also cache in browser cache if possible
      if (typeof window !== 'undefined' && 'caches' in window) {
        this.cacheToBrowser(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      // If fetch fails and we have stale data, return stale data
      if (cached && cached.version === version) {
        logger.warn('Cache fetch failed, returning stale data', 'CACHE_MANAGER', { key });
        return cached.data;
      }
      throw error;
    }
  }

  private async refreshInBackground<T>(
    cacheKey: string, 
    fetcher: () => Promise<T>, 
    options: { ttl: number; version: string }
  ): Promise<void> {
    try {
      const data = await fetcher();
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + options.ttl,
        version: options.version
      };
      
      this.memoryCache.set(cacheKey, entry);
      logger.info('Background cache refresh successful', 'CACHE_MANAGER', { key: cacheKey });
    } catch (error) {
      logger.error('Background cache refresh failed', 'CACHE_MANAGER', { key: cacheKey }, error as Error);
    }
  }

  private async cacheToBrowser(key: string, data: any, ttl: number): Promise<void> {
    try {
      const cache = await caches.open('eyetask-api-v4');
      const response = new Response(JSON.stringify({
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${Math.floor(ttl / 1000)}`
        }
      });
      
      await cache.put(key, response);
    } catch (error) {
      logger.error('Failed to cache to browser', 'CACHE_MANAGER', { key }, error as Error);
    }
  }

  invalidate(key: string): void {
    const cacheKey = this.generateKey(key);
    this.memoryCache.delete(cacheKey);
    
    // Also invalidate browser cache
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.open('eyetask-api-v4').then(cache => {
        cache.delete(key);
      });
    }
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  clear(): void {
    this.memoryCache.clear();
    
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.delete('eyetask-api-v4');
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys())
    };
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Utility functions for common cache operations
export async function cachedFetch<T>(
  url: string, 
  options: RequestInit & CacheOptions = {}
): Promise<T> {
  const { ttl, version, background, staleWhileRevalidate, ...fetchOptions } = options;
  
  return cacheManager.get(
    url,
    async () => {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          ...fetchOptions.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    { ttl, version, background, staleWhileRevalidate }
  );
}

// Pre-warm cache with data
export function preWarmCache<T>(key: string, data: T, options: CacheOptions = {}): void {
  const { ttl = 5 * 60 * 1000, version = '1' } = options;
  const cacheKey = cacheManager['generateKey'](key, { version });
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
    version
  };
  
  cacheManager['memoryCache'].set(cacheKey, entry);
} 