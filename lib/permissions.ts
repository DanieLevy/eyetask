import { logger } from './logger';
import { getSupabaseClient } from './supabase';

export interface Permission {
  key: string;
  value: boolean;
  description?: string;
  source?: 'role' | 'user';
}

export interface UserPermissions {
  [key: string]: boolean;
}

// Permission keys
export const PERMISSIONS = {
  // Access permissions
  ACCESS_ADMIN_DASHBOARD: 'access.admin_dashboard',
  ACCESS_USERS_MANAGEMENT: 'access.users_management',
  ACCESS_PROJECTS_MANAGEMENT: 'access.projects_management',
  ACCESS_TASKS_MANAGEMENT: 'access.tasks_management',
  ACCESS_DAILY_UPDATES: 'access.daily_updates',
  ACCESS_ANALYTICS: 'access.analytics',
  ACCESS_FEEDBACK: 'access.feedback',
  ACCESS_PUSH_NOTIFICATIONS: 'access.push_notifications',
  ACCESS_CACHE_MANAGEMENT: 'access.cache_management',
  
  // Create permissions
  CREATE_USERS: 'create.users',
  CREATE_PROJECTS: 'create.projects',
  CREATE_TASKS: 'create.tasks',
  
  // Edit permissions
  EDIT_USERS: 'edit.users',
  EDIT_PROJECTS: 'edit.projects',
  EDIT_TASKS: 'edit.tasks',
  
  // Delete permissions
  DELETE_USERS: 'delete.users',
  DELETE_PROJECTS: 'delete.projects',
  DELETE_TASKS: 'delete.tasks',
  
  // View permissions
  VIEW_ALL_DATA: 'view.all_data',
} as const;

// Permission groups for easier management
export const PERMISSION_GROUPS = {
  'ניהול משתמשים': [
    { key: PERMISSIONS.ACCESS_USERS_MANAGEMENT, label: 'גישה לניהול משתמשים' },
    { key: PERMISSIONS.CREATE_USERS, label: 'יצירת משתמשים' },
    { key: PERMISSIONS.EDIT_USERS, label: 'עריכת משתמשים' },
    { key: PERMISSIONS.DELETE_USERS, label: 'מחיקת משתמשים' },
  ],
  'ניהול פרויקטים': [
    { key: PERMISSIONS.ACCESS_PROJECTS_MANAGEMENT, label: 'גישה לניהול פרויקטים' },
    { key: PERMISSIONS.CREATE_PROJECTS, label: 'יצירת פרויקטים' },
    { key: PERMISSIONS.EDIT_PROJECTS, label: 'עריכת פרויקטים' },
    { key: PERMISSIONS.DELETE_PROJECTS, label: 'מחיקת פרויקטים' },
  ],
  'ניהול משימות': [
    { key: PERMISSIONS.ACCESS_TASKS_MANAGEMENT, label: 'גישה לניהול משימות' },
    { key: PERMISSIONS.CREATE_TASKS, label: 'יצירת משימות' },
    { key: PERMISSIONS.EDIT_TASKS, label: 'עריכת משימות' },
    { key: PERMISSIONS.DELETE_TASKS, label: 'מחיקת משימות' },
  ],
  'דפי ניהול': [
    { key: PERMISSIONS.ACCESS_ADMIN_DASHBOARD, label: 'גישה ללוח בקרה' },
    { key: PERMISSIONS.ACCESS_DAILY_UPDATES, label: 'גישה לעדכונים יומיים' },
    { key: PERMISSIONS.ACCESS_ANALYTICS, label: 'גישה לאנליטיקה' },
    { key: PERMISSIONS.ACCESS_FEEDBACK, label: 'גישה למשוב' },
    { key: PERMISSIONS.ACCESS_PUSH_NOTIFICATIONS, label: 'גישה להתראות Push' },
    { key: PERMISSIONS.ACCESS_CACHE_MANAGEMENT, label: 'גישה לניהול מטמון' },
  ],
  'הרשאות כלליות': [
    { key: PERMISSIONS.VIEW_ALL_DATA, label: 'צפייה בכל הנתונים' },
  ],
};

/**
 * Get user permissions from the database
 * 
 * Permission resolution order:
 * 1. Role defaults from role_permissions table
 * 2. User-specific overrides from user_permissions table
 * 
 * Note: permission_overrides field in app_users is deprecated
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  try {
    const supabase = getSupabaseClient(true);
    
    // Get user with role
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      if (userError?.code !== 'PGRST116') {
        logger.error('Error fetching user data', 'PERMISSIONS', { error: userError });
      }
      return {};
    }
    
    // Get role permissions
    const { data: rolePermissions, error: roleError } = await supabase
      .from('role_permissions')
      .select('permission_key, permission_value')
      .eq('role', userData.role);
      
    if (roleError) {
      logger.error('Error fetching role permissions', 'PERMISSIONS', { error: roleError });
    }
    
    // Get user-specific permissions
    const { data: userPermissions, error: userPermError } = await supabase
      .from('user_permissions')
      .select('permission_key, permission_value')
      .eq('user_id', userId);
      
    if (userPermError) {
      logger.error('Error fetching user permissions', 'PERMISSIONS', { error: userPermError });
    }
    
    // Build permissions object
    const permissions: UserPermissions = {};
    
    // Add role permissions
    if (rolePermissions) {
      rolePermissions.forEach(perm => {
        permissions[perm.permission_key] = perm.permission_value;
      });
    }
    
    // Override with user-specific permissions
    if (userPermissions) {
      userPermissions.forEach(perm => {
        permissions[perm.permission_key] = perm.permission_value;
      });
    }
    
    // Note: permission_overrides field is deprecated and no longer used
    
    logger.info('Permissions loaded', 'PERMISSIONS', {
      userId,
      role: userData.role,
      permissionCount: Object.keys(permissions).length
    });
    
    return permissions;
  } catch (error) {
    logger.error('Error getting user permissions', 'PERMISSIONS', { error });
    return {};
  }
}

/**
 * Check if user has a specific permission
 */
export async function checkUserPermission(userId: string, permissionKey: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions[permissionKey] === true;
}

/**
 * Check multiple permissions
 */
export async function checkUserPermissions(userId: string, permissionKeys: string[]): Promise<Record<string, boolean>> {
  const permissions = await getUserPermissions(userId);
  const result: Record<string, boolean> = {};
  
  permissionKeys.forEach(key => {
    result[key] = permissions[key] === true;
  });
  
  return result;
}

/**
 * Get user accessible admin pages based on permissions
 */
export function getAccessibleAdminPages(permissions: UserPermissions): string[] {
  const pages: string[] = [];
  
  if (permissions[PERMISSIONS.ACCESS_ADMIN_DASHBOARD]) {
    pages.push('/admin/dashboard');
  }
  if (permissions[PERMISSIONS.ACCESS_USERS_MANAGEMENT]) {
    pages.push('/admin/users');
  }
  if (permissions[PERMISSIONS.ACCESS_PROJECTS_MANAGEMENT]) {
    pages.push('/admin/projects');
  }
  if (permissions[PERMISSIONS.ACCESS_TASKS_MANAGEMENT]) {
    pages.push('/admin/tasks');
  }
  if (permissions[PERMISSIONS.ACCESS_DAILY_UPDATES]) {
    pages.push('/admin/daily-updates');
  }
  if (permissions[PERMISSIONS.ACCESS_ANALYTICS]) {
    pages.push('/admin/analytics');
  }
  if (permissions[PERMISSIONS.ACCESS_FEEDBACK]) {
    pages.push('/admin/feedback');
  }
  if (permissions[PERMISSIONS.ACCESS_PUSH_NOTIFICATIONS]) {
    pages.push('/admin/push-notifications');
  }
  if (permissions[PERMISSIONS.ACCESS_CACHE_MANAGEMENT]) {
    pages.push('/admin/cache');
  }
  
  return pages;
} 