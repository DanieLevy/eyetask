import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { connectToDatabase } from '@/lib/mongodb';
import { logger } from '@/lib/logger';

const db = new DatabaseService();

// GET /api/health - Health check endpoint
export async function GET(req: NextRequest) {
  try {
    // Test MongoDB database connectivity
    let dbStatus = 'disconnected';
    let dbDetails = {};
    try {
      const connection = await connectToDatabase();
      if (connection && connection.db) {
        await connection.db.admin().ping();
        
        const projects = await db.getAllProjects();
        dbStatus = 'connected';
        dbDetails = {
          projectCount: projects.length,
          connectionType: 'MongoDB Atlas'
        };
      } else {
        throw new Error("Failed to connect to database.");
      }
    } catch (error) {
      logger.warn('Database health check failed', 'HEALTH', { error: (error as Error).message });
      dbDetails = {
        error: (error as Error).message
      };
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    // Check uptime
    const uptime = process.uptime();
    
    const healthData = {
      status: dbStatus === 'connected' && memoryUsagePercent < 90 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      netlify: process.env.NETLIFY ? 'yes' : 'no',
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime)
      },
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        usage: Math.round(memoryUsagePercent),
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      database: {
        status: dbStatus,
        type: 'MongoDB',
        ...dbDetails
      },
      features: {
        auth: true,
        projects: true,
        tasks: true,
        subtasks: true,
        analytics: true,
        dailyUpdates: true
      }
    };
    
    // Determine overall status
    const isHealthy = dbStatus === 'connected' && memoryUsagePercent < 90;
    const statusCode = isHealthy ? 200 : 503;
    const message = isHealthy ? 'Service is healthy' : 'Service degraded';
    
    if (!isHealthy) {
      logger.warn('Health check failed', 'HEALTH', healthData);
    } else {
      logger.info('Health check passed', 'HEALTH', { 
        status: healthData.status,
        dbStatus,
        memoryUsage: healthData.memory.usage 
      });
    }
    
    return NextResponse.json({
      success: isHealthy,
      message,
      data: healthData
    }, { status: statusCode });
  } catch (error) {
    logger.error('Health check error', 'HEALTH', undefined, error as Error);
    return NextResponse.json({
      success: false,
      message: 'Health check failed',
      error: 'Internal server error'
    }, { status: 500 });
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
} 