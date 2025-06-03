import { NextRequest, NextResponse } from 'next/server';
import { signUpAdmin } from '@/lib/supabase-auth';
import { logger } from '@/lib/logger';

// POST /api/auth/setup - One-time admin user setup
export async function POST(request: NextRequest) {
  try {
    logger.info('Setting up admin user in Supabase Auth', 'SETUP');
    
    const result = await signUpAdmin();
    
    if (result.success) {
      logger.info('Admin user setup completed', 'SETUP');
      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        user: result.user
      });
    } else {
      logger.error('Admin user setup failed', 'SETUP', { error: result.error });
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create admin user'
      }, { status: 400 });
    }
  } catch (error) {
    logger.error('Setup API error', 'SETUP', undefined, error as Error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 