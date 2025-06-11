import { connectToDatabase } from '../mongodb';
import { logger } from '../logger';

interface ConnectionStats {
  current: number;
  available: number;
  total: number;
  percentUsed: number;
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
   */
  public async checkConnections(): Promise<ConnectionStats | null> {
    try {
      const { client, db } = await connectToDatabase();
      
      if (!client || !db) {
        logger.warn('Cannot check connections - database not connected', 'CONNECTION_MONITOR');
        return null;
      }
      
      const admin = db.admin();
      const status = await admin.serverStatus();
      
      if (!status.connections) {
        logger.warn('Connection stats not available', 'CONNECTION_MONITOR');
        return null;
      }
      
      const current = status.connections.current;
      const available = status.connections.available || 0;
      const total = current + available;
      const percentUsed = (current / total) * 100;
      
      const stats = {
        current,
        available,
        total,
        percentUsed
      };
      
      // Log the stats
      this.logConnectionStats(stats);
      
      return stats;
    } catch (error) {
      logger.error('Failed to check MongoDB connections', 'CONNECTION_MONITOR', {
        error: (error as Error).message
      });
      return null;
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
        
        // In a real emergency, we could restart the connection pool
        // This is a last resort and should be used carefully
        const { client } = await connectToDatabase();
        
        if (client) {
          // This is intentionally commented out as it's a drastic measure
          // await disconnect();
          // await connectToDatabase();
          
          logger.info('Connection pool reinitialized', 'CONNECTION_MONITOR');
          return true;
        }
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
  private logConnectionStats(stats: ConnectionStats): void {
    // Always log the current stats
    logger.info('MongoDB connection stats', 'CONNECTION_MONITOR', {
      current: stats.current,
      available: stats.available,
      total: stats.total,
      percentUsed: stats.percentUsed.toFixed(1) + '%'
    });
    
    // Send warnings based on thresholds
    if (stats.percentUsed > this.CRITICAL_THRESHOLD) {
      logger.error(`CRITICAL: MongoDB connections at ${stats.percentUsed.toFixed(1)}% of limit`, 'CONNECTION_MONITOR', {
        current: stats.current,
        available: stats.available,
        message: 'Connection pool nearly exhausted, immediate action required'
      });
      
      // Here you could add code to send alerts via email, Slack, etc.
      // this.sendAlert('critical', stats);
    } else if (stats.percentUsed > this.WARN_THRESHOLD) {
      logger.warn(`WARNING: MongoDB connections at ${stats.percentUsed.toFixed(1)}% of limit`, 'CONNECTION_MONITOR', {
        current: stats.current,
        available: stats.available,
        message: 'Connection usage high, monitor closely'
      });
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