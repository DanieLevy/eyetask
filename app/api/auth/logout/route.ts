import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// POST /api/auth/logout - User logout
export async function POST(request: NextRequest) {
  try {
    // Extract user from request for logging
    const user = auth.extractUserFromRequest(request);
    
    if (user) {
      logger.info('User logged out', 'AUTH_API', { 
        username: user.username,
        email: user.email 
      });
    }

    auth.logout();
    
    // Create response and clear the auth cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the HTTP-only cookie
    response.headers.set('Set-Cookie', auth.clearAuthCookie());
    
    return response;
  } catch (error) {
    logger.error('Logout API error', 'AUTH_API', undefined, error as Error);
    
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 