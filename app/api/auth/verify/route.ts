import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { getUserPermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'; // Never cache this route

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] /api/auth/verify called`);
  
  try {
    const user = authService.extractUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired token',
          user: null
        }, 
        { status: 401 }
      );
    }

    // Get fresh permissions from database
    const permissions = await getUserPermissions(user.id);
    
    return NextResponse.json({
      success: true,
      user,
      permissions
    });
    
  } catch (error) {
    logger.error('Token verification error', 'AUTH_API', { error: (error as Error).message });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid token',
        user: null
      }, 
      { status: 401 }
    );
  }
} 