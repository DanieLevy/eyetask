import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { connectToDatabase, getConnectionStatus } from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { monitoringService } from '@/lib/services/monitoringService';
import { analyzeArrayBuffers, monitorMemory } from '@/lib/memory-monitor';

const db = new DatabaseService();

// Start monitoring on first API call to health endpoint
// This ensures monitoring is active in production
let monitoringStarted = false;

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  let formatted = '';
  if (days > 0) formatted += `${days}d `;
  if (hours > 0) formatted += `${hours}h `;
  if (minutes > 0) formatted += `${minutes}m `;
  formatted += `${remainingSeconds}s`;
  
  return formatted;
}

/**
 * API endpoint to check system health
 * This endpoint provides metrics about the system's health
 * GET /api/health
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const startTime = Date.now();
    
    // Start monitoring if not already started
    if (!monitoringStarted) {
      monitoringService.initialize();
      monitoringStarted = true;
    }
    
    // Test MongoDB database connectivity
    const { client, db } = await connectToDatabase();
    const databaseConnected = !!client && !!db;
    
    // Take a memory snapshot
    const memorySnapshot = monitorMemory(true);
    
    // Get current connection status
    const connectionStatus = getConnectionStatus();
    
    // Get detailed health information from monitoring service
    const systemHealth = await monitoringService.getSystemHealth();
    
    // Analyze array buffers specifically (useful for identifying memory issues)
    const arrayBuffersAnalysis = analyzeArrayBuffers();
    
    // Build a comprehensive health response
    const health = {
      status: databaseConnected ? systemHealth.status : 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: process.uptime(),
        formatted: formatUptime(process.uptime())
      },
      memory: {
        ...systemHealth.memory,
        arrayBuffersAnalysis: arrayBuffersAnalysis.analysis,
        arrayBuffersRisk: arrayBuffersAnalysis.risk
      },
      database: {
        connected: databaseConnected,
        connectionType: 'MongoDB Atlas',
        connectionPool: {
          ...systemHealth.connections,
          // Include connection tracking data for better diagnostics
          isEstimated: systemHealth.connections?.isEstimated || false,
          requestsServed: connectionStatus.requestsServed || 0,
          connectionAge: connectionStatus.connectionAge ? 
            `${Math.floor(connectionStatus.connectionAge / 1000)}s` : 'unknown',
          pendingOperations: connectionStatus.pendingOperations || 0
        }
      },
      monitoring: {
        capabilities: systemHealth.capabilities || {},
        lastSnapshot: new Date().toISOString()
      },
      responseTime: `${Date.now() - startTime}ms`
    };

    // Log health check completion
    logger.info('Health check completed', 'HEALTH_CHECK', {
      status: health.status,
      databaseConnected,
      memoryRisk: memorySnapshot ? `${Math.floor(memorySnapshot.rss)}` : 'unknown'
      });

    // Return the health data
    return NextResponse.json(health, {
      headers: {
        // Set cache control headers to prevent browser caching
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    // Log the error
    logger.error('Health check failed', 'HEALTH_CHECK', undefined, error as Error);
    
    // Return error response
    return NextResponse.json(
      {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        uptime: {
          seconds: process.uptime(),
          formatted: formatUptime(process.uptime())
        }
      },
      { status: 500 }
    );
  }
} 