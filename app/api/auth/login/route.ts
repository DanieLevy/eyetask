import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { supabaseDb as db } from '@/lib/supabase-database';

// Never cache this route
export const dynamic = 'force-dynamic';

// POST /api/auth/login - User authentication
export async function POST(request: NextRequest) {
  logger.info('LOGIN REQUEST START', 'AUTH_API', {
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method
  });
  
  try {
    const body = await request.json();
    logger.info('Request body received', 'AUTH_API', { username: body.username, hasPassword: !!body.password });
    const { username, password } = body;

    if (!username || !password) {
      logger.warn('Missing credentials', 'AUTH_API');
      return NextResponse.json(
        { error: 'Username and password are required', success: false },
        { status: 400 }
      );
    }

    logger.info('Calling authService.login', 'AUTH_API', { username });
    const result = await authService.login(username, password);
    logger.info('authService.login result', 'AUTH_API', { 
      success: result.success, 
      hasToken: !!result.token, 
      hasUser: !!result.user,
      error: result.error 
    });
    
    if (!result.success) {
      logger.warn('Login failed', 'AUTH_API', { error: result.error });
      return NextResponse.json(
        { error: result.error || 'Invalid credentials', success: false },
        { status: 401 }
      );
    }

    // Track login
    if (result.user) {
      logger.info('Tracking visit and login for user', 'AUTH_API', { username: result.user.username });
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
      logger.info('Visit and login tracked successfully', 'AUTH_API');
    }

    logger.info('Admin login successful', 'AUTH_API', { username });
    logger.info('Sending success response with token and user data', 'AUTH_API', {
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
    
    logger.info('LOGIN REQUEST END (SUCCESS)', 'AUTH_API');
    return response;
  } catch (error) {
    logger.error('Login error - Exception occurred', 'AUTH_API', { 
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json(
      { error: 'Login failed', success: false },
      { status: 500 }
    );
  }
} 