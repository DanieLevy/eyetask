import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { supabaseDb as db } from '@/lib/supabase-database';

// POST /api/auth/setup - One-time admin user setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.username || !body.email || !body.password) {
      return NextResponse.json({
        success: false,
        error: 'Username, email, and password are required'
      }, { status: 400 });
    }

    // Check if any users already exist
    const existingUser = await db.getUserByUsername(body.username);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Admin user already exists'
      }, { status: 400 });
    }
    
    logger.info('Setting up admin user in MongoDB', 'SETUP');
    
    const result = await authService.register({
      username: body.username,
      email: body.email,
      password: body.password
    });
    
    if (result) {
      logger.info('Admin user setup completed', 'SETUP', {
        username: result.user.username,
        email: result.user.email
      });
      
      // Create response with auth cookie
      const response = NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role
        },
        token: result.token
      });

      // Set HTTP-only cookie for authentication
      response.headers.set('Set-Cookie', authService.generateAuthCookie(result.token));
      
      return response;
    } else {
      logger.error('Admin user setup failed', 'SETUP');
      return NextResponse.json({
        success: false,
        error: 'Failed to create admin user'
      }, { status: 400 });
    }
  } catch (error) {
    logger.error('Setup API error', 'SETUP', undefined, error as Error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 