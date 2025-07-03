import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { requireAdmin } from '@/lib/auth-utils';

// Cache version management
const CACHE_VERSION_KEY = 'cache-version';
const CACHE_INVALIDATION_KEY = 'cache-invalidation';

// In-memory store for cache versions (in production, use Redis or database)
let cacheVersionStore: { [key: string]: any } = {
  version: Date.now(),
  lastInvalidation: null,
  forceUpdate: false
};

// GET /api/admin/cache - Get current cache status
export async function GET(req: NextRequest) {
  try {
    // Check authentication - Only admins can manage cache
    const user = authService.extractUserFromRequest(req);
    requireAdmin(user);
    
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'status') {
      // Return current cache version and status
      return NextResponse.json({
        success: true,
        data: {
          currentVersion: cacheVersionStore.version,
          lastInvalidation: cacheVersionStore.lastInvalidation,
          forceUpdate: cacheVersionStore.forceUpdate,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (action === 'check') {
      // Client version check
      const clientVersion = searchParams.get('version');
      const needsUpdate = clientVersion !== cacheVersionStore.version.toString();
      
      return NextResponse.json({
        success: true,
        data: {
          needsUpdate,
          currentVersion: cacheVersionStore.version,
          clientVersion,
          forceUpdate: cacheVersionStore.forceUpdate
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action. Use ?action=status or ?action=check&version=xxx'
    }, { status: 400 });

  } catch (error) {
    logger.error('Cache status check failed', 'CACHE_API', undefined, error as Error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check cache status'
    }, { status: 500 });
  }
}

// POST /api/admin/cache - Trigger cache clearing
export async function POST(req: NextRequest) {
  try {
    // Check authentication - Only admins can manage cache
    const user = authService.extractUserFromRequest(req);
    requireAdmin(user);
    
    const body = await req.json();
    const { action, reason } = body;

    if (action === 'clear-all') {
      // Generate new cache version to invalidate all client caches
      const newVersion = Date.now();
      const invalidationData = {
        version: newVersion,
        lastInvalidation: new Date().toISOString(),
        forceUpdate: true,
        reason: reason || 'Manual cache clear by admin',
        triggeredBy: 'admin'
      };

      // Update cache version store
      cacheVersionStore = {
        ...cacheVersionStore,
        ...invalidationData
      };

      logger.info('Cache invalidation triggered', 'CACHE_API', {
        newVersion,
        reason,
        previousVersion: cacheVersionStore.version
      });

      // Broadcast to all connected clients
      broadcastCacheInvalidation(invalidationData);

      return NextResponse.json({
        success: true,
        message: 'Cache clearing initiated for all users',
        data: {
          newVersion,
          invalidationTime: invalidationData.lastInvalidation,
          reason
        }
      });
    }

    if (action === 'soft-clear') {
      // Soft cache clear - update version but don't force reload
      const newVersion = Date.now();
      cacheVersionStore.version = newVersion;
      cacheVersionStore.forceUpdate = false;

      logger.info('Soft cache update triggered', 'CACHE_API', { newVersion });

      return NextResponse.json({
        success: true,
        message: 'Soft cache update initiated',
        data: { newVersion }
      });
    }

    if (action === 'reset-force') {
      // Reset force update flag
      cacheVersionStore.forceUpdate = false;

      return NextResponse.json({
        success: true,
        message: 'Force update flag reset'
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action. Use clear-all, soft-clear, or reset-force'
    }, { status: 400 });

  } catch (error) {
    logger.error('Cache management failed', 'CACHE_API', undefined, error as Error);
    return NextResponse.json({
      success: false,
      message: 'Failed to manage cache'
    }, { status: 500 });
  }
}

// Broadcast cache invalidation to all connected clients
function broadcastCacheInvalidation(data: any) {
  // In a real implementation, you'd use WebSockets, Server-Sent Events, 
  // or a push notification service to notify all clients
  // For now, we'll rely on periodic client checks
  
  logger.info('Broadcasting cache invalidation', 'CACHE_API', data);
  
  // You could implement:
  // - WebSocket broadcast
  // - Push notifications
  // - Background sync messages
} 