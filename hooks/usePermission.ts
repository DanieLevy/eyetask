import { useAuth } from '@/components/unified-header/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * Hook to check if the current user has a specific permission
 * @param permission - The permission key to check
 * @returns boolean indicating if user has the permission
 */
export function usePermission(permission: string): boolean {
  const { hasPermission, isLoading } = useAuth();
  
  // Return the actual permission state directly
  // If still loading, return false to prevent access until we know for sure
  if (isLoading) {
    return false;
  }
  
  const access = hasPermission(permission);
  // Permission check logged via AuthContext
  return access;
}

/**
 * Hook to check multiple permissions at once
 * @param permissions - Array of permission keys to check
 * @returns Object with permission keys as properties and boolean values
 */
export function usePermissions(permissions: string[]): Record<string, boolean> {
  const { hasPermission, isLoading } = useAuth();
  
  if (isLoading) {
    // Return all false while loading
    return permissions.reduce((acc, permission) => {
      acc[permission] = false;
      return acc;
    }, {} as Record<string, boolean>);
  }
  
  const accessMap: Record<string, boolean> = {};
  permissions.forEach(permission => {
    accessMap[permission] = hasPermission(permission);
  });
  
  return accessMap;
}

/**
 * Hook to check if user has any of the specified permissions
 * @param permissions - Array of permission keys to check
 * @returns boolean indicating if user has at least one of the permissions
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { hasPermission, isLoading } = useAuth();
  
  if (isLoading) {
    return false;
  }
  
  return permissions.some(permission => hasPermission(permission));
}

/**
 * Hook to check if user has all of the specified permissions
 * @param permissions - Array of permission keys to check
 * @returns boolean indicating if user has all the permissions
 */
export function useAllPermissions(permissions: string[]): boolean {
  const { hasPermission, isLoading } = useAuth();
  
  if (isLoading) {
    return false;
  }
  
  return permissions.every(permission => hasPermission(permission));
}

// Export commonly used permission checks as hooks
export const useCanViewAnalytics = () => usePermission(PERMISSIONS.ACCESS_ANALYTICS);
export const useCanManageUsers = () => usePermission(PERMISSIONS.ACCESS_USERS_MANAGEMENT);
export const useCanManageProjects = () => usePermission(PERMISSIONS.ACCESS_PROJECTS_MANAGEMENT);
export const useCanManageTasks = () => usePermission(PERMISSIONS.ACCESS_TASKS_MANAGEMENT);
export const useCanManageDailyUpdates = () => usePermission(PERMISSIONS.ACCESS_DAILY_UPDATES);
export const useCanViewFeedback = () => usePermission(PERMISSIONS.ACCESS_FEEDBACK);
export const useCanManagePushNotifications = () => usePermission(PERMISSIONS.ACCESS_PUSH_NOTIFICATIONS);
export const useCanManageCache = () => usePermission(PERMISSIONS.ACCESS_CACHE_MANAGEMENT); 