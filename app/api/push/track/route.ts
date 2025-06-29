import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

// POST /api/push/track - Track push notification events
export async function POST(request: NextRequest) {
  try {
    const { notificationId, event, endpoint } = await request.json();

    if (!event) {
      return NextResponse.json({
        error: 'Event type required',
        success: false
      }, { status: 400 });
    }

    // Update subscription activity if endpoint provided
    if (endpoint) {
      await db.updatePushSubscriptionActivity(endpoint);
    }

    // Update notification stats if ID provided
    if (notificationId) {
      const stats: any = {};
      
      switch (event) {
        case 'delivered':
          stats.delivered = 1;
          break;
        case 'clicked':
          stats.clicked = 1;
          break;
        case 'failed':
          stats.failed = 1;
          break;
      }

      await db.updatePushNotificationStats(notificationId, stats);
    }

    logger.info('Push event tracked', 'PUSH_TRACK', {
      notificationId,
      event
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Push tracking error', 'PUSH_TRACK', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to track event',
      success: false
    }, { status: 500 });
  }
} 