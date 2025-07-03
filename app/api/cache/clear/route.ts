import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth-utils';

/**
 * POST /api/cache/clear - Clear all or specific caches
 * 
 * Request body:
 * {
 *   target?: 'all' | 'homepage' | 'project' | 'task',
 *   projectName?: string,  // Required if target is 'project'
 *   taskId?: string        // Required if target is 'task'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const user = authService.extractUserFromRequest(request);
    requireAdmin(user);
    
    // Get namespace(s) to clear from request body
    const body = await request.json();
    const { namespace, namespaces } = body;
    
    if (!namespace && !namespaces) {
      return NextResponse.json({
        success: false,
        error: 'Namespace(s) required'
      }, { status: 400 });
    }
    
    const namespacesToClear = namespaces ? namespaces : [namespace];
    
    // Clear each namespace
    let clearedCount = 0;
    for (const ns of namespacesToClear) {
      const count = cache.clear(ns);
      clearedCount += count;
      logger.info(`Cache namespace cleared: ${ns}`, 'CACHE_API', {
        namespace: ns,
        count,
        userId: user?.id
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} cache entries from ${namespacesToClear.length} namespaces`,
      namespacesCleared: namespacesToClear,
      count: clearedCount
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Error clearing cache', 'CACHE_API', undefined, error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache'
    }, { status: 500 });
  }
}

/**
 * GET /api/cache/clear/stats - Get cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const user = authService.extractUserFromRequest(request);
    requireAdmin(user);
    
    // Get cache statistics
    const stats = cache.getStats();
    
    // Get cache namespaces
    const namespaces = cache.getNamespaces();
    
    return NextResponse.json({
      success: true,
      stats,
      namespaces
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Error getting cache stats', 'CACHE_API', undefined, error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get cache stats'
    }, { status: 500 });
  }
} 