'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogOut, Home, Settings, BarChart3 } from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import Image from 'next/image';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{username: string; id: string} | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  
  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Auto-detect admin status and load user context
  useEffect(() => {
    const updateUserContext = () => {
      if (typeof window !== 'undefined') {
        const globalUser = (window as any).__eyetask_user;
        setUser(globalUser || null);
      }
    };

    // Check for admin pages and load user context
    if (pathname.startsWith('/admin') && pathname !== '/admin') {
      const token = localStorage.getItem('adminToken');
      const userData = localStorage.getItem('adminUser');
      
      if (token && userData && userData !== 'undefined' && userData !== 'null') {
        try {
          const parsedUser = JSON.parse(userData);
          if (parsedUser && parsedUser.id && parsedUser.username) {
            setUser(parsedUser);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    } else {
      setUser(null);
    }

    // Listen for user context changes
    updateUserContext();
    window.addEventListener('userContextChanged', updateUserContext);
    
    return () => {
      window.removeEventListener('userContextChanged', updateUserContext);
    };
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
    if (typeof window !== 'undefined') {
      (window as any).__eyetask_user = null;
      (window as any).__eyetask_isAdmin = false;
    }
    router.push('/admin');
    setMenuOpen(false);
  };

  // Determine current page context
  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin';
  const isAdminLoginPage = pathname === '/admin';
  const isHomePage = pathname === '/';
  const showAdminActions = isAdminPage && user;
  const showLogout = user; // Show logout for any authenticated user
  const showAdminDashboard = user && !isAdminLoginPage; // Show admin dashboard for any logged in user except on login page
  
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-6 w-auto">
              <svg
                viewBox="0 0 407 68"
                className="h-6 w-auto"
                style={{ fill: 'currentColor' }}
              >
                <g>
                  <g>
                    <path d="M70.92,5.85c-0.05,0-0.11,0-0.16,0H43.44L24.11,24.71h8.14h0.01c4.85,0.03,7.38,3.26,7.38,8.33v29.14h19.41l0-37.47h8.06
                      c0.01,0,0.02,0,0.04,0c0.01,0,0.03,0,0.04,0h0.01c4.85,0.03,7.38,3.26,7.38,8.33v29.14h19.41V28.13
                      C93.99,14.5,86.33,5.85,70.92,5.85"/>
                  </g>
                  <polygon points="4.7,43.64 4.7,62.17 24.11,62.17 24.11,24.71"/>
                  <rect x="4.7" y="5.85" width="19.41" height="18.86"/>
                  <g>
                    <path d="M120.72,24.69c2.32-2.95,5.48-4.8,9.77-4.8c4.99,0,8.57,2.19,10.61,5.62c2.39-3.43,6.25-5.62,11.38-5.62
                      c8.5,0,13.07,6.17,13.07,13.57v20.35h-5.76V33.81c0-5.28-2.74-8.91-8.15-8.91c-5.27,0-8.5,4.04-8.5,9.25v19.67h-5.69V33.81
                      c0-5.28-2.74-8.91-8.15-8.91c-5.27,0-8.5,4.04-8.5,9.25v19.67h-5.69v-33.1h5.62V24.69z"/>
                    <path d="M200.86,37.3c0-6.99-5.13-12.61-11.88-12.61c-6.67,0-11.8,5.48-11.8,12.68c0,7.06,5.13,12.61,11.87,12.61
                      C195.73,49.98,200.86,44.5,200.86,37.3 M171.35,37.37c0-9.87,7.66-17.54,17.78-17.54c10.05,0,17.57,7.61,17.57,17.47
                      c0,9.87-7.66,17.54-17.78,17.54C178.87,54.85,171.35,47.24,171.35,37.37"/>
                    <path d="M230.23,49.71c6.67,0,11.74-4.66,11.74-12.4c0-7.74-4.99-12.4-11.52-12.4c-6.6,0-12.08,5.28-12.08,12.54
                      C218.36,44.57,223.7,49.71,230.23,49.71 M212.88,5.85h5.69v20.01c2.95-3.63,7.45-5.89,12.44-5.89c9.06,0,16.79,6.65,16.79,17.2
                      c0,10.76-8.08,17.4-17.07,17.4c-4.78,0-9.28-2.12-12.23-5.69v4.93h-5.62V5.85z"/>
                  </g>
                  <path d="M259.92,53.82h-5.76v-33.1h5.76V53.82z M260.21,15.72h-6.32v-6.1h6.32V15.72z"/>
                  <rect x="268.31" y="5.85" width="5.76" height="47.97"/>
                  <g>
                    <path d="M286.44,34.97h22.34c-0.85-6.44-5.13-10.35-10.89-10.35C292.27,24.63,287.42,28.39,286.44,34.97 M309.91,44.43l3.44,3.08
                      c-3.79,4.8-8.85,7.33-15.39,7.33c-10.12,0-17.42-7.2-17.42-17.47c0-10,7.59-17.47,17.28-17.47c9.7,0,16.72,6.72,16.72,17.06
                      c0,0.89-0.14,1.99-0.21,2.33h-27.89c0.77,6.72,5.9,10.83,12.01,10.83C302.74,50.12,306.6,48.4,309.91,44.43"/>
                  </g>
                  <polygon points="343.97,20.72 333.01,47.03 322.05,20.72 315.79,20.72 330.13,53.54 324.3,66.15 330.2,66.15 349.94,20.72"/>
                  <g>
                    <path d="M357,34.97h22.34c-0.84-6.44-5.13-10.35-10.89-10.35C362.83,24.63,357.98,28.39,357,34.97 M380.47,44.43l3.44,3.08
                      c-3.79,4.8-8.85,7.33-15.39,7.33c-10.12,0-17.43-7.2-17.43-17.47c0-10,7.59-17.47,17.28-17.47c9.7,0,16.72,6.72,16.72,17.06
                      c0,0.89-0.14,1.99-0.21,2.33H357c0.77,6.72,5.9,10.83,12.01,10.83C373.3,50.12,377.17,48.4,380.47,44.43"/>
                  </g>
                  <path d="M402.3,26.19h-1.07v-5.12l-1.83,3.44h-0.92l-1.85-3.49v5.17h-1.07V20h1.64l1.75,3.27l1.71-3.27h1.64V26.19z M389.18,20
                    h5.6v1.02h-2.28v5.17h-1.07v-5.17h-2.25V20z"/>
                </g>
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <h1 className={`text-lg font-bold text-foreground leading-tight ${hebrewHeading.fontClass}`}>
                {isAdminPage ? 'EyeTask - לוח בקרה' : 'EyeTask'}
              </h1>
              <p className={`text-xs text-muted-foreground leading-tight ${mixedBody.fontClass}`}>
                {user ? `שלום ${user.username} | Mobileye${isAdminPage ? ' Admin' : ''}` : 'Mobileye'}
              </p>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {!isHomePage && (
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  דף הבית
                </Link>
              )}
              
              {showAdminActions && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                  >
                    <BarChart3 className="h-4 w-4" />
                    לוח בקרה
                  </Link>
                </>
              )}
              
              {showLogout && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  התנתק
                </button>
              )}
              
              {!showLogout && !isAdminPage && !isAdminLoginPage && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  ניהול מנהל
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="תפריט"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden mt-3 p-3 bg-card rounded-lg border border-border">
            <nav className="space-y-2">
              {!isHomePage && (
                <Link 
                  href="/" 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Home className="h-4 w-4" />
                  דף הבית
                </Link>
              )}
              
              {/* Show admin dashboard for logged-in users */}
              {showAdminDashboard && (
                <Link 
                  href="/admin/dashboard" 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <BarChart3 className="h-4 w-4" />
                  לוח בקרה
                </Link>
              )}
              
              {/* Show logout for logged-in users or login for non-logged users */}
              {showLogout ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full p-2 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors text-right"
                >
                  <LogOut className="h-4 w-4" />
                  התנתק
                </button>
              ) : (
                !isAdminLoginPage && (
                  <Link 
                    href="/admin" 
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    ניהול מנהל
                  </Link>
                )
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
} 