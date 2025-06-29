import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

// POST /api/push/subscribe - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    // Deep logging for iOS debugging
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const referer = request.headers.get('referer') || 'No referer';
    
    logger.info('[Push Subscribe] Request received', 'PUSH_SUBSCRIBE', {
      userAgent,
      isIOS,
      referer,
      contentType: request.headers.get('content-type'),
      timestamp: new Date().toISOString()
    });

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      logger.warn('[Push Subscribe] No authorization header', 'PUSH_SUBSCRIBE', { userAgent, isIOS });
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const user = auth.verifyToken(token);
    
    if (!user) {
      logger.warn('[Push Subscribe] Invalid token', 'PUSH_SUBSCRIBE', { userAgent, isIOS });
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    logger.info('[Push Subscribe] User authenticated', 'PUSH_SUBSCRIBE', {
      userId: user.id,
      username: user.username,
      role: user.role,
      isIOS
    });

    // Parse subscription data
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      logger.error('[Push Subscribe] Invalid subscription data', 'PUSH_SUBSCRIBE', {
        userId: user.id,
        hasSubscription: !!subscription,
        hasEndpoint: !!(subscription?.endpoint),
        isIOS
      });
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // Deep log subscription details for iOS
    logger.info('[Push Subscribe] Subscription details', 'PUSH_SUBSCRIBE', {
      userId: user.id,
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      hasKeys: !!subscription.keys,
      hasP256dh: !!(subscription.keys?.p256dh),
      hasAuth: !!(subscription.keys?.auth),
      p256dhLength: subscription.keys?.p256dh?.length,
      authLength: subscription.keys?.auth?.length,
      isIOS,
      userAgent
    });

    // Detect device type
    let deviceType: 'ios' | 'android' | 'desktop' = 'desktop';
    if (isIOS) {
      deviceType = 'ios';
    } else if (/android/i.test(userAgent)) {
      deviceType = 'android';
    }

    logger.info('[Push Subscribe] Device type detected', 'PUSH_SUBSCRIBE', {
      userId: user.id,
      deviceType,
      userAgent: userAgent.substring(0, 100)
    });

    // Save subscription
    await db.savePushSubscription({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      subscription,
      deviceType,
      userAgent,
      isActive: true
    });

    logger.info('[Push Subscribe] Subscription saved successfully', 'PUSH_SUBSCRIBE', {
      userId: user.id,
      username: user.username,
      deviceType,
      isIOS
    });

    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved successfully',
      deviceType
    });
  } catch (error) {
    logger.error('[Push Subscribe] Error', 'PUSH_SUBSCRIBE', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      userAgent: request.headers.get('user-agent')
    });
    return NextResponse.json(
      { error: 'Failed to save subscription', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/push/subscribe - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    
    logger.info('[Push Unsubscribe] Request received', 'PUSH_UNSUBSCRIBE', {
      userAgent,
      isIOS,
      timestamp: new Date().toISOString()
    });

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const user = auth.verifyToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse endpoint
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      logger.error('[Push Unsubscribe] No endpoint provided', 'PUSH_UNSUBSCRIBE', {
        userId: user.id,
        isIOS
      });
      return NextResponse.json({ error: 'No endpoint provided' }, { status: 400 });
    }

    logger.info('[Push Unsubscribe] Removing subscription', 'PUSH_UNSUBSCRIBE', {
      userId: user.id,
      endpoint: endpoint.substring(0, 50) + '...',
      isIOS
    });

    // Remove subscription
    await db.removePushSubscription(endpoint);

    logger.info('[Push Unsubscribe] Subscription removed successfully', 'PUSH_UNSUBSCRIBE', {
      userId: user.id,
      isIOS
    });

    return NextResponse.json({ 
      success: true,
      message: 'Subscription removed successfully'
    });
  } catch (error) {
    logger.error('[Push Unsubscribe] Error', 'PUSH_UNSUBSCRIBE', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
} 