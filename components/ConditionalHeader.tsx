'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AdminHeaderNav from '@/components/AdminHeaderNav';

interface UserData {
  username: string;
  id: string;
}

// Define global window properties
declare global {
  interface Window {
    __eyetask_user?: UserData | null;
    __eyetask_isAdmin?: boolean;
  }
}

export default function ConditionalHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ username: string; id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Get admin status and user info on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('adminToken');
      const userData = localStorage.getItem('adminUser');
      
      if (adminToken) {
        setIsAdmin(true);
        
        // Set global flag for other components
        window.__eyetask_isAdmin = true;
      }
      
      if (userData && userData !== 'undefined' && userData !== 'null') {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          
          // Set global user for other components
          window.__eyetask_user = parsedUser;
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }, []);

  // Get title based on current path
  const getAdminTitle = (): string => {
    if (pathname?.includes('/admin/dashboard')) return 'לוח בקרה';
    if (pathname?.includes('/admin/tasks')) return 'ניהול משימות';
    if (pathname?.includes('/admin/projects')) return 'ניהול פרויקטים';
    if (pathname?.includes('/admin/feedback')) return 'ניהול פניות';
    if (pathname?.includes('/admin/analytics')) return 'אנליטיקס';
    if (pathname?.includes('/admin/daily-updates')) return 'עדכונים יומיים';
    if (pathname?.includes('/admin/performance-monitoring')) return 'ניטור ביצועים';
    return 'ניהול מערכת';
  };

  // Admin pages
  if (pathname?.startsWith('/admin') && pathname !== '/admin') {
    return (
      <AppHeader
        title={getAdminTitle()}
        subtitle={user ? `שלום, ${user.username}` : undefined}
        variant="admin"
        showLogo={true}
        showAdmin={true}
        showSearch={true}
        backHref="/"
        backLabel="עמוד הבית"
        actions={<AdminHeaderNav className="hidden md:flex" />}
        headerActions={[
          {
            label: 'יציאה',
            icon: <LogOut className="h-4 w-4" />,
            onClick: () => {
              // The logout logic is handled by the AppHeader component
              // No need to duplicate it here
            },
            variant: 'destructive'
          }
        ]}
      />
    );
  }
  
  // Non-admin pages
  return <AppHeader showSearch={false} />;
} 