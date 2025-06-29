import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

// POST /api/push/subscribe - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const user = auth.extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    const { subscription, oldEndpoint } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({
        error: 'Invalid subscription data',
        success: false
      }, { status: 400 });
    }

    // Detect device type
    const userAgent = request.headers.get('user-agent') || '';
    let deviceType: 'ios' | 'android' | 'desktop' = 'desktop';
    
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      deviceType = 'ios';
    } else if (/Android/i.test(userAgent)) {
      deviceType = 'android';
    }

    // Remove old subscription if provided
    if (oldEndpoint) {
      await db.removePushSubscription(oldEndpoint);
    }

    // Save new subscription
    const subscriptionId = await db.savePushSubscription({
      userId: user.id,
      username: user.username,
      email: user.email || '',
      role: user.role,
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys?.p256dh || '',
          auth: subscription.keys?.auth || ''
        }
      },
      userAgent,
      deviceType,
      isActive: true
    });

    logger.info('Push subscription saved', 'PUSH_API', {
      userId: user.id,
      deviceType,
      subscriptionId
    });

    return NextResponse.json({
      success: true,
      subscriptionId,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    logger.error('Push subscription error', 'PUSH_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to subscribe to push notifications',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/push/subscribe - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const user = auth.extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({
        error: 'Endpoint required',
        success: false
      }, { status: 400 });
    }

    const removed = await db.removePushSubscription(endpoint);

    logger.info('Push subscription removed', 'PUSH_API', {
      userId: user.id,
      removed
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    logger.error('Push unsubscribe error', 'PUSH_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to unsubscribe from push notifications',
      success: false
    }, { status: 500 });
  }
} 