'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, CheckSquare, FolderOpen, MessageCircle, Home, PlusCircle } from 'lucide-react';
import { HeaderVariant, UnifiedHeaderProps, NavigationItem } from './types';
import { useAuth } from './AuthContext';

interface RouteConfig extends Partial<UnifiedHeaderProps> {
  pattern: string | RegExp;
  exact?: boolean;
}

// Helper function to match routes, supporting patterns
const matchRoute = (pathname: string, pattern: string | RegExp, exact = false): boolean => {
  if (pattern instanceof RegExp) {
    return pattern.test(pathname);
  }
  
  // Replace :param with a regex pattern for matching
  if (pattern.includes(':')) {
    const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}${exact ? '$' : ''}`);
    return regex.test(pathname);
  }
  
  return exact ? pathname === pattern : pathname.startsWith(pattern);
};

// Get admin navigation items with active state based on current pathname
const getAdminNavigationItems = (pathname: string): NavigationItem[] => {
  return [
    {
      id: 'dashboard',
      label: 'לוח בקרה',
      href: '/admin/dashboard',
      icon: BarChart3,
      isActive: pathname.includes('/admin/dashboard')
    },
    {
      id: 'tasks',
      label: 'משימות',
      href: '/admin/tasks',
      icon: CheckSquare,
      isActive: pathname.includes('/admin/tasks')
    },
    {
      id: 'projects',
      label: 'פרויקטים',
      href: '/admin/projects',
      icon: FolderOpen,
      isActive: pathname.includes('/admin/projects')
    },
    {
      id: 'feedback',
      label: 'פניות',
      href: '/admin/feedback',
      icon: MessageCircle,
      isActive: pathname.includes('/admin/feedback')
    },
    {
      id: 'home',
      label: 'ראשי',
      href: '/',
      icon: Home,
      isActive: false
    }
  ];
};

// Route configuration map - each route pattern maps to header props
const routeConfigs: RouteConfig[] = [
  // Homepage
  {
    pattern: '/',
    exact: true,
    variant: 'default',
    title: 'Driver Tasks',
    showSearch: false,
    showBackButton: false
  },
  // Admin routes
  {
    pattern: '/admin/dashboard',
    variant: 'admin',
    title: 'לוח בקרה',
    showSearch: true,
    navigationItems: [], // Will be populated dynamically
    actions: [], // Will be populated dynamically
    showBackButton: true,
    backHref: '/',
    backLabel: 'עמוד הבית'
  },
  {
    pattern: '/admin/analytics',
    variant: 'admin',
    title: 'ניתוח נתונים',
    subtitle: 'מעקב אחר פעילות המערכת',
    showSearch: false,
    navigationItems: [], // Will be populated dynamically
    backHref: '/admin/dashboard',
    backLabel: 'חזרה ללוח בקרה'
  },
  {
    pattern: '/admin/tasks',
    variant: 'admin',
    title: 'ניהול משימות',
    showSearch: true,
    actions: [
      {
        id: 'add-task',
        label: 'משימה חדשה',
        icon: PlusCircle,
        href: '/admin/tasks/new',
        variant: 'default'
      }
    ]
  },
  {
    pattern: '/admin/tasks/:taskId',
    variant: 'admin',
    title: 'פרטי משימה',
    showSearch: true,
    backHref: '/admin/tasks',
    backLabel: 'חזרה למשימות'
  },
  {
    pattern: '/admin/tasks/:taskId/edit',
    variant: 'admin',
    title: 'עריכת משימה',
    showSearch: false,
    backHref: '/admin/tasks',
    backLabel: 'חזרה למשימות'
  },
  {
    pattern: '/admin/projects',
    variant: 'admin',
    title: 'ניהול פרויקטים',
    showSearch: true,
    actions: [
      {
        id: 'add-project',
        label: 'פרויקט חדש',
        icon: PlusCircle,
        href: '/admin/projects/new',
        variant: 'default'
      }
    ]
  },
  {
    pattern: '/admin/projects/:projectId',
    variant: 'admin',
    title: 'פרטי פרויקט',
    showSearch: true,
    backHref: '/admin/projects',
    backLabel: 'חזרה לפרויקטים'
  },
  {
    pattern: '/admin/feedback',
    variant: 'admin',
    title: 'ניהול פניות',
    showSearch: true
  },
  // Daily updates routes
  {
    pattern: '/admin/daily-updates',
    variant: 'admin',
    title: 'עדכונים יומיים',
    showSearch: true,
    actions: [
      {
        id: 'add-update',
        label: 'עדכון חדש',
        icon: PlusCircle,
        href: '/admin/daily-updates/new',
        variant: 'default'
      }
    ]
  },
  {
    pattern: '/admin/daily-updates/new',
    variant: 'admin',
    title: 'עדכון יומי חדש',
    backHref: '/admin/daily-updates',
    backLabel: 'חזרה לעדכונים יומיים'
  },
  {
    pattern: '/admin/daily-updates/:id/edit',
    variant: 'admin',
    title: 'עריכת עדכון יומי',
    backHref: '/admin/daily-updates',
    backLabel: 'חזרה לעדכונים יומיים'
  },
  // Project routes
  {
    pattern: '/project/:projectName',
    variant: 'project',
    showSearch: false,
    backHref: '/',
    backLabel: 'חזרה לעמוד הבית'
  }
];

interface HeaderContextType {
  getConfigForCurrentRoute: () => Partial<UnifiedHeaderProps>;
}

const HeaderContext = createContext<HeaderContextType>({
  getConfigForCurrentRoute: () => ({})
});

export const HeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { isAdmin, verifyAuth } = useAuth();
  const router = useRouter();
  
  // Effect to verify auth when navigating to admin routes
  useEffect(() => {
    const checkAuth = async () => {
      // Only check auth for admin routes, excluding the login page itself
      if (pathname?.startsWith('/admin') && pathname !== '/admin') {
        // If in admin route but not logged in as admin, verify auth
        if (!isAdmin) {
          const isAuthenticated = await verifyAuth();
          
          // If still not authenticated after verification, redirect to login
          if (!isAuthenticated) {
            router.push('/admin');
          }
        }
      }
    };
    
    // Only run auth check on admin pages
    if (pathname?.startsWith('/admin')) {
      checkAuth();
    }
  }, [pathname, isAdmin, verifyAuth, router]);
  
  const getConfigForCurrentRoute = (): Partial<UnifiedHeaderProps> => {
    // Find matching route config
    const matchingConfig = routeConfigs.find(config => 
      matchRoute(pathname || '', config.pattern, config.exact)
    ) || {} as Partial<UnifiedHeaderProps>;
    
    // Check if we're in admin area
    const isAdminRoute = pathname?.startsWith('/admin') && pathname !== '/admin';
    
    // Merge with base config
    const baseConfig: Partial<UnifiedHeaderProps> = {
      showLogo: true,
      showUserMenu: true,
      showThemeToggle: true,
    };
    
    // Add dynamic navigation items for admin routes
    if (isAdminRoute && !matchingConfig.navigationItems) {
      matchingConfig.navigationItems = getAdminNavigationItems(pathname || '');
    }
    
    return {
      ...baseConfig,
      ...matchingConfig
    };
  };
  
  return (
    <HeaderContext.Provider value={{ getConfigForCurrentRoute }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeaderContext = () => useContext(HeaderContext);

export default HeaderContext; 