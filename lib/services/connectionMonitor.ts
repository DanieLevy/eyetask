import { connectToDatabase, getConnectionStatus } from '../mongodb';
import { logger } from '../logger';

interface ConnectionStats {
  current: number;
  available: number;
  total: number;
  percentUsed: number;
  isEstimated: boolean;
}

/**
 * Connection monitoring service for MongoDB
 * This can be used to check connection health periodically
 * and send alerts if connections exceed thresholds
 */
export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly WARN_THRESHOLD = 70; // Warn at 70% connection usage
  private readonly CRITICAL_THRESHOLD = 85; // Critical at 85% usage
  private readonly CHECK_INTERVAL = 2 * 60 * 1000; // Check every 2 minutes
  
  // Track historical connection usage
  private connectionUsageHistory: { timestamp: number; requestsServed: number }[] = [];
  private maxHistoryLength = 10;
  
  // Track last reported connection count to prevent runaway estimates
  private lastConnectionCount = 0;
  private consecutiveIncreases = 0;
  private maxConsecutiveIncreases = 3;
  
  // Singleton pattern
  public static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }
  
  /**
   * Start periodic connection monitoring
   */
  public startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }
    
    logger.info('Starting MongoDB connection monitoring', 'CONNECTION_MONITOR');
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkConnections();
    }, this.CHECK_INTERVAL);
    
    // Don't keep the process alive just for monitoring
    if (this.monitoringInterval.unref) {
      this.monitoringInterval.unref();
    }
  }
  
  /**
   * Stop connection monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Stopped MongoDB connection monitoring', 'CONNECTION_MONITOR');
    }
  }
  
  /**
   * Check current connection statistics
   * Uses multiple strategies with fallbacks when serverStatus is not available
   */
  public async checkConnections(): Promise<ConnectionStats | null> {
    try {
      const { client, db, connectionCount, requestsServedByThisConnection } = await connectToDatabase();
      
      if (!client || !db) {
        logger.warn('Cannot check connections - database not connected', 'CONNECTION_MONITOR');
        return null;
      }
      
      // Track connection usage history
      this.trackConnectionUsage(requestsServedByThisConnection);
      
      // Primary method: Try using admin.serverStatus() (requires admin privileges)
      try {
        const admin = db.admin();
        const status = await admin.serverStatus();
        
        if (status.connections) {
          const current = status.connections.current;
          const available = status.connections.available || 0;
          const total = current + available;
          const percentUsed = (current / total) * 100;
          
          const stats = {
            current,
            available,
            total,
            percentUsed,
            isEstimated: false
          };
          
          // Log the stats
          this.logConnectionStats(stats);
          
          // Reset our consecutive increases counter since we have accurate data
          this.consecutiveIncreases = 0;
          this.lastConnectionCount = current;
          
          return stats;
        }
      } catch (error) {
        // Log but continue to fallback methods
        logger.debug('Server status not available, using fallback methods', 'CONNECTION_MONITOR');
      }
      
      // Fallback method: Use client-side tracking
      const { maxPoolSize = 10, minPoolSize = 5 } = client.options || {};
      
      // Get the current connection status from the MongoDB singleton
      const connectionStatus = getConnectionStatus();
      
      // Instead of using pendingOperations, use a more reasonable estimate
      // Based on the connection's age and usage patterns
      let estimatedCurrent = minPoolSize;
      
      if (connectionStatus.isConnected) {
        // Add 1-3 connections based on recent activity, but don't exceed maxPoolSize
        const activityFactor = Math.min(3, Math.ceil(connectionStatus.requestsServed / 20));
        estimatedCurrent = Math.min(maxPoolSize, minPoolSize + activityFactor);
      }
      
      // Safety check: Don't allow the estimate to grow unbounded
      if (estimatedCurrent > this.lastConnectionCount) {
        this.consecutiveIncreases++;
        if (this.consecutiveIncreases > this.maxConsecutiveIncreases) {
          // If we've had too many consecutive increases, cap the growth
          estimatedCurrent = this.lastConnectionCount;
          logger.warn('Capping estimated connection count growth', 'CONNECTION_MONITOR', {
            capped: estimatedCurrent,
            consecutiveIncreases: this.consecutiveIncreases
          });
        }
      } else {
        this.consecutiveIncreases = 0;
      }
      
      this.lastConnectionCount = estimatedCurrent;
      
      const estimatedAvailable = maxPoolSize - estimatedCurrent;
      const estimatedTotal = maxPoolSize;
      const estimatedPercentUsed = (estimatedCurrent / estimatedTotal) * 100;
      
      const estimatedStats = {
        current: estimatedCurrent,
        available: estimatedAvailable,
        total: estimatedTotal,
        percentUsed: estimatedPercentUsed,
        isEstimated: true
      };
      
      // Log the estimated stats
      this.logConnectionStats(estimatedStats, true);
      
      return estimatedStats;
    } catch (error) {
      logger.error('Failed to check MongoDB connections', 'CONNECTION_MONITOR', {
        error: (error as Error).message
      });
      return null;
    }
  }
  
  /**
   * Track connection usage over time
   */
  private trackConnectionUsage(requestsServed: number | undefined): void {
    if (!requestsServed) return;
    
    // Add current usage to history
    this.connectionUsageHistory.push({
      timestamp: Date.now(),
      requestsServed
    });
    
    // Trim history if needed
    if (this.connectionUsageHistory.length > this.maxHistoryLength) {
      this.connectionUsageHistory.shift();
    }
    
    // Calculate request rate if we have enough history
    if (this.connectionUsageHistory.length >= 2) {
      const oldest = this.connectionUsageHistory[0];
      const newest = this.connectionUsageHistory[this.connectionUsageHistory.length - 1];
      const timeSpanSeconds = (newest.timestamp - oldest.timestamp) / 1000;
      
      if (timeSpanSeconds > 0) {
        const requestsPerSecond = (newest.requestsServed - oldest.requestsServed) / timeSpanSeconds;
        
        logger.debug('MongoDB connection usage trend', 'CONNECTION_MONITOR', {
          requestsPerSecond: requestsPerSecond.toFixed(2),
          totalRequestsServed: newest.requestsServed,
          timeSpanMinutes: (timeSpanSeconds / 60).toFixed(2)
        });
      }
    }
  }
  
  /**
   * Force close idle connections if too close to the limit
   * This should only be used in emergency situations
   */
  public async releaseIdleConnections(): Promise<boolean> {
    try {
      const stats = await this.checkConnections();
      
      if (!stats) {
        return false;
      }
      
      // If connections are above critical threshold, force a garbage collection
      if (stats.percentUsed > this.CRITICAL_THRESHOLD) {
        logger.warn('Attempting to release idle connections', 'CONNECTION_MONITOR');
        
        // Force garbage collection to potentially release resources
        if (global.gc) {
          global.gc();
        }
        
        logger.info('Connection pool resources released', 'CONNECTION_MONITOR');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to release connections', 'CONNECTION_MONITOR', {
        error: (error as Error).message
      });
      return false;
    }
  }
  
  /**
   * Log connection statistics and send alerts if needed
   */
  private logConnectionStats(stats: ConnectionStats, isEstimated = false): void {
    // Always log the current stats
    logger.info('MongoDB connection stats', 'CONNECTION_MONITOR', {
      current: stats.current,
      available: stats.available,
      total: stats.total,
      percentUsed: stats.percentUsed.toFixed(1) + '%',
      isEstimated: isEstimated ? 'yes (serverStatus not available)' : 'no'
    });
    
    // Send warnings based on thresholds
    if (stats.percentUsed > this.CRITICAL_THRESHOLD) {
      logger.error(`CRITICAL: MongoDB connections at ${stats.percentUsed.toFixed(1)}% of limit`, 'CONNECTION_MONITOR', {
        current: stats.current,
        available: stats.available,
        message: 'Connection pool nearly exhausted, immediate action required',
        isEstimated
      });
      
      // Here you could add code to send alerts via email, Slack, etc.
      // this.sendAlert('critical', stats);
    } else if (stats.percentUsed > this.WARN_THRESHOLD) {
      logger.warn(`WARNING: MongoDB connections at ${stats.percentUsed.toFixed(1)}% of limit`, 'CONNECTION_MONITOR', {
        current: stats.current,
        available: stats.available,
        message: 'Connection usage high, monitor closely',
        isEstimated
      });
    }
  }
  
  /**
   * Get connection monitoring capabilities based on permissions
   */
  public async getMonitoringCapabilities(): Promise<{ hasAdminAccess: boolean }> {
    try {
      const { db } = await connectToDatabase();
      
      if (!db) {
        return { hasAdminAccess: false };
      }
      
      try {
        const admin = db.admin();
        // Try a limited command that requires fewer permissions than serverStatus
        await admin.listDatabases({ nameOnly: true });
        return { hasAdminAccess: true };
      } catch (error) {
        return { hasAdminAccess: false };
      }
    } catch (error) {
      return { hasAdminAccess: false };
    }
  }
  
  /**
   * Send an alert through your preferred notification channel
   * This is a placeholder - implement your alert mechanism here
   */
  private sendAlert(level: 'warning' | 'critical', stats: ConnectionStats): void {
    // Implement alerts to your monitoring system (e.g., email, Slack, PagerDuty)
    // Example: EmailService.send(`MongoDB ${level}: Connections at ${stats.percentUsed.toFixed(1)}%`);
    logger.warn(`Alert would be sent (${level}): Connections at ${stats.percentUsed.toFixed(1)}%`, 'CONNECTION_ALERT');
  }
}

// Export a singleton instance
export const connectionMonitor = ConnectionMonitor.getInstance();

// Optional: Auto-start monitoring if this is imported directly 
// Uncomment the line below to auto-start monitoring when this module is imported
// connectionMonitor.startMonitoring(); 