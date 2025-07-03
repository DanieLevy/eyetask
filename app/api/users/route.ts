import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth-utils';

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    const users = await db.getAllUsers();
    
    return NextResponse.json({
      users: users.map(user => ({
        _id: user.id || user._id?.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        createdBy: user.createdBy,
        lastModifiedBy: user.lastModifiedBy,
        lastModifiedAt: user.lastModifiedAt
      })),
      total: users.length,
      success: true
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Error fetching users', 'USERS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch users',
      success: false
    }, { status: 500 });
  }
}

// POST /api/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['username', 'email', 'password', 'role'];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json({
          error: `Missing required field: ${field}`,
          success: false
        }, { status: 400 });
      }
    }
    
    // Validate role
    if (!['admin', 'data_manager', 'driver_manager'].includes(data.role)) {
      return NextResponse.json({
        error: 'Invalid role. Must be admin, data_manager, or driver_manager',
        success: false
      }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUserByUsername = await db.getUserByUsername(data.username);
    if (existingUserByUsername) {
      return NextResponse.json({
        error: 'Username already exists',
        success: false
      }, { status: 409 });
    }
    
    const existingUserByEmail = await db.getUserByEmail(data.email);
    if (existingUserByEmail) {
      return NextResponse.json({
        error: 'Email already exists',
        success: false
      }, { status: 409 });
    }
    
    // Hash password
    const passwordHash = await authService.hashPassword(data.password);
    
    // Create user
    const userId = await db.createUser({
      username: data.username,
      email: data.email,
      passwordHash,
      role: data.role,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id
    });
    
    // Log the action
    await db.logAction({
      userId: adminUser.id,
      username: adminUser.username,
      userRole: adminUser.role,
      action: `יצר משתמש חדש: ${data.username} (${data.role})`,
      category: 'user',
      target: {
        id: userId,
        type: 'user',
        name: data.username
      },
      severity: 'success'
    });
    
    logger.info('User created successfully', 'USERS_API', {
      newUserId: userId,
      username: data.username,
      role: data.role,
      createdBy: adminUser.id
    });
    
    return NextResponse.json({
      success: true,
      userId,
      message: 'User created successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Error creating user', 'USERS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to create user',
      success: false
    }, { status: 500 });
  }
} 