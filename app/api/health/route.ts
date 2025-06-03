import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, withApiHandler } from '@/lib/middleware';
import { healthCheck } from '@/lib/data';
import { getDatabase } from '@/lib/database';
import { logger, AppError } from '@/lib/logger';

// GET /api/health - Health check endpoint
export const GET = withApiHandler(async (req: NextRequest) => {
  try {
    // Perform comprehensive health checks
    const systemHealth = await healthCheck();
    
    // Test database connectivity
    const db = getDatabase();
    let dbStatus = 'disconnected';
    try {
      await db.getAllProjects();
      dbStatus = 'connected';
    } catch (error) {
      logger.warn('Database health check failed', 'HEALTH', { error: (error as Error).message });
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    // Check uptime
    const uptime = process.uptime();
    
    const healthData = {
      status: systemHealth.status,
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
      system: systemHealth.checks,
      database: {
        status: dbStatus,
        type: 'in_memory'
      },
      features: {
        auth: true,
        projects: true,
        tasks: true,
        subtasks: true,
        analytics: true
      }
    };
    
    // Determine overall status
    const isHealthy = systemHealth.status === 'healthy' && memoryUsagePercent < 90 && dbStatus === 'connected';
    
    if (!isHealthy) {
      logger.warn('Health check failed', 'HEALTH', healthData);
      return createSuccessResponse(healthData, 'Service degraded', 503, (req as any).requestId);
    }
    
    return createSuccessResponse(healthData, 'Service is healthy', 200, (req as any).requestId);
  } catch (error) {
    logger.error('Health check error', 'HEALTH', undefined, error as Error);
    throw new AppError('Health check failed', 500, 'HEALTH');
  }
});

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