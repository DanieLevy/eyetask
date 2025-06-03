'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  username: string;
}

interface AdminClientLayoutProps {
  children: React.ReactNode;
}

export default function AdminClientLayout({ children }: AdminClientLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run on admin pages
    if (!pathname.startsWith('/admin')) {
      setIsLoading(false);
      return;
    }

    // Skip auth check for login page
    if (pathname === '/admin') {
      setIsLoading(false);
      return;
    }

    // Check authentication for protected admin pages
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      const userData = localStorage.getItem('adminUser');
      
      if (!token || !userData || userData === 'undefined' || userData === 'null') {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.push('/admin');
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser || !parsedUser.id || !parsedUser.username) {
          throw new Error('Invalid user data structure');
        }
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.push('/admin');
        return;
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  // Update global header context when user changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store user context globally for header component
      (window as any).__eyetask_user = user;
      (window as any).__eyetask_isAdmin = pathname.startsWith('/admin') && pathname !== '/admin';
      
      // Trigger a custom event to notify header component
      window.dispatchEvent(new CustomEvent('userContextChanged', { 
        detail: { user, isAdmin: pathname.startsWith('/admin') && pathname !== '/admin' }
      }));
    }
  }, [user, pathname]);

  if (isLoading && pathname.startsWith('/admin') && pathname !== '/admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">בודק אימות...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 