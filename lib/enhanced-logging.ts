import { logger } from './logger';
import { MongoClient } from 'mongodb';
import { monitorMemory } from './memory-monitor';

// Performance measurement utilities
export class PerformanceTracker {
  private startTime: number;
  private lastCheckpoint: number;
  private checkpoints: Record<string, number> = {};
  private context: string;
  private operation: string;

  constructor(context: string, operation: string) {
    this.startTime = performance.now();
    this.lastCheckpoint = this.startTime;
    this.context = context;
    this.operation = operation;
    
    // Log start of operation
    logger.info(`Starting operation: ${operation}`, context, {
      timestamp: new Date().toISOString(),
      operation
    });
  }

  checkpoint(name: string): number {
    const now = performance.now();
    const timeSinceStart = now - this.startTime;
    const timeSinceLastCheckpoint = now - this.lastCheckpoint;
    
    this.checkpoints[name] = timeSinceLastCheckpoint;
    this.lastCheckpoint = now;
    
    // Log checkpoint
    logger.debug(`Checkpoint: ${name}`, this.context, {
      operation: this.operation,
      checkpoint: name,
      timeSinceStart: `${timeSinceStart.toFixed(2)}ms`,
      timeSinceLastCheckpoint: `${timeSinceLastCheckpoint.toFixed(2)}ms`
    });
    
    return timeSinceLastCheckpoint;
  }

  finish(includeData: Record<string, any> = {}): Record<string, any> {
    const totalTime = performance.now() - this.startTime;
    
    const result = {
      operation: this.operation,
      totalTime: `${totalTime.toFixed(2)}ms`,
      checkpoints: Object.entries(this.checkpoints).map(([name, time]) => ({
        name,
        time: `${time.toFixed(2)}ms`,
        percentage: `${((time / totalTime) * 100).toFixed(1)}%`
      })),
      ...includeData
    };
    
    // Log completion
    logger.info(`Completed operation: ${this.operation} (took ${totalTime.toFixed(2)}ms)`, this.context, result);
    
    return result;
  }
}

// MongoDB connection monitoring
export function logMongoConnectionDetails(client: MongoClient, context: string = 'MONGODB_CONNECTIONS') {
  try {
    // Check if client has topology property (internal implementation detail, might change)
    if (client && (client as any).topology) {
      const topology = (client as any).topology;
      
      // Get connection pool information if available
      const poolSize = topology.s?.pool?.size || 'unknown';
      const checkedOut = topology.s?.pool?.checkedOut || 'unknown';
      const maxPoolSize = topology.s?.options?.maxPoolSize || 'unknown';
      const minPoolSize = topology.s?.options?.minPoolSize || 'unknown';
      const waitQueueSize = topology.s?.pool?.waitQueueSize || 'unknown';
      
      logger.info('MongoDB connection pool details', context, {
        poolSize,
        checkedOut,
        available: poolSize - checkedOut,
        maxPoolSize,
        minPoolSize,
        waitQueueSize,
        utilizationPercentage: maxPoolSize ? `${((checkedOut / maxPoolSize) * 100).toFixed(1)}%` : 'unknown',
        serverConnectionId: topology.s?.id || 'unknown'
      });
    } else {
      logger.warn('Could not access MongoDB topology details', context);
    }
  } catch (error) {
    logger.error('Error logging MongoDB connection details', context, undefined, error as Error);
  }
}

// Query profiling
export async function profileQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  context: string = 'QUERY_PROFILE'
): Promise<T> {
  const tracker = new PerformanceTracker(context, queryName);
  
  try {
    // Execute the query
    const result = await queryFn();
    
    // Log success with timing information
    const resultSize = JSON.stringify(result).length;
    tracker.finish({
      resultSize: `${(resultSize / 1024).toFixed(2)} KB`,
      success: true
    });
    
    return result;
  } catch (error) {
    // Log error with timing information
    tracker.finish({
      error: (error as Error).message,
      success: false
    });
    
    throw error;
  }
}

// Enhanced memory usage logging
export function logMemoryUsage(context: string = 'MEMORY_USAGE') {
  try {
    // Use the new memory monitor to track and analyze memory usage
    const snapshot = monitorMemory(true);
    
    // No need to log here as monitorMemory does that when forceLog=true
  } catch (error) {
    logger.error('Error logging memory usage', context, undefined, error as Error);
  }
}

// Cache monitoring
export class CacheMonitor {
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private cacheErrors: number = 0;
  private context: string;
  
  constructor(context: string = 'CACHE_MONITOR') {
    this.context = context;
  }
  
  recordHit(key: string, ttlRemaining?: string): void {
    this.cacheHits++;
    logger.debug(`Cache hit: ${key}`, this.context, {
      key,
      hitRatio: this.getHitRatio(),
      ttl: ttlRemaining ? `${ttlRemaining} remaining` : undefined
    });
  }
  
  recordMiss(key: string): void {
    this.cacheMisses++;
    logger.debug(`Cache miss: ${key}`, this.context, {
      key,
      hitRatio: this.getHitRatio()
    });
  }
  
  recordError(key: string, error: Error): void {
    this.cacheErrors++;
    logger.warn(`Cache error for key: ${key}`, this.context, {
      key,
      error: error.message,
      hitRatio: this.getHitRatio()
    });
  }
  
  getStats(): Record<string, any> {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      errors: this.cacheErrors,
      total: this.cacheHits + this.cacheMisses,
      hitRatio: this.getHitRatio()
    };
  }
  
  logStats(): void {
    logger.info('Cache performance stats', this.context, this.getStats());
  }
  
  private getHitRatio(): string {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) return '0%';
    return `${((this.cacheHits / total) * 100).toFixed(2)}%`;
  }
} 