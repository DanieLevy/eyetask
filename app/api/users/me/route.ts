import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { getUserPermissions } from '@/lib/permissions';
import { getSupabaseClient } from '@/lib/supabase';
import { supabaseDb as db } from '@/lib/supabase-database';

// GET /api/users/me - Get current user's profile and permissions
export async function GET(request: NextRequest) {
  try {
    // Extract user from request
    const user = authService.extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const userData = await db.getUserById(user.id);
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }

    // Get current permissions
    const permissions = await getUserPermissions(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        isActive: userData.isActive,
        lastLogin: userData.lastLogin,
        createdAt: userData.createdAt
      },
      permissions
    });

  } catch (error) {
    logger.error('Error getting user profile', 'API', { error });
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/users/me - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    // Extract user from request
    const user = authService.extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const data = await request.json();
    const supabase = getSupabaseClient(true);

    // Get existing user data
    const existingUser = await db.getUserById(user.id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Update username if provided and different
    if (data.username && data.username !== existingUser.username) {
      // Check if username is already taken
      const { data: usernameExists } = await supabase
        .from('app_users')
        .select('id')
        .eq('username', data.username)
        .neq('id', user.id)
        .single();

      if (usernameExists) {
        return NextResponse.json({
          error: 'שם המשתמש כבר תפוס',
          success: false
        }, { status: 400 });
      }
      updateData.username = data.username;
    }

    // Update email if provided and different
    if (data.email && data.email !== existingUser.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return NextResponse.json({
          error: 'כתובת אימייל לא חוקית',
          success: false
        }, { status: 400 });
      }

      // Check if email is already taken
      const { data: emailExists } = await supabase
        .from('app_users')
        .select('id')
        .eq('email', data.email)
        .neq('id', user.id)
        .single();

      if (emailExists) {
        return NextResponse.json({
          error: 'כתובת האימייל כבר קיימת במערכת',
          success: false
        }, { status: 400 });
      }
      updateData.email = data.email;
    }

    // Update password if provided
    if (data.password) {
      // Validate current password first
      if (!data.currentPassword) {
        return NextResponse.json({
          error: 'נדרשת הסיסמה הנוכחית כדי לשנות סיסמה',
          success: false
        }, { status: 400 });
      }

      // Verify current password
      const isPasswordValid = await authService.verifyPassword(
        data.currentPassword,
        existingUser.passwordHash
      );

      if (!isPasswordValid) {
        return NextResponse.json({
          error: 'הסיסמה הנוכחית שגויה',
          success: false
        }, { status: 400 });
      }

      // Validate new password strength
      if (data.password.length < 6) {
        return NextResponse.json({
          error: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים',
          success: false
        }, { status: 400 });
      }

      updateData.password_hash = await authService.hashPassword(data.password);
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 1) { // > 1 because updated_at is always there
      const { error } = await supabase
        .from('app_users')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        logger.error('Failed to update user profile', 'API', { error });
        return NextResponse.json({
          error: 'Failed to update profile',
          success: false
        }, { status: 500 });
      }

      // Log the action
      await db.logAction({
        userId: user.id,
        username: user.username,
        userRole: user.role,
        action: 'עדכן פרופיל אישי',
        category: 'user',
        target: {
          id: user.id,
          type: 'user',
          name: user.username
        },
        metadata: {
          updatedFields: Object.keys(updateData).filter(k => k !== 'updated_at')
        },
        severity: 'info'
      });
    }

    // Return updated user data with fresh permissions
    const updatedUser = await db.getUserById(user.id);
    const permissions = await getUserPermissions(user.id);

    if (!updatedUser) {
      return NextResponse.json({
        error: 'Failed to retrieve updated user data',
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'הפרופיל עודכן בהצלחה',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      },
      permissions
    });

  } catch (error) {
    logger.error('Error updating user profile', 'API', { error });
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 