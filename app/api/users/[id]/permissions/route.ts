import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/supabase';
import { hasPermission } from '@/lib/auth-permissions';
import { PERMISSIONS } from '@/lib/permissions';

// GET /api/users/[id]/permissions - Get user permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    // Check if user has permission to manage users OR is requesting their own permissions
    const canManageUsers = await hasPermission(user, PERMISSIONS.ACCESS_USERS_MANAGEMENT);
    const isOwnPermissions = user.id === userId;
    
    if (!canManageUsers && !isOwnPermissions) {
      logger.warn('User attempted to view permissions without authorization', 'PERMISSIONS_API', {
        requestingUserId: user.id,
        targetUserId: userId,
        role: user.role
      });
      
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to view user permissions', success: false },
        { status: 403 }
      );
    }
    
    const supabase = getSupabaseClient(true); // Use admin client
    
    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id, username, role')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }
    
    // Get role default permissions
    const { data: rolePermissions, error: roleError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', userData.role);
      
    if (roleError) {
      logger.error('Error fetching role permissions', 'API', { error: roleError });
    }
    
    // Get user-specific permissions
    const { data: userPermissions, error: userPermError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);
      
    if (userPermError) {
      logger.error('Error fetching user permissions', 'API', { error: userPermError });
    }
    
    // Combine permissions: role defaults + user overrides
    const permissions: Record<string, { value: boolean; description: string; source: 'role' | 'user' }> = {};
    
    // Add role permissions
    if (rolePermissions) {
      rolePermissions.forEach(perm => {
        permissions[perm.permission_key] = {
          value: perm.permission_value,
          description: perm.description || '',
          source: 'role'
        };
      });
    }
    
    // Override with user-specific permissions
    if (userPermissions) {
      userPermissions.forEach(perm => {
        permissions[perm.permission_key] = {
          ...permissions[perm.permission_key],
          value: perm.permission_value,
          source: 'user'
        };
      });
    }
    
    // Note: permission_overrides field is deprecated and no longer used
    
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        role: userData.role
      },
      permissions
    });
    
  } catch (error) {
    logger.error('Error getting user permissions', 'API', { error });
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id]/permissions - Update user permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    // Check if user has permission to edit users
    const canEditUsers = await hasPermission(user, PERMISSIONS.EDIT_USERS);
    
    if (!canEditUsers) {
      logger.warn('User attempted to update permissions without authorization', 'PERMISSIONS_API', {
        requestingUserId: user.id,
        targetUserId: userId,
        role: user.role
      });
      
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to edit user permissions', success: false },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { permissions } = body;
    
    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { error: 'Invalid permissions format', success: false },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient(true); // Use admin client
    
    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }
    
    // Update user permissions
    const updateResults = [];
    const errors = [];
    
    for (const [key, value] of Object.entries(permissions)) {
      if (typeof value === 'boolean') {
        try {
          // First check if permission exists
          const { data: existingPerm } = await supabase
            .from('user_permissions')
            .select('id')
            .eq('user_id', userId)
            .eq('permission_key', key)
            .single();

          if (existingPerm) {
            // Update existing permission
            const { error } = await supabase
              .from('user_permissions')
              .update({
                permission_value: value,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .eq('permission_key', key);
              
            if (error) {
              errors.push({ key, error: error.message });
              logger.error('Failed to update user permission', 'PERMISSIONS_API', {
                userId,
                permissionKey: key,
                error: error.message
              });
            } else {
              updateResults.push({ key, value, success: true });
            }
          } else {
            // Insert new permission
            const { error } = await supabase
              .from('user_permissions')
              .insert({
                user_id: userId,
                permission_key: key,
                permission_value: value,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (error) {
              errors.push({ key, error: error.message });
              logger.error('Failed to insert user permission', 'PERMISSIONS_API', {
                userId,
                permissionKey: key,
                error: error.message
              });
            } else {
              updateResults.push({ key, value, success: true });
            }
          }
        } catch (permError) {
          const errorMessage = permError instanceof Error ? permError.message : String(permError);
          errors.push({ key, error: errorMessage });
          logger.error('Failed to process user permission', 'PERMISSIONS_API', {
            userId,
            permissionKey: key,
            error: permError
          });
        }
      }
    }
    
    // Update last_modified fields in app_users (without touching permission_overrides for now)
    const { error: userUpdateError } = await supabase
      .from('app_users')
      .update({
        last_modified_by: user.id,
        last_modified_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (userUpdateError) {
      logger.error('Failed to update app_users timestamps', 'PERMISSIONS_API', {
        userId,
        error: userUpdateError.message
      });
    }
    
    // Check if any updates failed
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Some permissions failed to update',
        errors,
        successfulUpdates: updateResults
      }, { status: 500 });
    }
    
    // Clear permission cache for this user
    const { clearPermissionCache } = await import('@/lib/auth-permissions');
    clearPermissionCache(userId);
    
    // Log permission change
    await db.logAction({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: 'עדכן הרשאות משתמש',
      category: 'user',
      target: {
        id: userId,
        type: 'user',
        name: 'permissions'
      },
      metadata: { 
        updatedPermissions: Object.keys(permissions).length,
        changes: permissions
      },
      severity: 'warning'
    });
    
    logger.info('User permissions updated successfully', 'PERMISSIONS_API', {
      targetUserId: userId,
      updatedBy: user.id,
      permissionCount: Object.keys(permissions).length
    });
    
    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully',
      updatedPermissions: updateResults
    });
    
  } catch (error) {
    logger.error('Error updating user permissions', 'API', { error });
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 