import { logger } from './logger';

interface MemorySnapshot {
  timestamp: number;
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  heapUsedPercentage?: number;
  arrayBuffersPercentage?: number;
  rssToHeapRatio?: number;
}

// Memory recovery history
interface MemoryRecoveryAttempt {
  timestamp: number;
  beforeRss: number;
  afterRss: number;
  heapReduction: number;
  arrayBuffersReduction: number;
  successful: boolean;
}

// Keep historical snapshots for trend analysis
const memoryHistory: MemorySnapshot[] = [];
const recoveryAttempts: MemoryRecoveryAttempt[] = [];
const MAX_HISTORY_LENGTH = 60; // Keep last 60 snapshots (approximately 1 hour at 1-minute intervals)
const MAX_RECOVERY_HISTORY = 10; // Keep last 10 recovery attempts

// Thresholds for warning (in MB)
const WARNING_THRESHOLDS = {
  rss: 800,
  heapUsed: 500,
  arrayBuffers: 500,
  heapUsedGrowthRate: 50, // MB/hour
  arrayBuffersGrowthRate: 50 // MB/hour
};

// Critical thresholds that should trigger immediate action
const CRITICAL_THRESHOLDS = {
  rss: 950,
  heapUsed: 700,
  arrayBuffers: 700,
  heapUsedGrowthRate: 100, // MB/hour
  arrayBuffersGrowthRate: 100 // MB/hour
};

// Last time a warning was issued for each metric (to prevent spam)
const lastWarnings: Record<string, number> = {
  rss: 0,
  heapUsed: 0,
  arrayBuffers: 0,
  heapUsedGrowth: 0,
  arrayBuffersGrowth: 0
};

// Minimum time between warnings (ms)
const WARNING_COOLDOWN = 10 * 60 * 1000; // 10 minutes

// Minimum time between recovery attempts
const RECOVERY_COOLDOWN = 15 * 60 * 1000; // 15 minutes
let lastRecoveryAttempt = 0;

// Declare the custom global property for TypeScript
declare global {
  var __appCache: Record<string, Record<string, any>> | undefined;
}

/**
 * Take a snapshot of current memory usage and analyze for potential issues
 */
export function monitorMemory(forceLog = false): MemorySnapshot {
  const memoryUsage = process.memoryUsage();
  
  // Create snapshot
  const snapshot: MemorySnapshot = {
    timestamp: Date.now(),
    rss: memoryUsage.rss / (1024 * 1024), // Convert to MB
    heapTotal: memoryUsage.heapTotal / (1024 * 1024),
    heapUsed: memoryUsage.heapUsed / (1024 * 1024),
    external: memoryUsage.external / (1024 * 1024),
    arrayBuffers: memoryUsage.arrayBuffers / (1024 * 1024),
    // Calculate additional metrics
    heapUsedPercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    arrayBuffersPercentage: (memoryUsage.arrayBuffers / memoryUsage.external) * 100,
    rssToHeapRatio: memoryUsage.rss / memoryUsage.heapTotal
  };
  
  // Add to history
  memoryHistory.push(snapshot);
  
  // Trim history if needed
  if (memoryHistory.length > MAX_HISTORY_LENGTH) {
    memoryHistory.shift();
  }
  
  // Always log memory usage if forced
  if (forceLog) {
    logMemoryUsage(snapshot);
  }
  
  // Check for issues
  detectMemoryIssues(snapshot);
  
  // Check if recovery is needed
  checkForRecoveryNeeded(snapshot);
  
  return snapshot;
}

/**
 * Log current memory usage
 */
function logMemoryUsage(snapshot: MemorySnapshot): void {
  logger.info('Memory usage stats', 'MEMORY_USAGE', {
    rss: `${snapshot.rss.toFixed(2)} MB`,
    heapTotal: `${snapshot.heapTotal.toFixed(2)} MB`,
    heapUsed: `${snapshot.heapUsed.toFixed(2)} MB`,
    external: `${snapshot.external.toFixed(2)} MB`,
    arrayBuffers: `${snapshot.arrayBuffers.toFixed(2)} MB`
  });
}

/**
 * Log detailed memory usage with additional metrics
 */
function logDetailedMemoryUsage(snapshot: MemorySnapshot): void {
  logger.info('Detailed memory usage', 'MEMORY_USAGE_DETAILED', {
    rss: `${snapshot.rss.toFixed(2)} MB`,
    heapTotal: `${snapshot.heapTotal.toFixed(2)} MB`,
    heapUsed: `${snapshot.heapUsed.toFixed(2)} MB (${snapshot.heapUsedPercentage?.toFixed(1)}% of heap)`,
    external: `${snapshot.external.toFixed(2)} MB`,
    arrayBuffers: `${snapshot.arrayBuffers.toFixed(2)} MB (${snapshot.arrayBuffersPercentage?.toFixed(1)}% of external)`,
    rssToHeapRatio: snapshot.rssToHeapRatio?.toFixed(2),
    nonHeapMemory: `${(snapshot.rss - snapshot.heapTotal).toFixed(2)} MB`
  });
}

/**
 * Detect potential memory issues based on current snapshot and history
 */
function detectMemoryIssues(snapshot: MemorySnapshot): void {
  const now = Date.now();
  
  // Check absolute thresholds
  checkThreshold('rss', snapshot.rss, WARNING_THRESHOLDS.rss, CRITICAL_THRESHOLDS.rss, now);
  checkThreshold('heapUsed', snapshot.heapUsed, WARNING_THRESHOLDS.heapUsed, CRITICAL_THRESHOLDS.heapUsed, now);
  checkThreshold('arrayBuffers', snapshot.arrayBuffers, WARNING_THRESHOLDS.arrayBuffers, CRITICAL_THRESHOLDS.arrayBuffers, now);
  
  // Check unusual ratios that might indicate issues
  if (snapshot.arrayBuffersPercentage && snapshot.arrayBuffersPercentage > 90) {
    logger.warn('ArrayBuffers consuming most of external memory', 'MEMORY_WARNING', {
      arrayBuffers: `${snapshot.arrayBuffers.toFixed(2)} MB`,
      external: `${snapshot.external.toFixed(2)} MB`,
      percentage: `${snapshot.arrayBuffersPercentage.toFixed(1)}%`
    });
  }
  
  if (snapshot.rssToHeapRatio && snapshot.rssToHeapRatio > 2.5) {
    logger.warn('High RSS to heap ratio - potential memory fragmentation', 'MEMORY_WARNING', {
      rss: `${snapshot.rss.toFixed(2)} MB`,
      heapTotal: `${snapshot.heapTotal.toFixed(2)} MB`,
      ratio: snapshot.rssToHeapRatio.toFixed(2)
    });
  }
  
  // Check growth rates if we have enough history
  if (memoryHistory.length >= 5) {
    // Get snapshot from ~10 minutes ago (or oldest if not that old)
    const oldestIdx = Math.max(0, memoryHistory.length - 10);
    const oldSnapshot = memoryHistory[oldestIdx];
    const timeSpanHours = (snapshot.timestamp - oldSnapshot.timestamp) / (1000 * 60 * 60);
    
    if (timeSpanHours > 0.05) { // At least 3 minutes of data
      // Calculate hourly growth rates
      const heapUsedGrowthRate = (snapshot.heapUsed - oldSnapshot.heapUsed) / timeSpanHours;
      const arrayBuffersGrowthRate = (snapshot.arrayBuffers - oldSnapshot.arrayBuffers) / timeSpanHours;
      
      // Check if growth rates exceed thresholds
      if (heapUsedGrowthRate > WARNING_THRESHOLDS.heapUsedGrowthRate && 
          now - lastWarnings.heapUsedGrowth > WARNING_COOLDOWN) {
        logger.warn('Heap memory growing rapidly', 'MEMORY_LEAK_WARNING', {
          growthRate: `${heapUsedGrowthRate.toFixed(2)} MB/hour`,
          timeSpan: `${(timeSpanHours * 60).toFixed(0)} minutes`,
          currentHeapUsed: `${snapshot.heapUsed.toFixed(2)} MB`
        });
        lastWarnings.heapUsedGrowth = now;
      }
      
      if (arrayBuffersGrowthRate > WARNING_THRESHOLDS.arrayBuffersGrowthRate && 
          now - lastWarnings.arrayBuffersGrowth > WARNING_COOLDOWN) {
        logger.warn('ArrayBuffers growing rapidly', 'MEMORY_LEAK_WARNING', {
          growthRate: `${arrayBuffersGrowthRate.toFixed(2)} MB/hour`,
          timeSpan: `${(timeSpanHours * 60).toFixed(0)} minutes`,
          currentArrayBuffers: `${snapshot.arrayBuffers.toFixed(2)} MB`
        });
        lastWarnings.arrayBuffersGrowth = now;
        
        // Log detailed memory information for ArrayBuffer growth
        logDetailedMemoryUsage(snapshot);
      }
      
      // Check for critical growth rates
      if (heapUsedGrowthRate > CRITICAL_THRESHOLDS.heapUsedGrowthRate || 
          arrayBuffersGrowthRate > CRITICAL_THRESHOLDS.arrayBuffersGrowthRate) {
        logger.error('CRITICAL: Memory growing extremely rapidly', 'MEMORY_LEAK_CRITICAL', {
          heapGrowthRate: `${heapUsedGrowthRate.toFixed(2)} MB/hour`,
          arrayBuffersGrowthRate: `${arrayBuffersGrowthRate.toFixed(2)} MB/hour`,
          timeSpan: `${(timeSpanHours * 60).toFixed(0)} minutes`
        });
        
        // This could trigger alerts or emergency actions
      }
    }
  }
}

/**
 * Check if memory recovery is needed and attempt it if necessary
 */
function checkForRecoveryNeeded(snapshot: MemorySnapshot): void {
  const now = Date.now();
  
  // Skip if we've attempted recovery recently
  if (now - lastRecoveryAttempt < RECOVERY_COOLDOWN) {
    return;
  }
  
  // Check if any critical thresholds are exceeded
  const isCritical = 
    snapshot.rss > CRITICAL_THRESHOLDS.rss ||
    snapshot.heapUsed > CRITICAL_THRESHOLDS.heapUsed ||
    snapshot.arrayBuffers > CRITICAL_THRESHOLDS.arrayBuffers;
  
  // Check growth rates if we have enough history
  let rapidGrowth = false;
  
  if (memoryHistory.length >= 5) {
    const oldestIdx = Math.max(0, memoryHistory.length - 10);
    const oldSnapshot = memoryHistory[oldestIdx];
    const timeSpanHours = (snapshot.timestamp - oldSnapshot.timestamp) / (1000 * 60 * 60);
    
    if (timeSpanHours > 0.05) {
      const heapUsedGrowthRate = (snapshot.heapUsed - oldSnapshot.heapUsed) / timeSpanHours;
      const arrayBuffersGrowthRate = (snapshot.arrayBuffers - oldSnapshot.arrayBuffers) / timeSpanHours;
      
      rapidGrowth = 
        heapUsedGrowthRate > CRITICAL_THRESHOLDS.heapUsedGrowthRate ||
        arrayBuffersGrowthRate > CRITICAL_THRESHOLDS.arrayBuffersGrowthRate;
    }
  }
  
  // Attempt recovery if needed
  if (isCritical || rapidGrowth) {
    attemptMemoryRecovery();
  }
}

/**
 * Check if a metric exceeds its threshold
 */
function checkThreshold(metric: string, value: number, warningThreshold: number, criticalThreshold: number, now: number): void {
  if (value > criticalThreshold) {
    // Critical level - always log with minimal cooldown
    if (now - lastWarnings[metric] > WARNING_COOLDOWN / 2) {
      logger.error(`CRITICAL: ${metric} memory usage exceeds critical threshold`, 'MEMORY_CRITICAL', {
        current: `${value.toFixed(2)} MB`,
        threshold: `${criticalThreshold} MB`,
        overage: `${(value - criticalThreshold).toFixed(2)} MB`
      });
      lastWarnings[metric] = now;
    }
  } else if (value > warningThreshold && now - lastWarnings[metric] > WARNING_COOLDOWN) {
    // Warning level
    logger.warn(`High memory usage detected: ${metric}`, 'MEMORY_WARNING', {
      current: `${value.toFixed(2)} MB`,
      threshold: `${warningThreshold} MB`
    });
    lastWarnings[metric] = now;
  }
}

/**
 * Attempt to recover memory by forcing garbage collection and releasing caches
 */
export function attemptMemoryRecovery(): boolean {
  const now = Date.now();
  lastRecoveryAttempt = now;
  
  try {
    // Take a snapshot before recovery
    const beforeSnapshot = monitorMemory(false);
    
    logger.warn('Attempting memory recovery', 'MEMORY_RECOVERY', {
      rss: `${beforeSnapshot.rss.toFixed(2)} MB`,
      heapUsed: `${beforeSnapshot.heapUsed.toFixed(2)} MB`,
      arrayBuffers: `${beforeSnapshot.arrayBuffers.toFixed(2)} MB`
    });
    
    // Force garbage collection if available
    let gcSucceeded = false;
    if (global.gc) {
      logger.info('Forcing garbage collection', 'MEMORY_RECOVERY');
      global.gc();
      gcSucceeded = true;
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc)', 'MEMORY_RECOVERY');
    }
    
    // Additional memory-saving measures
    clearCaches();
    
    // Take a snapshot after recovery
    setTimeout(() => {
      const afterSnapshot = monitorMemory(true);
      
      const heapReduction = beforeSnapshot.heapUsed - afterSnapshot.heapUsed;
      const rssReduction = beforeSnapshot.rss - afterSnapshot.rss;
      const arrayBuffersReduction = beforeSnapshot.arrayBuffers - afterSnapshot.arrayBuffers;
      
      const successful = heapReduction > 10 || rssReduction > 10; // At least 10MB reduction
      
      // Record the recovery attempt
      const attempt: MemoryRecoveryAttempt = {
        timestamp: now,
        beforeRss: beforeSnapshot.rss,
        afterRss: afterSnapshot.rss,
        heapReduction,
        arrayBuffersReduction,
        successful
      };
      
      recoveryAttempts.push(attempt);
      if (recoveryAttempts.length > MAX_RECOVERY_HISTORY) {
        recoveryAttempts.shift();
      }
      
      // Log the results
      logger.info('Memory recovery results', 'MEMORY_RECOVERY_RESULT', {
        heapReduction: `${heapReduction.toFixed(2)} MB`,
        rssReduction: `${rssReduction.toFixed(2)} MB`,
        arrayBuffersReduction: `${arrayBuffersReduction.toFixed(2)} MB`,
        successful: successful ? 'yes' : 'no',
        gcAvailable: gcSucceeded ? 'yes' : 'no'
      });
      
      // If not successful, log more details
      if (!successful) {
        logger.warn('Memory recovery was not effective', 'MEMORY_RECOVERY_FAILED', {
          beforeRss: `${beforeSnapshot.rss.toFixed(2)} MB`,
          afterRss: `${afterSnapshot.rss.toFixed(2)} MB`,
          reductionPercentage: `${((rssReduction / beforeSnapshot.rss) * 100).toFixed(1)}%`
        });
      }
    }, 1000);
    
    return true;
  } catch (error) {
    logger.error('Memory recovery failed', 'MEMORY_RECOVERY_ERROR', {
      error: (error as Error).message
    });
    return false;
  }
}

/**
 * Clear any internal caches that might be holding memory
 */
function clearCaches(): void {
  // Clear module caches to free memory
  try {
    // Clear global caches
    if (global.__appCache) {
      logger.info('Clearing application caches', 'MEMORY_RECOVERY');
      const appCache = global.__appCache; // Local reference that TypeScript knows is defined
      Object.keys(appCache).forEach(key => {
        appCache[key] = {};
      });
    }
    
    // Clear require cache for dev mode
    if (process.env.NODE_ENV === 'development') {
      // This is safe to do in development but not in production
      logger.info('Clearing module cache in development mode', 'MEMORY_RECOVERY');
      Object.keys(require.cache).forEach(key => {
        // Only clear non-essential modules
        if (!key.includes('node_modules')) {
          delete require.cache[key];
        }
      });
    }
  } catch (error) {
    logger.error('Error clearing caches', 'MEMORY_RECOVERY', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get memory usage over time for analysis
 */
export function getMemoryUsageHistory(): MemorySnapshot[] {
  return [...memoryHistory];
}

/**
 * Get memory recovery attempt history
 */
export function getRecoveryAttemptHistory(): MemoryRecoveryAttempt[] {
  return [...recoveryAttempts];
}

/**
 * Calculate a memory leak risk score (0-100)
 * Higher values indicate higher likelihood of a memory leak
 */
export function calculateMemoryLeakRiskScore(): number {
  if (memoryHistory.length < 5) {
    return 0; // Not enough data
  }
  
  // Get growth trends
  const oldestIdx = Math.max(0, memoryHistory.length - 10);
  const oldSnapshot = memoryHistory[oldestIdx];
  const latestSnapshot = memoryHistory[memoryHistory.length - 1];
  const timeSpanHours = (latestSnapshot.timestamp - oldSnapshot.timestamp) / (1000 * 60 * 60);
  
  if (timeSpanHours < 0.05) {
    return 0; // Not enough time elapsed
  }
  
  // Calculate hourly growth rates
  const heapUsedGrowthRate = (latestSnapshot.heapUsed - oldSnapshot.heapUsed) / timeSpanHours;
  const arrayBuffersGrowthRate = (latestSnapshot.arrayBuffers - oldSnapshot.arrayBuffers) / timeSpanHours;
  
  // Calculate absolute levels as percentage of thresholds
  const rssLevel = (latestSnapshot.rss / CRITICAL_THRESHOLDS.rss) * 100;
  const heapUsedLevel = (latestSnapshot.heapUsed / CRITICAL_THRESHOLDS.heapUsed) * 100;
  const arrayBuffersLevel = (latestSnapshot.arrayBuffers / CRITICAL_THRESHOLDS.arrayBuffers) * 100;
  
  // Calculate growth rate as percentage of thresholds
  const heapGrowthFactor = (heapUsedGrowthRate / CRITICAL_THRESHOLDS.heapUsedGrowthRate) * 100;
  const arrayBuffersGrowthFactor = (arrayBuffersGrowthRate / CRITICAL_THRESHOLDS.arrayBuffersGrowthRate) * 100;
  
  // Combine factors with appropriate weights
  const score = (
    0.15 * Math.min(rssLevel, 100) +
    0.15 * Math.min(heapUsedLevel, 100) + 
    0.25 * Math.min(arrayBuffersLevel, 100) +
    0.20 * Math.min(heapGrowthFactor, 100) +
    0.25 * Math.min(arrayBuffersGrowthFactor, 100)
  );
  
  return Math.min(Math.max(0, score), 100);
}

/**
 * Analyze ArrayBuffers usage to identify potential problems
 */
export function analyzeArrayBuffers(): { analysis: string; risk: 'low' | 'medium' | 'high' } {
  if (memoryHistory.length < 5) {
    return { analysis: 'Not enough data', risk: 'low' };
  }
  
  const latestSnapshot = memoryHistory[memoryHistory.length - 1];
  
  // Look at array buffer percentage of total memory
  const arrayBufferToRssRatio = latestSnapshot.arrayBuffers / latestSnapshot.rss;
  
  // Check growth patterns
  const oldestIdx = Math.max(0, memoryHistory.length - 10);
  const oldSnapshot = memoryHistory[oldestIdx];
  const timeSpanHours = (latestSnapshot.timestamp - oldSnapshot.timestamp) / (1000 * 60 * 60);
  
  if (timeSpanHours < 0.05) {
    return { analysis: 'Not enough time elapsed for analysis', risk: 'low' };
  }
  
  // Calculate growth rate
  const arrayBuffersGrowthRate = (latestSnapshot.arrayBuffers - oldSnapshot.arrayBuffers) / timeSpanHours;
  
  // Determine risk level
  let risk: 'low' | 'medium' | 'high' = 'low';
  
  if (latestSnapshot.arrayBuffers > CRITICAL_THRESHOLDS.arrayBuffers || 
      arrayBuffersGrowthRate > CRITICAL_THRESHOLDS.arrayBuffersGrowthRate) {
    risk = 'high';
  } else if (latestSnapshot.arrayBuffers > WARNING_THRESHOLDS.arrayBuffers || 
             arrayBuffersGrowthRate > WARNING_THRESHOLDS.arrayBuffersGrowthRate) {
    risk = 'medium';
  }
  
  // Determine possible causes
  let analysis = '';
  
  if (arrayBufferToRssRatio > 0.5) {
    analysis = 'ArrayBuffers consuming over 50% of memory. This often indicates large binary data (images, files) being stored in memory.';
  } else if (arrayBuffersGrowthRate > 50) {
    analysis = `ArrayBuffers growing at ${arrayBuffersGrowthRate.toFixed(1)} MB/hour. This may indicate unclosed file streams, image processing leaks, or large API responses.`;
  } else if (latestSnapshot.arrayBuffers > 300) {
    analysis = 'High ArrayBuffers usage. Consider using streaming for file operations and optimizing image processing.';
  } else {
    analysis = 'ArrayBuffers usage appears normal.';
  }
  
  return { analysis, risk };
}

/**
 * Start periodic memory monitoring
 */
export function startMemoryMonitoring(intervalMs = 60000): NodeJS.Timeout {
  const interval = setInterval(() => {
    try {
      const snapshot = monitorMemory();
      
      // Calculate risk score and log if high
      const riskScore = calculateMemoryLeakRiskScore();
      if (riskScore > 50) {
        logger.warn('Memory leak risk detected', 'MEMORY_RISK', {
          riskScore: riskScore.toFixed(0),
          rssUsage: `${snapshot.rss.toFixed(2)} MB`,
          heapUsed: `${snapshot.heapUsed.toFixed(2)} MB`,
          arrayBuffers: `${snapshot.arrayBuffers.toFixed(2)} MB`
        });
        
        // If risk is very high, force a garbage collection if possible
        if (riskScore > 80 && global.gc) {
          logger.info('Forcing garbage collection due to high memory pressure', 'MEMORY_GC');
          global.gc();
        }
      }
    } catch (error) {
      // Ignore errors in monitoring
    }
  }, intervalMs);
  
  // Don't keep the process alive just for monitoring
  if (interval.unref) {
    interval.unref();
  }
  
  return interval;
}

// Define global app cache for application to use
if (typeof global !== 'undefined') {
  (global as any).__appCache = (global as any).__appCache || {};
  
  // Expose a global memory monitor for debugging
  (global as any).__memoryMonitor = {
    getMemoryUsageHistory,
    calculateMemoryLeakRiskScore,
    monitorMemory,
    attemptMemoryRecovery,
    analyzeArrayBuffers,
    WARNING_THRESHOLDS,
    CRITICAL_THRESHOLDS
  };
} 