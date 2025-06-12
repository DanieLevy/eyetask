'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, 
  LogOut, 
  Home, 
  Settings, 
  BarChart3, 
  MessageCircle,
  ChevronRight,
  Search
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import ThemeToggle from '@/components/ThemeToggle';
import HeaderDebugIcon from '@/components/HeaderDebugIcon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/CommandPalette';

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

export default function Header() {
  const [user, setUser] = useState<{username: string; id: string} | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Check if we're on the homepage
  const isHomePage = pathname === '/';
  
  // Check if we're on the admin login page
  const isAdminLoginPage = pathname === '/admin';
  
  // Determine if we should show the logout button (user is logged in)
  const [showLogout, setShowLogout] = useState(false);
  
  // Determine if we should show admin dashboard (user is admin)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Prevent hydration mismatch by only showing dynamic content after mount
  useEffect(() => {
    setMounted(true);
    
    // Check if user is logged in
    if (typeof window !== 'undefined') {
      const userData = window.__eyetask_user;
      const isAdmin = window.__eyetask_isAdmin;
      
      if (userData) {
        setUser(userData);
        setShowLogout(true);
      }
      
      if (isAdmin) {
        setShowAdminDashboard(true);
      }
    }
    
    // Initialize the screen size detection
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 380);
    };
    
    // Check on mount
    checkScreenSize();
    
    // Add listener for resize events
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const handleLogout = () => {
    // Clear any user data
    if (typeof window !== 'undefined') {
      window.__eyetask_user = null;
      window.__eyetask_isAdmin = false;
      
      // Clear any stored tokens
      localStorage.removeItem('adminToken');
      
      // Redirect to homepage
      router.push('/');
    }
  };
  
  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-2 sm:px-4 py-1 sm:py-2">
        <div className="flex items-center justify-between relative">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity">
            <div className={`h-5 sm:h-6 w-auto ${isSmallScreen ? 'scale-75' : ''}`}>
              <svg
                viewBox="0 0 407 68"
                className="h-full w-auto"
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
                    <path d="M357,34.97h22.34c-0.84-6.44-5.13-10.35-10.89-10.35C362.83,24.63,357.98,28.39,357,34.97 M380.47,44.43l3.44,3.08
                      c-3.79,4.8-8.85,7.33-15.39,7.33c-10.12,0-17.43-7.2-17.43-17.47c0-10,7.59-17.47,17.28-17.47c9.7,0,16.72,6.72,16.72,17.06
                      c0,0.89-0.14,1.99-0.21,2.33H357c0.77,6.72,5.9,10.83,12.01,10.83C373.3,50.12,377.17,48.4,380.47,44.43"/>
                  </g>
                  <path d="M402.3,26.19h-1.07v-5.12l-1.83,3.44h-0.92l-1.85-3.49v5.17h-1.07V20h1.64l1.75,3.27l1.71-3.27h1.64V26.19z M389.18,20
                    h5.6v1.02h-2.28v5.17h-1.07v-5.17h-2.25V20z"/>
                </g>
              </svg>
            </div>
          </Link>

          {/* Center - App Name and Search */}
          <div className="flex items-center justify-center absolute left-1/2 transform -translate-x-1/2 gap-2">
            <h1 className={`text-sm sm:text-lg font-semibold text-foreground ${hebrewHeading.fontClass} whitespace-nowrap overflow-hidden text-ellipsis`}>
              Driver Tasks
            </h1>
            
            {/* Only show search on larger screens and when user is authenticated */}
            {mounted && showAdminDashboard && !isSmallScreen && (
              <div className="hidden sm:block ml-2">
                <CommandPalette>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 h-8 text-xs text-muted-foreground"
                  >
                    <Search className="h-3 w-3" />
                    <span className="hidden md:inline-block">חיפוש מהיר</span>
                    <kbd className="hidden md:inline-flex pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </Button>
                </CommandPalette>
              </div>
            )}
          </div>

          {/* Actions - Debug Icon, Theme Toggle and Mobile Menu Button */}
          <div className="flex items-center gap-0.5 sm:gap-1 relative z-10">
            {/* Show command palette trigger on small screens for admin users */}
            {mounted && showAdminDashboard && isSmallScreen && (
              <CommandPalette>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </CommandPalette>
            )}
          
            {/* Debug Report Icon */}
            <div className={isSmallScreen ? "scale-75" : ""}>
              <HeaderDebugIcon />
            </div>
            
            {/* Theme Toggle */}
            <div className={isSmallScreen ? "scale-75" : ""}>
              <ThemeToggle />
            </div>
            
            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`${isSmallScreen ? 'h-8 w-8' : 'h-9 w-9'}`}
                  aria-label="תפריט"
                >
                  <Menu className={`${isSmallScreen ? 'h-4 w-4' : 'h-5 w-5'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Only show when mounted to prevent hydration mismatch */}
                {mounted && (
                  <>
                    {!isHomePage && (
                      <DropdownMenuItem asChild>
                        <Link href="/" className="flex items-center gap-2 w-full cursor-pointer">
                          <Home className="h-4 w-4" />
                          עמוד הבית
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {showAdminDashboard && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/dashboard" className="flex items-center gap-2 w-full cursor-pointer">
                            <BarChart3 className="h-4 w-4" />
                            פאנל ניהול משימות
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/feedback" className="flex items-center gap-2 w-full cursor-pointer">
                            <MessageCircle className="h-4 w-4" />
                            ניהול פניות ודיווחים
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {showLogout ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={handleLogout}
                          className="flex items-center gap-2 text-destructive cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" />
                          יציאה מהמערכת
                        </DropdownMenuItem>
                      </>
                    ) : (
                      !isAdminLoginPage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/admin" className="flex items-center gap-2 w-full cursor-pointer">
                              <Settings className="h-4 w-4" />
                              פאנל ניהול משימות
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
} 