import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get specific user (admin only or user fetching own profile)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = auth.extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Check if user is fetching their own profile
    const isOwnProfile = user.id === id;
    
    // If not fetching own profile, require admin
    if (!isOwnProfile) {
      requireAdmin(user);
    }
    
    const targetUser = await db.getUserById(id);
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }
    
    // Remove password hash from response
    const sanitizedUser = {
      _id: targetUser._id?.toString(),
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
      isActive: targetUser.isActive,
      createdAt: targetUser.createdAt.toISOString(),
      lastLogin: targetUser.lastLogin?.toISOString(),
      createdBy: targetUser.createdBy?.toString(),
      lastModifiedBy: targetUser.lastModifiedBy?.toString(),
      lastModifiedAt: targetUser.lastModifiedAt?.toISOString()
    };
    
    return NextResponse.json({
      user: sanitizedUser,
      success: true
    });
  } catch (error) {
    logger.error('Error fetching user', 'USERS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch user', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user (admin only or user updating own profile)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = auth.extractUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', success: false },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const body = await request.json();
    
    // Check if user is updating their own profile
    const isOwnProfile = body.updateOwnProfile && currentUser.id === id;
    
    // If not updating own profile, require admin
    if (!isOwnProfile) {
      requireAdmin(currentUser);
    }
    
    // Check if user exists
    const targetUser = await db.getUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }
    
    // Prepare updates
    const updates: any = {};
    
    if (isOwnProfile) {
      // Users can only update their own username, email, and password
      if (body.username) updates.username = body.username;
      if (body.email) updates.email = body.email;
      
      // If changing password, verify current password
      if (body.password && body.currentPassword) {
        const isValidPassword = await bcrypt.compare(body.currentPassword, targetUser.passwordHash);
        if (!isValidPassword) {
          return NextResponse.json(
            { error: 'Current password is incorrect', success: false },
            { status: 400 }
          );
        }
        updates.passwordHash = await bcrypt.hash(body.password, 12);
      } else if (body.password && !body.currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password', success: false },
          { status: 400 }
        );
      }
    } else {
      // Admin updates
      if (body.username) updates.username = body.username;
      if (body.email) updates.email = body.email;
      if (body.role && ['admin', 'data_manager', 'driver_manager'].includes(body.role)) {
        // Prevent self-demotion
        if (id === currentUser.id && body.role !== 'admin') {
          return NextResponse.json(
            { error: 'Cannot change your own role', success: false },
            { status: 400 }
          );
        }
        updates.role = body.role;
      }
      if (body.isActive !== undefined) updates.isActive = body.isActive;
      
      // If password is provided, hash it (no current password check for admin)
      if (body.password) {
        updates.passwordHash = await bcrypt.hash(body.password, 12);
      }
    }
    
    // Update user
    const success = await db.updateUser(id, updates, currentUser.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update user', success: false },
        { status: 500 }
      );
    }
    
    logger.info('User updated successfully', 'USERS_API', {
      userId: id,
      updatedBy: currentUser.id,
      isOwnProfile,
      changes: Object.keys(updates)
    });
    
    return NextResponse.json({
      message: 'User updated successfully',
      success: true
    });
    
  } catch (error) {
    logger.error('Error updating user', 'USERS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to update user', success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = auth.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    const { id } = await params;
    
    // Prevent self-deletion
    if (id === adminUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account', success: false },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const targetUser = await db.getUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }
    
    // Delete user
    const success = await db.deleteUser(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete user', success: false },
        { status: 500 }
      );
    }
    
    logger.info('User deleted successfully', 'USERS_API', {
      userId: id,
      deletedBy: adminUser.id,
      username: targetUser.username
    });
    
    return NextResponse.json({
      message: 'User deleted successfully',
      success: true
    });
    
  } catch (error) {
    logger.error('Error deleting user', 'USERS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to delete user', success: false },
      { status: 500 }
    );
  }
} 