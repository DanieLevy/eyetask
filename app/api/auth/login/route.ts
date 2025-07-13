import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';

// Never cache this route
export const dynamic = 'force-dynamic';

// POST /api/auth/login - User authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required', success: false },
        { status: 400 }
      );
    }

    const result = await authService.login(username, password);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid credentials', success: false },
        { status: 401 }
      );
    }

    // Track login
    await db.trackVisit(result.user.id, result.user.username, result.user.email, result.user.role);
    await db.trackLogin(result.user.id);

    // Log the action
    await db.logAction({
      userId: result.user.id,
      username: result.user.username,
      userRole: result.user.role,
      action: 'התחבר למערכת',
      category: 'auth',
      severity: 'info'
    });

    logger.info('Admin login successful', 'AUTH_API', { username });

    return NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
      permissions: result.permissions
    });
  } catch (error) {
    logger.error('Login error', 'AUTH_API', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Login failed', success: false },
      { status: 500 }
    );
  }
} 