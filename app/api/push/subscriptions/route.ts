import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { supabaseDb as db } from '@/lib/supabase-database';
import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth-utils';

// GET /api/push/subscriptions - Get active push subscriptions (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = authService.extractUserFromRequest(request);
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