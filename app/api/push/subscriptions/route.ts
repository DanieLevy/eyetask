import { NextRequest, NextResponse } from 'next/server';
import { auth, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

// GET /api/push/subscriptions - Get active push subscriptions (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);

    const subscriptions = await db.getActivePushSubscriptions();

    return NextResponse.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    logger.error('Push subscriptions error', 'PUSH_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch push subscriptions',
      success: false
    }, { status: 500 });
  }
} 