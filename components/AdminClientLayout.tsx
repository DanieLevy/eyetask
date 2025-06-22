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

// Enhanced authentication state management
type AuthState = 'checking' | 'authenticated' | 'unauthenticated' | 'redirecting';

export default function AdminClientLayout({ children }: AdminClientLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>('checking');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run on admin pages
    if (!pathname.startsWith('/admin')) {
      setAuthState('authenticated'); // Non-admin pages don't need auth
      return;
    }

    // Skip auth check for login page
    if (pathname === '/admin') {
      setAuthState('unauthenticated'); // Login page should show immediately
      return;
    }

    // Fast synchronous auth check for protected admin pages
    const checkAuthSync = () => {
      try {
        const token = localStorage.getItem('adminToken');
        const userData = localStorage.getItem('adminUser');
        
        // Quick validation
        if (!token || !userData || userData === 'undefined' || userData === 'null') {
          setAuthState('redirecting');
          // Clear invalid data
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          router.replace('/admin'); // Use replace to avoid back button issues
          return;
        }

        // Parse and validate user data
        const parsedUser = JSON.parse(userData);
        if (!parsedUser || !parsedUser.id || !parsedUser.username) {
          setAuthState('redirecting');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          router.replace('/admin');
          return;
        }

        // Successfully authenticated
        setUser(parsedUser);
        setAuthState('authenticated');
      } catch (error) {
        console.error('Error checking authentication:', error);
        setAuthState('redirecting');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.replace('/admin');
      }
    };

    // Run immediately - no async delay
    checkAuthSync();
  }, [pathname, router]);

  // Update global header context when user changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store user context globally for header component
              (window as any).__drivertasks_user = user;
        (window as any).__drivertasks_isAdmin = pathname.startsWith('/admin') && pathname !== '/admin';
      
      // Trigger a custom event to notify header component
      window.dispatchEvent(new CustomEvent('userContextChanged', { 
        detail: { user, isAdmin: pathname.startsWith('/admin') && pathname !== '/admin' }
      }));
    }
  }, [user, pathname]);

  // Handle different auth states
  if (authState === 'checking' || authState === 'redirecting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {authState === 'checking' ? 'בודק אימות...' : 'מעביר לכניסה...'}
          </p>
        </div>
      </div>
    );
  }

  // Render content for authenticated or public pages
  return <>{children}</>;
} 