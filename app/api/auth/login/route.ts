import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// POST /api/auth/login - User authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: 'Username and password are required', success: false },
        { status: 400 }
      );
    }

    // Attempt login with MongoDB Auth
    const result = await auth.login({
      username: body.username,
      password: body.password
    });

    if (result) {
      logger.info('User login successful', 'AUTH_API', { 
        username: result.user.username,
        email: result.user.email 
      });
      
      // Create response with auth cookie
      const response = NextResponse.json({
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role
        },
        token: result.token
      });

      // Set HTTP-only cookie for authentication
      response.headers.set('Set-Cookie', auth.generateAuthCookie(result.token));
      
      return response;
    } else {
      logger.warn('User login failed', 'AUTH_API', { username: body.username });
      
      return NextResponse.json(
        { error: 'Invalid username or password', success: false },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error('Login API error', 'AUTH_API', undefined, error as Error);
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 