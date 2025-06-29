import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { activityLogger } from '@/lib/activityLogger';

// Never cache this route
export const dynamic = 'force-dynamic';

// POST /api/auth/login - User authentication
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({
        error: 'Username and password are required',
        success: false
      }, { status: 400 });
    }

    // Use the auth service login method
    const result = await auth.login({ username, password });

    if (!result) {
      logger.warn('Login attempt failed', 'AUTH', { username });
      return NextResponse.json({
        error: 'Invalid credentials',
        success: false
      }, { status: 401 });
    }

    const { user, token } = result;

    // Update last login
    await db.updateUser(user.id, { lastLogin: new Date() }, user.id);

    // Log the login action
    await db.logAction({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: 'התחבר למערכת',
      category: 'auth',
      severity: 'success'
    });

    // Track the visit
    await db.trackVisit(
      user.id,
      user.username,
      user.email,
      user.role
    );

    // Legacy activity logger for backward compatibility
    await activityLogger.logActivity({
      category: 'auth',
      action: 'התחבר למערכת',
      severity: 'success',
      userId: user.id,
      userType: user.role === 'admin' ? 'admin' : 'user',
      target: {
        id: user.id,
        type: 'user',
        title: user.username
      },
      isVisible: true
    });

    logger.info('User logged in successfully', 'AUTH', { userId: user.id, username: user.username });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error', 'AUTH', undefined, error as Error);
    return NextResponse.json({
      error: 'Internal server error',
      success: false
    }, { status: 500 });
  }
} 