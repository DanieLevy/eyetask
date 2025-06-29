import { NextRequest, NextResponse } from 'next/server';
import { auth, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

// GET /api/push/history - Get push notification history (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);

    const history = await db.getPushNotificationHistory(50);

    return NextResponse.json({
      success: true,
      history
    });
  } catch (error) {
    logger.error('Push history error', 'PUSH_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch push notification history',
      success: false
    }, { status: 500 });
  }
} 