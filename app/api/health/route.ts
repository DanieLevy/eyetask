import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { connectToDatabase } from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { connectionMonitor } from '@/lib/services/connectionMonitor';

const db = new DatabaseService();

// Start connection monitoring on first API call to health endpoint
// This ensures monitoring is active in production
let monitoringStarted = false;

// GET /api/health - Health check endpoint
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Start connection monitoring if not already started
    if (!monitoringStarted) {
      connectionMonitor.startMonitoring();
      monitoringStarted = true;
      logger.info('MongoDB connection monitoring activated', 'HEALTH_CHECK');
    }
    
    // Test MongoDB database connectivity
    const { client, db } = await connectToDatabase();
    const databaseConnected = !!client && !!db;
    
    // Check MongoDB connection pool status if connected
    let connectionStats = null;
    if (databaseConnected && client && db) {
      try {
        const admin = db.admin();
        const status = await admin.serverStatus();
        
        if (status.connections) {
          const currentConnections = status.connections.current;
          const availableConnections = status.connections.available;
          const totalConnections = currentConnections + availableConnections;
          const connectionPercent = (currentConnections / totalConnections * 100).toFixed(1);
          
          connectionStats = {
            current: currentConnections,
            available: availableConnections,
            total: totalConnections,
            percentUsed: `${connectionPercent}%`,
            status: parseFloat(connectionPercent) > 80 ? 'WARNING' : 'OK'
          };
        }
      } catch (statsError) {
        logger.error('Failed to check MongoDB connection stats', 'HEALTH_CHECK', {
          error: (statsError as Error).message
        });
      }
    }

    // Basic system health metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Format memory values to MB
    const formatMemory = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    
    const health = {
      status: databaseConnected ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime)
      },
      memory: {
        rss: formatMemory(memoryUsage.rss),
        heapTotal: formatMemory(memoryUsage.heapTotal),
        heapUsed: formatMemory(memoryUsage.heapUsed),
        external: formatMemory(memoryUsage.external)
      },
      database: {
        connected: databaseConnected,
        connectionType: 'MongoDB Atlas',
        connectionPool: connectionStats
      },
      responseTime: `${Date.now() - startTime}ms`
    };
    
    logger.info('Health check completed', 'HEALTH_CHECK', { 
      status: health.status,
      databaseConnected
    });
    
    return NextResponse.json(health);
  } catch (error) {
    logger.error('Health check failed', 'HEALTH_CHECK', {
      error: (error as Error).message
    });
    
    return NextResponse.json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      type: 'MongoDB',
      responseTime: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
} 