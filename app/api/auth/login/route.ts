import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { supabaseDb as db } from '@/lib/supabase-database';

// Never cache this route
export const dynamic = 'force-dynamic';

// POST /api/auth/login - User authentication
export async function POST(request: NextRequest) {
  console.log('[SERVER AUTH LOGIN] ========== LOGIN REQUEST START ==========');
  console.log('[SERVER AUTH LOGIN] Timestamp:', new Date().toISOString());
  console.log('[SERVER AUTH LOGIN] Request URL:', request.url);
  console.log('[SERVER AUTH LOGIN] Request method:', request.method);
  console.log('[SERVER AUTH LOGIN] Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const body = await request.json();
    console.log('[SERVER AUTH LOGIN] Request body received:', { username: body.username, hasPassword: !!body.password });
    const { username, password } = body;

    if (!username || !password) {
      console.log('[SERVER AUTH LOGIN] ERROR: Missing credentials');
      return NextResponse.json(
        { error: 'Username and password are required', success: false },
        { status: 400 }
      );
    }

    console.log('[SERVER AUTH LOGIN] Calling authService.login for username:', username);
    const result = await authService.login(username, password);
    console.log('[SERVER AUTH LOGIN] authService.login result:', { 
      success: result.success, 
      hasToken: !!result.token, 
      hasUser: !!result.user,
      error: result.error 
    });
    
    if (!result.success) {
      console.log('[SERVER AUTH LOGIN] Login failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Invalid credentials', success: false },
        { status: 401 }
      );
    }

    // Track login
    if (result.user) {
      console.log('[SERVER AUTH LOGIN] Tracking visit and login for user:', result.user.username);
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
      console.log('[SERVER AUTH LOGIN] Visit and login tracked successfully');
    }

    logger.info('Admin login successful', 'AUTH_API', { username });
    console.log('[SERVER AUTH LOGIN] Sending success response with token and user data');
    console.log('[SERVER AUTH LOGIN] Response payload:', {
      success: true,
      hasToken: !!result.token,
      userId: result.user?.id,
      username: result.user?.username,
      role: result.user?.role,
      permissionsCount: Object.keys(result.permissions || {}).length
    });

    const response = NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
      permissions: result.permissions
    });
    
    console.log('[SERVER AUTH LOGIN] ========== LOGIN REQUEST END (SUCCESS) ==========');
    return response;
  } catch (error) {
    console.error('[SERVER AUTH LOGIN] ========== EXCEPTION OCCURRED ==========');
    console.error('[SERVER AUTH LOGIN] Error:', error);
    console.error('[SERVER AUTH LOGIN] Error message:', (error as Error).message);
    console.error('[SERVER AUTH LOGIN] Error stack:', (error as Error).stack);
    logger.error('Login error', 'AUTH_API', { error: (error as Error).message });
    console.log('[SERVER AUTH LOGIN] ========== LOGIN REQUEST END (ERROR) ==========');
    return NextResponse.json(
      { error: 'Login failed', success: false },
      { status: 500 }
    );
  }
} 