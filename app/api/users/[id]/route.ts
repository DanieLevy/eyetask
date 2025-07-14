import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth-utils';

// GET /api/users/[id] - Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    requireAdmin(user);
    
    const targetUser = await db.getUserById(id);
    
    if (!targetUser) {
      return NextResponse.json({
        error: 'User not found',
        success: false
      }, { status: 404 });
    }
    
    return NextResponse.json({
      user: {
        _id: targetUser.id || targetUser._id?.toString(),
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
        createdAt: targetUser.createdAt,
        lastLogin: targetUser.lastLogin,
        createdBy: targetUser.createdBy,
        lastModifiedBy: targetUser.lastModifiedBy,
        lastModifiedAt: targetUser.lastModifiedAt
      },
      success: true
    });
  } catch (error) {
    logger.error('Error fetching user', 'USERS_API', { userId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch user',
      success: false
    }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    const data = await request.json();
    
    // Get existing user to verify it exists
    const existingUser = await db.getUserById(id);
    if (!existingUser) {
      return NextResponse.json({
        error: 'User not found',
        success: false
      }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: any = {};
    
    // Update username if provided and different
    if (data.username && data.username !== existingUser.username) {
      // Check if username is already taken
      const usernameExists = await db.getUserByUsername(data.username);
      if (usernameExists) {
        return NextResponse.json({
          error: 'Username already exists',
          success: false
        }, { status: 400 });
      }
      updateData.username = data.username;
    }
    
    // Update role if provided
    if (data.role && ['admin', 'data_manager', 'driver_manager'].includes(data.role)) {
      updateData.role = data.role;
    }
    
    // Update active status if provided
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    
    // Update email if provided and different
    if (data.email && data.email !== existingUser.email) {
      // Check if email is already taken
      const emailExists = await db.getUserByEmail(data.email);
      if (emailExists) {
        return NextResponse.json({
          error: 'Email already exists',
          success: false
        }, { status: 400 });
      }
      updateData.email = data.email;
    }
    
    // Update password if provided
    if (data.password) {
      updateData.passwordHash = await authService.hashPassword(data.password);
    }
    
    const success = await db.updateUser(id, updateData, adminUser.id);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to update user',
        success: false
      }, { status: 500 });
    }
    
    // Log the action
    let actionDescription = `עדכן משתמש: ${existingUser.username}`;
    if (data.hide_from_analytics !== undefined) {
      actionDescription = data.hide_from_analytics 
        ? `הסתיר משתמש מאנליטיקה: ${existingUser.username}`
        : `הציג משתמש באנליטיקה: ${existingUser.username}`;
    }
    
    await db.logAction({
      userId: adminUser.id,
      username: adminUser.username,
      userRole: adminUser.role,
      action: actionDescription,
      category: 'user',
      target: {
        id: id,
        type: 'user',
        name: existingUser.username
      },
      metadata: { changedFields: Object.keys(updateData) },
      severity: 'info'
    });
    
    logger.info('User updated successfully', 'USERS_API', {
      userId: id,
      updatedBy: adminUser.id,
      changes: Object.keys(updateData)
    });
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('User update error', 'USERS_API', { userId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to update user',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    // Prevent self-deletion
    if (id === adminUser.id) {
      return NextResponse.json({
        error: 'Cannot delete your own account',
        success: false
      }, { status: 400 });
    }
    
    // Get user details before deletion
    const targetUser = await db.getUserById(id);
    if (!targetUser) {
      return NextResponse.json({
        error: 'User not found',
        success: false
      }, { status: 404 });
    }
    
    // Delete the user
    const success = await db.deleteUser(id);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to delete user',
        success: false
      }, { status: 500 });
    }
    
    // Log the action
    await db.logAction({
      userId: adminUser.id,
      username: adminUser.username,
      userRole: adminUser.role,
      action: `מחק משתמש: ${targetUser.username}`,
      category: 'user',
      target: {
        id: id,
        type: 'user',
        name: targetUser.username
      },
      severity: 'warning'
    });
    
    logger.info('User deleted successfully', 'USERS_API', {
      userId: id,
      username: targetUser.username,
      deletedBy: adminUser.id
    });
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('User deletion error', 'USERS_API', { userId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to delete user',
      success: false
    }, { status: 500 });
  }
} 