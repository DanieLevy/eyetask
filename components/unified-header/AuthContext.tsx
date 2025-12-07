'use client';

import { useRouter, usePathname } from 'next/navigation';
import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { UserData } from './types';

interface AuthContextType {
  user: UserData | null;
  isAdmin: boolean;
  isLoading: boolean;
  userPermissions: Record<string, boolean>;
  login: (token: string, userData: UserData, permissions?: Record<string, boolean>) => void;
  logout: () => void;
  verifyAuth: () => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  userPermissions: {},
  login: () => {},
  logout: () => {},
  verifyAuth: async () => false,
  refreshPermissions: async () => {},
  hasPermission: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const pathname = usePathname();
  const hasUserRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Verify authentication status
  const verifyAuth = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsLoading(false);
        return false;
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        const isAdminUser = userData.role === 'admin';
        
        // Set user state
        setUser(userData);
        setIsAdmin(isAdminUser);
        
        // Set permissions from verify response or fetch them
        if (data.permissions) {
          setUserPermissions(data.permissions);
        } else {
          // Will be refreshed after verifyAuth completes
        }
        
        setIsLoading(false);
        return true;
      } else {
        // Invalid token
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setUser(null);
        setIsAdmin(false);
        setUserPermissions({});
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Auth verification error:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Refresh user permissions from the server
  const refreshPermissions = useCallback(async () => {
    logger.debug('[AuthContext] Refreshing permissions...', 'AUTH');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token || !hasUserRef.current) {
        logger.debug('[AuthContext] No token or user, skipping refresh', 'AUTH');
        return;
      }

      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.permissions) {
          setUserPermissions(data.permissions);
          
          // Only update user data if it actually changed
          if (data.user) {
            const currentUserStr = localStorage.getItem('adminUser');
            const newUserStr = JSON.stringify(data.user);
            
            // Only update if the user data actually changed
            if (currentUserStr !== newUserStr) {
              logger.debug('[AuthContext] User data changed, updating...', 'AUTH');
              setUser(data.user);
              setIsAdmin(data.user.role === 'admin');
              localStorage.setItem('adminUser', newUserStr);
              
              // Check if username was changed
              const currentUser = JSON.parse(currentUserStr || '{}');
              if (currentUser.username !== data.user.username) {
                logger.debug(`[AuthContext] Username changed from ${currentUser.username} to ${data.user.username}`, 'AUTH');
                // The username change will be reflected in the UI automatically
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh permissions:', error);
    }
  }, []);

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    // Admin users always have all permissions
    if (isAdmin || user?.role === 'admin') {
      logger.debug(`[AuthContext] Permission check for ${permission}: ✅ (admin user)`, 'AUTH');
      return true;
    }
    
    const hasAccess = userPermissions[permission] === true;
    logger.debug(`[AuthContext] Permission check for ${permission}: ${hasAccess ? '✅' : '❌'}`, 'AUTH', {
      user: user?.username,
      role: user?.role,
      userPermissions: Object.keys(userPermissions).filter(k => userPermissions[k])
    });
    
    return hasAccess;
  };

  // Login function
  const login = useCallback((token: string, userData: UserData, permissions?: Record<string, boolean>) => {
    logger.debug('AuthContext login called', 'AUTH', { userData, permissions });
    
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(userData));
    
    setUser(userData);
    setIsAdmin(userData.role === 'admin');
    setIsLoading(false); // Important: Set loading to false after login
    
    if (permissions) {
      setUserPermissions(permissions);
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
    }
    
    // Determine redirect path
    const intendedDestination = localStorage.getItem('intendedDestination');
    let redirectPath = '/admin/dashboard'; // Default
    
    if (intendedDestination && intendedDestination !== '/admin') {
      localStorage.removeItem('intendedDestination');
      redirectPath = intendedDestination;
    } else if (permissions) {
      // Default redirect based on permissions
      if (permissions['access.admin_dashboard']) {
        redirectPath = '/admin/dashboard';
      } else if (permissions['access.tasks_management']) {
        redirectPath = '/admin/tasks';
      } else if (permissions['access.projects_management']) {
        redirectPath = '/admin/projects';
      } else if (permissions['access.daily_updates']) {
        redirectPath = '/admin/daily-updates';
      } else if (permissions['access.feedback']) {
        redirectPath = '/admin/feedback';
      }
    }
    
    logger.debug(`Redirecting to: ${redirectPath}`, 'AUTH');
    
    // Use window.location for reliable redirect
    window.location.href = redirectPath;
  }, []);

  // Logout function  
  const logout = async () => {
    // Stop the refresh interval
    stopRefreshInterval();
    
    try {
      // Call logout API endpoint
      const token = localStorage.getItem('adminToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    }
    
    // Clear local storage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('intendedDestination');
    
    // Clear state
    setUser(null);
    setIsAdmin(false);
    setUserPermissions({});
    hasUserRef.current = false;
    
    // Force redirect to login
    window.location.href = '/admin';
  };

  // Function to start the refresh interval
  const startRefreshInterval = useCallback(() => {
    // Enable moderate refresh to sync username changes
    // Use 5 minute interval to avoid too many requests
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    logger.debug('[AuthContext] Starting permission refresh interval (5 minutes)', 'AUTH');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      logger.debug('[AuthContext] Running periodic permission refresh', 'AUTH');
      refreshPermissions();
    }, REFRESH_INTERVAL);
  }, [refreshPermissions]);

  // Function to stop the refresh interval
  const stopRefreshInterval = useCallback(() => {
    if (intervalRef.current) {
      logger.debug('[AuthContext] Stopping refresh interval', 'AUTH');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Manual permission refresh - call this after updating permissions
  const manualRefreshPermissions = async () => {
    logger.debug('[AuthContext] Manual permission refresh triggered', 'AUTH');
    await refreshPermissions();
  };

  // Update hasUserRef when user changes
  useEffect(() => {
    hasUserRef.current = !!user;
    
    // Start refresh interval when user is logged in
    if (user) {
      logger.debug('[AuthContext] User logged in, starting refresh interval', 'AUTH');
      startRefreshInterval();
    } else {
      stopRefreshInterval();
    }
  }, [user, startRefreshInterval, stopRefreshInterval]);

  // Initial auth check
  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRefreshInterval();
    };
  }, [stopRefreshInterval]);

  // Store intended destination when not authenticated
  useEffect(() => {
    if (pathname && pathname.startsWith('/admin') && pathname !== '/admin' && !user && !isLoading) {
      localStorage.setItem('intendedDestination', pathname);
      router.push('/admin');
    }
  }, [pathname, user, isLoading, router]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      isLoading, 
      userPermissions,
      login, 
      logout, 
      verifyAuth,
      refreshPermissions: manualRefreshPermissions, // Use manual refresh
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 