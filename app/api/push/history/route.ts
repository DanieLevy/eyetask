import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { supabaseDb as db } from '@/lib/supabase-database';

// GET /api/push/history - Get push notification history (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = authService.extractUserFromRequest(request);
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