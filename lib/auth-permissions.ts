import { AuthUser } from './auth-supabase';
import { getUserPermissions } from './permissions';
import { logger } from './logger';

/**
 * Check if a user has a specific permission
 * This is the main function that should be used for all permission checks
 */
export async function hasPermission(
  user: AuthUser | null,
  permission: string
): Promise<boolean> {
  if (!user) {
    logger.warn('Permission check called with no user', 'AUTH_PERMISSIONS');
    return false;
  }

  // Admin role always has all permissions
  if (user.role === 'admin') {
    return true;
  }

  try {
    // Get user's actual permissions from database
    const permissions = await getUserPermissions(user.id);
    const hasAccess = permissions[permission] === true;
    
    logger.info('Permission check', 'AUTH_PERMISSIONS', {
      userId: user.id,
      permission,
      hasAccess,
      role: user.role
    });
    
    return hasAccess;
  } catch (error) {
    logger.error('Error checking permission', 'AUTH_PERMISSIONS', {
      userId: user.id,
      permission,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Check if a user has any of the specified permissions
 */
export async function hasAnyPermission(
  user: AuthUser | null,
  permissions: string[]
): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const userPermissions = await getUserPermissions(user.id);
  return permissions.some(permission => userPermissions[permission] === true);
}

/**
 * Check if a user has all of the specified permissions
 */
export async function hasAllPermissions(
  user: AuthUser | null,
  permissions: string[]
): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const userPermissions = await getUserPermissions(user.id);
  return permissions.every(permission => userPermissions[permission] === true);
}

/**
 * Require a specific permission for API routes
 * Throws an error if the user doesn't have the permission
 */
export async function requirePermission(
  user: AuthUser | null,
  permission: string
): Promise<void> {
  const hasAccess = await hasPermission(user, permission);
  if (!hasAccess) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Get a user's permissions with caching
 */
let permissionCache: Map<string, { permissions: Record<string, boolean>; timestamp: number }> = new Map();
const CACHE_TTL = 60000; // 1 minute cache

export async function getCachedUserPermissions(userId: string): Promise<Record<string, boolean>> {
  const cached = permissionCache.get(userId);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  const permissions = await getUserPermissions(userId);
  permissionCache.set(userId, { permissions, timestamp: Date.now() });
  
  // Clean old cache entries
  if (permissionCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of permissionCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        permissionCache.delete(key);
      }
    }
  }
  
  return permissions;
}

/**
 * Clear permission cache for a user
 */
export function clearPermissionCache(userId?: string) {
  if (userId) {
    permissionCache.delete(userId);
  } else {
    permissionCache.clear();
  }
} 