import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { supabaseDb as db } from '@/lib/supabase-database';
import { logger } from '@/lib/logger';
import { pushService } from '@/lib/services/pushNotificationService';

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

    // Check for authentication (optional)
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      user = await authService.getUserFromToken(token);
      
      if (user) {
        logger.info('[Push Subscribe] User authenticated', 'PUSH_SUBSCRIBE', {
          userId: user.id,
          username: user.username,
          role: user.role,
          isIOS
        });
      } else {
        logger.warn('[Push Subscribe] Invalid token provided', 'PUSH_SUBSCRIBE', { userAgent, isIOS });
      }
    } else {
      logger.info('[Push Subscribe] Unauthenticated subscription request', 'PUSH_SUBSCRIBE', { userAgent, isIOS });
    }

    // Parse subscription data
    const body = await request.json();
    const { subscription, userName } = body;

    if (!subscription || !subscription.endpoint) {
      logger.error('[Push Subscribe] Invalid subscription data', 'PUSH_SUBSCRIBE', {
        userId: user?.id || 'anonymous',
        hasSubscription: !!subscription,
        hasEndpoint: !!(subscription?.endpoint),
        isIOS
      });
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // Deep log subscription details for iOS
    logger.info('[Push Subscribe] Subscription details', 'PUSH_SUBSCRIBE', {
      userId: user?.id || 'anonymous',
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      hasKeys: !!subscription.keys,
      hasP256dh: !!(subscription.keys?.p256dh),
      hasAuth: !!(subscription.keys?.auth),
      p256dhLength: subscription.keys?.p256dh?.length,
      authLength: subscription.keys?.auth?.length,
      isIOS,
      userAgent,
      providedUserName: userName || 'Not provided'
    });

    // Detect device type
    let deviceType: 'ios' | 'android' | 'desktop' = 'desktop';
    if (isIOS) {
      deviceType = 'ios';
    } else if (/android/i.test(userAgent)) {
      deviceType = 'android';
    }

    logger.info('[Push Subscribe] Device type detected', 'PUSH_SUBSCRIBE', {
      userId: user?.id || 'anonymous',
      deviceType,
      userAgent: userAgent.substring(0, 100)
    });

    // Generate unique ID for anonymous users
    const userId = user?.id || null;
    const username = userName || user?.username || 'Anonymous User';
    const email = user?.email || '';
    const role = user?.role || 'guest';
    const isAnonymous = !user;

    // Save subscription
    await db.savePushSubscription({
      userId,
      username,
      email,
      role,
      subscription,
      deviceType,
      userAgent,
      isActive: true
    });

    logger.info('[Push Subscribe] Subscription saved successfully', 'PUSH_SUBSCRIBE', {
      userId,
      username,
      deviceType,
      isIOS,
      isAnonymous
    });
    
    // Send welcome notification to the subscriber
    try {
      // Only send welcome notification if we have a valid userId
      if (userId) {
      logger.info('[Push Subscribe] Sending welcome notification', 'PUSH_SUBSCRIBE', {
        userId,
        isAnonymous
      });

      const welcomeResult = await pushService.sendToUser(
        userId,
        {
          title: 'ההרשמה הושלמה! 🔔',
          body: username !== 'Anonymous User' 
            ? `שלום ${username}, ההרשמה להתראות הושלמה בהצלחה. מעכשיו תקבל עדכונים חשובים ישירות למכשיר שלך.`
            : 'ההרשמה להתראות הושלמה בהצלחה. מעכשיו תקבל עדכונים חשובים ישירות למכשיר שלך.',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          url: '/'
        },
        'system' // Sent by system
      );

      if (welcomeResult.success) {
        logger.info('[Push Subscribe] Welcome notification sent', 'PUSH_SUBSCRIBE', {
          userId,
          sent: welcomeResult.sent,
          isAnonymous
        });
      } else {
        logger.warn('[Push Subscribe] Failed to send welcome notification', 'PUSH_SUBSCRIBE', {
          userId,
          errors: welcomeResult.errors,
            isAnonymous
          });
        }
      } else {
        logger.info('[Push Subscribe] Skipping welcome notification for anonymous user', 'PUSH_SUBSCRIBE', {
          username,
          isAnonymous
        });
      }
    } catch (err) {
      logger.error('[Push Subscribe] Error sending welcome notification', 'PUSH_SUBSCRIBE', {
        userId,
        error: (err as Error).message,
        isAnonymous
      });
      // Don't fail the subscription if welcome message fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved successfully',
      deviceType,
      userId
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

    // Check for authentication (optional for unsubscribe)
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      user = await authService.getUserFromToken(token);
      
      if (!user) {
        logger.warn('[Push Unsubscribe] Invalid token provided', 'PUSH_UNSUBSCRIBE', { userAgent, isIOS });
      }
    } else {
      logger.info('[Push Unsubscribe] Unauthenticated unsubscribe request', 'PUSH_UNSUBSCRIBE', { userAgent, isIOS });
    }

    // Parse endpoint
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      logger.error('[Push Unsubscribe] No endpoint provided', 'PUSH_UNSUBSCRIBE', {
        userId: user?.id || 'anonymous',
        isIOS
      });
      return NextResponse.json({ error: 'No endpoint provided' }, { status: 400 });
    }

    logger.info('[Push Unsubscribe] Removing subscription', 'PUSH_UNSUBSCRIBE', {
      userId: user?.id || 'anonymous',
      endpoint: endpoint.substring(0, 50) + '...',
      isIOS
    });

    // Remove subscription - pass the actual userId which could be null
    await db.removePushSubscription(endpoint, user?.id || null);

    logger.info('[Push Unsubscribe] Subscription removed successfully', 'PUSH_UNSUBSCRIBE', {
      userId: user?.id || 'anonymous',
      isIOS,
      wasAnonymous: !user
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
