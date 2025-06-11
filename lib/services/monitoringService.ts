import { logger } from '../logger';
import { connectionMonitor } from './connectionMonitor';
import { startMemoryMonitoring, monitorMemory, calculateMemoryLeakRiskScore, analyzeArrayBuffers, attemptMemoryRecovery } from '../memory-monitor';
import { getConnectionStatus, maintainConnection } from '../mongodb';

/**
 * Centralized monitoring service that coordinates various monitoring systems
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private isInitialized: boolean = false;
  private memoryMonitoringInterval: NodeJS.Timeout | null = null;
  private systemCheckInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private monitoringCapabilities: {
    hasAdminAccess: boolean;
    lastChecked: number;
  } = {
    hasAdminAccess: false,
    lastChecked: 0
  };
  
  // Configuration
  private readonly MEMORY_CHECK_INTERVAL = 60 * 1000; // 1 minute
  private readonly SYSTEM_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 3 * 60 * 1000; // 3 minutes
  private readonly CAPABILITIES_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
  
  // Singleton pattern
  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }
  
  /**
   * Initialize all monitoring services
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }
    
    logger.info('Initializing monitoring services', 'MONITORING');
    
    // Start connection monitoring
    connectionMonitor.startMonitoring();
    
    // Start memory monitoring
    this.memoryMonitoringInterval = startMemoryMonitoring(this.MEMORY_CHECK_INTERVAL);
    
    // Start periodic system checks
    this.startSystemChecks();
    
    // Start connection heartbeat to prevent idle timeouts
    this.startConnectionHeartbeat();
    
    // Check monitoring capabilities
    this.checkMonitoringCapabilities();
    
    this.isInitialized = true;
    logger.info('Monitoring services initialized', 'MONITORING');
  }
  
  /**
   * Check what monitoring capabilities we have based on database permissions
   */
  private async checkMonitoringCapabilities(): Promise<void> {
    try {
      // Don't check too frequently
      const now = Date.now();
      if (now - this.monitoringCapabilities.lastChecked < this.CAPABILITIES_CHECK_INTERVAL) {
        return;
      }
      
      // Check admin access
      const { hasAdminAccess } = await connectionMonitor.getMonitoringCapabilities();
      
      this.monitoringCapabilities = {
        hasAdminAccess,
        lastChecked: now
      };
      
      logger.info('Monitoring capabilities checked', 'MONITORING', {
        hasAdminAccess: hasAdminAccess ? 'yes' : 'no'
      });
      
      // Log warning if admin access is not available
      if (!hasAdminAccess) {
        logger.warn('Limited monitoring capabilities - serverStatus not available', 'MONITORING', {
          impact: 'Connection pool monitoring will use estimates instead of actual values',
          solution: 'Consider granting admin role or readAnyDatabase privilege to the MongoDB user'
        });
      }
    } catch (error) {
      logger.error('Failed to check monitoring capabilities', 'MONITORING', {
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Start periodic system health checks
   */
  private startSystemChecks(): void {
    if (this.systemCheckInterval) {
      return;
    }
    
    this.systemCheckInterval = setInterval(() => {
      this.performSystemCheck();
    }, this.SYSTEM_CHECK_INTERVAL);
    
    // Don't keep the process alive just for monitoring
    if (this.systemCheckInterval.unref) {
      this.systemCheckInterval.unref();
    }
  }
  
  /**
   * Start connection heartbeat to prevent idle timeouts
   */
  private startConnectionHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }
    
    this.heartbeatInterval = setInterval(async () => {
      await maintainConnection();
    }, this.HEARTBEAT_INTERVAL);
    
    // Don't keep the process alive just for heartbeats
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }
  
  /**
   * Perform a comprehensive system health check
   */
  public async performSystemCheck(): Promise<void> {
    try {
      logger.info('Performing system health check', 'SYSTEM_CHECK');
      
      // Get memory snapshot
      const memorySnapshot = monitorMemory(false);
      
      // Check database connections
      const connectionStats = await connectionMonitor.checkConnections();
      
      // Calculate memory leak risk
      const leakRiskScore = calculateMemoryLeakRiskScore();
      
      // Get connection status
      const connStatus = getConnectionStatus();
      
      // Analyze array buffers
      const arrayBuffersAnalysis = analyzeArrayBuffers();
      
      // Check for critical conditions
      if (leakRiskScore > 70 || (connectionStats && connectionStats.percentUsed > 80)) {
        logger.warn('System health check detected potential issues', 'SYSTEM_CHECK', {
          memoryLeakRisk: leakRiskScore,
          connectionUtilization: connectionStats ? `${connectionStats.percentUsed.toFixed(1)}%` : 'unknown',
          rss: `${memorySnapshot.rss.toFixed(2)} MB`,
          heapUsed: `${memorySnapshot.heapUsed.toFixed(2)} MB`,
          arrayBuffers: `${memorySnapshot.arrayBuffers.toFixed(2)} MB`,
          arrayBuffersRisk: arrayBuffersAnalysis.risk,
          connectionAge: connStatus.connectionAge ? `${Math.floor(connStatus.connectionAge / 1000)}s` : 'unknown'
        });
        
        // Take remedial action for critical issues
        if (leakRiskScore > 80) {
          this.attemptMemoryRecovery();
        }
        
        if (connectionStats && connectionStats.percentUsed > 85) {
          connectionMonitor.releaseIdleConnections();
        }
      } else {
        logger.info('System health check passed', 'SYSTEM_CHECK', {
          memoryLeakRisk: leakRiskScore,
          connectionUtilization: connectionStats ? `${connectionStats.percentUsed.toFixed(1)}%` : 'unknown'
        });
      }
    } catch (error) {
      logger.error('System health check failed', 'SYSTEM_CHECK', {
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Attempt to recover memory if possible
   */
  private attemptMemoryRecovery(): void {
    try {
      attemptMemoryRecovery();
    } catch (error) {
      logger.error('Memory recovery failed', 'MEMORY_RECOVERY', {
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Shutdown monitoring services
   */
  public shutdown(): void {
    logger.info('Shutting down monitoring services', 'MONITORING');
    
    // Stop connection monitoring
    connectionMonitor.stopMonitoring();
    
    // Stop memory monitoring
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
    }
    
    // Stop system checks
    if (this.systemCheckInterval) {
      clearInterval(this.systemCheckInterval);
      this.systemCheckInterval = null;
    }
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.isInitialized = false;
    logger.info('Monitoring services shutdown complete', 'MONITORING');
  }
  
  /**
   * Get current system health status
   */
  public async getSystemHealth(): Promise<Record<string, any>> {
    try {
      // Get memory snapshot
      const memorySnapshot = monitorMemory(false);
      
      // Check database connections
      const connectionStats = await connectionMonitor.checkConnections();
      
      // Calculate memory leak risk
      const leakRiskScore = calculateMemoryLeakRiskScore();
      
      // Get connection status
      const connStatus = getConnectionStatus();
      
      // Get array buffers analysis
      const arrayBuffersAnalysis = analyzeArrayBuffers();
      
      // Refresh monitoring capabilities check if needed
      if (Date.now() - this.monitoringCapabilities.lastChecked > this.CAPABILITIES_CHECK_INTERVAL) {
        await this.checkMonitoringCapabilities();
      }
      
      return {
        status: this.determineHealthStatus(leakRiskScore, connectionStats),
        memory: {
          rss: `${memorySnapshot.rss.toFixed(2)} MB`,
          heapTotal: `${memorySnapshot.heapTotal.toFixed(2)} MB`,
          heapUsed: `${memorySnapshot.heapUsed.toFixed(2)} MB`,
          external: `${memorySnapshot.external.toFixed(2)} MB`,
          arrayBuffers: `${memorySnapshot.arrayBuffers.toFixed(2)} MB`,
          leakRiskScore: leakRiskScore.toFixed(0),
          arrayBuffersAnalysis: arrayBuffersAnalysis.analysis,
          arrayBuffersRisk: arrayBuffersAnalysis.risk
        },
        connections: connectionStats ? {
          current: connectionStats.current,
          available: connectionStats.available,
          total: connectionStats.total,
          utilizationPercentage: `${connectionStats.percentUsed.toFixed(1)}%`,
          isEstimated: connectionStats.isEstimated
        } : {
          status: 'limited_permissions',
          message: 'Connection stats require serverStatus privileges',
          recommendation: 'Grant admin role to MongoDB user for complete monitoring'
        },
        connectionStatus: {
          active: connStatus.isConnected,
          lastHeartbeat: connStatus.lastHeartbeat ? new Date(connStatus.lastHeartbeat).toISOString() : null,
          connectionAge: connStatus.connectionAge ? `${Math.floor(connStatus.connectionAge / 1000)}s` : null,
          requestsServed: connStatus.requestsServed,
          pendingOperations: connStatus.pendingOperations
        },
        monitoring: {
          hasAdminAccess: this.monitoringCapabilities.hasAdminAccess,
          initialized: this.isInitialized,
          lastCapabilitiesCheck: new Date(this.monitoringCapabilities.lastChecked).toISOString()
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get system health', 'MONITORING', {
        error: (error as Error).message
      });
      
      return {
        status: 'ERROR',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Determine overall health status based on metrics
   */
  private determineHealthStatus(leakRiskScore: number, connectionStats: any): string {
    if (leakRiskScore > 80 || (connectionStats && connectionStats.percentUsed > 85)) {
      return 'CRITICAL';
    }
    
    if (leakRiskScore > 50 || (connectionStats && connectionStats.percentUsed > 70)) {
      return 'WARNING';
    }
    
    return 'HEALTHY';
  }
}

// Export a singleton instance
export const monitoringService = MonitoringService.getInstance(); 