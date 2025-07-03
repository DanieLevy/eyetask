import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/users/[id]/permissions - Get user permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // Check admin auth
    const user = authService.extractUserFromRequest(request);
    if (!user || !authService.checkIsAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    const supabase = getSupabaseClient(true); // Use admin client
    
    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id, username, role, permission_overrides')
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
    
    // Apply permission_overrides from user record
    if (userData.permission_overrides) {
      Object.entries(userData.permission_overrides).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          permissions[key] = {
            ...permissions[key],
            value: value,
            source: 'user'
          };
        }
      });
    }
    
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
    
    // Check admin auth
    const user = authService.extractUserFromRequest(request);
    if (!user || !authService.checkIsAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
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
    const promises = [];
    
    for (const [key, value] of Object.entries(permissions)) {
      if (typeof value === 'boolean') {
        // Upsert permission
        promises.push(
          supabase
            .from('user_permissions')
            .upsert({
              user_id: userId,
              permission_key: key,
              permission_value: value,
              updated_at: new Date().toISOString()
            })
        );
      }
    }
    
    // Also update permission_overrides in app_users
    promises.push(
      supabase
        .from('app_users')
        .update({
          permission_overrides: permissions
        })
        .eq('id', userId)
    );
    
    // Execute all updates
    await Promise.all(promises);
    
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
      metadata: { updatedPermissions: Object.keys(permissions).length },
      severity: 'warning'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully'
    });
    
  } catch (error) {
    logger.error('Error updating user permissions', 'API', { error });
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 