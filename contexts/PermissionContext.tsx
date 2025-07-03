'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PERMISSIONS, UserPermissions } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PermissionContextType {
  permissions: UserPermissions;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const userData = localStorage.getItem('adminUser');
      
      if (!token || !userData) {
        setPermissions({});
        setLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      
      // Get stored permissions from localStorage (set during login)
      const storedPermissions = localStorage.getItem('userPermissions');
      if (storedPermissions) {
        setPermissions(JSON.parse(storedPermissions));
      }
      
      // Fetch fresh permissions from API
      const response = await fetch(`/api/users/${user.id}/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.permissions) {
          const userPermissions: UserPermissions = {};
          Object.entries(data.permissions).forEach(([key, perm]: [string, any]) => {
            userPermissions[key] = perm.value;
          });
          setPermissions(userPermissions);
          localStorage.setItem('userPermissions', JSON.stringify(userPermissions));
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const hasPermission = (permission: string): boolean => {
    return permissions[permission] === true;
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => permissions[permission] === true);
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(permission => permissions[permission] === true);
  };

  const refreshPermissions = async () => {
    setLoading(true);
    await fetchPermissions();
  };

  const value: PermissionContextType = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading,
    refreshPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// Hook to check permission and redirect if not allowed
export function useRequirePermission(permission: string, redirectTo: string = '/admin/dashboard') {
  const { hasPermission, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !hasPermission(permission)) {
      toast.error('אין לך הרשאה לגשת לדף זה');
      router.push(redirectTo);
    }
  }, [loading, permission, hasPermission, router, redirectTo]);

  return { hasPermission: hasPermission(permission), loading };
} 