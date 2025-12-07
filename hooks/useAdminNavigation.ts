import { BarChart3, CheckSquare, FolderOpen, MessageCircle, Home, Calendar, Users, Bell, HardDrive } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/components/unified-header/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  isExternal?: boolean;
  permission?: string | null;
}

const adminNavigationConfig: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'לוח בקרה',
    href: '/admin/dashboard',
    icon: BarChart3,
    permission: PERMISSIONS.ACCESS_ADMIN_DASHBOARD
  },
  {
    id: 'users',
    label: 'משתמשים',
    href: '/admin/users',
    icon: Users,
    permission: PERMISSIONS.ACCESS_USERS_MANAGEMENT
  },
  {
    id: 'projects',
    label: 'פרויקטים',
    href: '/admin/projects',
    icon: FolderOpen,
    permission: PERMISSIONS.ACCESS_PROJECTS_MANAGEMENT
  },
  {
    id: 'tasks',
    label: 'משימות',
    href: '/admin/tasks',
    icon: CheckSquare,
    permission: PERMISSIONS.ACCESS_TASKS_MANAGEMENT
  },
  {
    id: 'daily-updates',
    label: 'עדכונים יומיים',
    href: '/admin/daily-updates',
    icon: Calendar,
    permission: PERMISSIONS.ACCESS_DAILY_UPDATES
  },
  {
    id: 'analytics',
    label: 'אנליטיקה',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: PERMISSIONS.ACCESS_ANALYTICS
  },
  {
    id: 'feedback',
    label: 'משוב',
    href: '/admin/feedback',
    icon: MessageCircle,
    permission: PERMISSIONS.ACCESS_FEEDBACK
  },
  {
    id: 'push-notifications',
    label: 'התראות Push',
    href: '/admin/push-notifications',
    icon: Bell,
    permission: PERMISSIONS.ACCESS_PUSH_NOTIFICATIONS
  },
  {
    id: 'cache',
    label: 'ניהול מטמון',
    href: '/admin/cache',
    icon: HardDrive,
    permission: PERMISSIONS.ACCESS_CACHE_MANAGEMENT
  }
];

// Main navigation items for all users
const mainNavigationConfig: NavigationItem[] = [
  {
    id: 'home',
    label: 'דף הבית',
    href: '/',
    icon: Home,
    permission: null // No permission required
  }
];

export function useAdminNavigation() {
  const pathname = usePathname();
  const { user, userPermissions, isLoading, refreshPermissions } = useAuth();
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Filter navigation items based on permissions
  const navigationItems = useMemo(() => {
    if (!user || isLoading) return [];

    // For admin header navigation
    const adminItems = adminNavigationConfig.filter(item => {
      // If no permission is required, show the item
      if (!item.permission) return true;
      
      // Check if user has the required permission
      return userPermissions[item.permission] === true;
    });

    // Update active state based on current pathname
    return adminItems.map(item => ({
      ...item,
      isActive: pathname?.startsWith(item.href) || false
    }));
  }, [user, userPermissions, pathname, isLoading]);

  // Main navigation items (no permission filtering needed)
  const mainNavItems = useMemo(() => {
    return mainNavigationConfig.map(item => ({
      ...item,
      isActive: pathname === item.href
    }));
  }, [pathname]);

  // Remove automatic refresh - let AuthContext handle it
  // This was causing duplicate calls to refreshPermissions

  // Provide a method to force refresh
  const forceRefresh = async () => {
    if (refreshPermissions) {
      await refreshPermissions();
      setLastRefresh(Date.now());
    }
  };

  return {
    navigationItems,
    mainNavItems,
    isLoading,
    hasPermissions: Object.keys(userPermissions).length > 0,
    forceRefresh,
    lastRefresh
  };
} 