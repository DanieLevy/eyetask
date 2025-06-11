import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { attemptMemoryRecovery } from '@/lib/memory-monitor';

// Declare the custom global property for TypeScript
declare global {
  var __appCache: Record<string, Record<string, any>> | undefined;
}

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
      const appCache = global.__appCache; // Create a local reference that TypeScript knows is defined
      Object.keys(appCache).forEach(key => {
        appCache[key] = {};
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Memory recovery attempted',
      gcTriggered: success
    });
    
  } catch (error) {
    logger.error('Error during manual garbage collection', 'MEMORY_GC', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger memory recovery'
    }, { status: 500 });
  }
} 