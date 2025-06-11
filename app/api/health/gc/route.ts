import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { attemptMemoryRecovery } from '@/lib/memory-monitor';

/**
 * API endpoint to trigger memory garbage collection and recovery
 * This is used by the monitoring page to help manage memory usage
 * POST /api/health/gc
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    logger.info('Manual garbage collection triggered', 'MEMORY_GC', {
      source: 'monitoring-page'
    });
    
    // Attempt memory recovery
    const success = attemptMemoryRecovery();
    
    // Clear any module-level caches that might be holding on to memory
    if (global.__appCache) {
      Object.keys(global.__appCache).forEach(key => {
        global.__appCache[key] = {};
      });
    }
    
    // Return success response
    return NextResponse.json({
      status: 'success',
      message: 'Garbage collection triggered',
      success,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error triggering garbage collection', 'MEMORY_GC', {
      error: (error as Error).message
    });
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to trigger garbage collection',
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
} 