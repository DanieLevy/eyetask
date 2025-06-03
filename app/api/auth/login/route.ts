import { NextRequest, NextResponse } from 'next/server';
import { loginUser, initializeAdminUser } from '@/lib/supabase-auth';
import { logger } from '@/lib/logger';

// POST /api/auth/login - User authentication
export async function POST(request: NextRequest) {
  try {
    // Initialize admin user if it doesn't exist (one-time setup)
    await initializeAdminUser();

    const body = await request.json();
    
    // Validate request body
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: 'Username and password are required', success: false },
        { status: 400 }
      );
    }

    // Attempt login with Supabase Auth
    const result = await loginUser({
      username: body.username,
      password: body.password
    });

    if (result.success && result.user && result.token) {
      logger.authLog('login_success', result.user.username, true);
      
      return NextResponse.json({
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role
        },
        token: result.token
      });
    } else {
      logger.authLog('login_failed', body.username, false, new Error(result.error || 'Invalid credentials'));
      
      return NextResponse.json(
        { error: result.error || 'Invalid username or password', success: false },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error('Login API error', 'API', undefined, error as Error);
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 