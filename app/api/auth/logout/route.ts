import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as auth } from '@/lib/auth-supabase';
import { extractTokenFromHeader } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { activityLogger } from '@/lib/activityLogger';

// Never cache this route
export const dynamic = 'force-dynamic';

// POST /api/auth/logout - User logout
export async function POST(request: NextRequest) {
  try {
    // Extract token for logging purposes
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    // Try to get user for activity logging
    let userId = null;
    let username = null;
    
    if (token) {
      const user = await auth.getUserFromToken(token);
      if (user) {
        userId = user.id;
        username = user.username;
        
        // Log activity if we have a valid user
        await activityLogger.logAuthActivity(
          'logout',
          userId,
          username,
          {},
          request
        );
      }
    }
    
    logger.info('User logout', 'AUTH_API', { userId, username });
    
    // Create response that clears auth cookie
    const response = NextResponse.json(
      { success: true },
      { 
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
    
    // Clear auth cookie
    response.headers.set('Set-Cookie', auth.clearAuthCookie());
    
    return response;
  } catch (error) {
    logger.error('Logout API error', 'AUTH_API', undefined, error as Error);
    
    // Still clear cookies even if there's an error
    const response = NextResponse.json(
      { error: 'Error during logout', success: false },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
    
    // Clear auth cookie
    response.headers.set('Set-Cookie', auth.clearAuthCookie());
    
    return response;
  }
} 