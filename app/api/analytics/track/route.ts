import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';

// Track user activity anonymously
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, page, category = 'view' } = body;

    if (!action || !page) {
      return NextResponse.json(
        { error: 'Action and page are required', success: false },
        { status: 400 }
      );
    }

    // Try to get user from token, but don't fail if not authenticated
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    let user = null;
    
    if (token) {
      user = authService.extractUserFromRequest(request);
    }

    // Track action - handle both authenticated and anonymous users
    await db.logAction({
      userId: user?.id || 'anonymous',
      username: user?.username || 'Anonymous',
      userRole: user?.role || 'guest',
      action,
      category,
      metadata: { page }
    });

    // Update page views
    await db.incrementPageView(page);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Analytics tracking error', 'ANALYTICS_API', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to track analytics', success: false },
      { status: 500 }
    );
  }
} 