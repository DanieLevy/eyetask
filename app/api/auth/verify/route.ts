import { NextResponse } from 'next/server';
import { AuthService, extractTokenFromHeader } from '@/lib/auth';
import { logger } from '@/lib/logger';

const authService = new AuthService();

export const dynamic = 'force-dynamic'; // Never cache this route

export async function GET(request: Request) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      logger.warn('Token verification failed: No token provided', 'AUTH');
      return NextResponse.json(
        { success: false, error: 'No token provided' }, 
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }
    
    // Verify token
    const user = await authService.getUserFromToken(token);
    
    if (!user) {
      logger.warn('Token verification failed: Invalid token', 'AUTH');
      return NextResponse.json(
        { success: false, error: 'Invalid token' }, 
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }
    
    logger.info('Token verification successful', 'AUTH', { userId: user.id });
    return NextResponse.json(
      { 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    logger.error('Error during token verification', 'AUTH', undefined, error as Error);
    return NextResponse.json(
      { success: false, error: 'Server error during authentication' }, 
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 