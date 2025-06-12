'use client';

import React, { useState, useEffect } from 'react';
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
  Search,
  RefreshCw,
  X,
  MoreVertical,
  ArrowRight,
  Plus,
  CheckSquare,
  FolderOpen
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import ThemeToggle from '@/components/ThemeToggle';
import HeaderDebugIcon from '@/components/HeaderDebugIcon';
import AdminHeaderNav from '@/components/AdminHeaderNav';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/CommandPalette';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import MobileyeLogoIcon from '@/components/icons/MobileyeLogoIcon';

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

interface HeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link";
}

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  showLogo?: boolean;
  showTitle?: boolean;
  showSearch?: boolean;
  showAdmin?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode;
  headerActions?: HeaderAction[];
  variant?: 'default' | 'admin' | 'minimal' | 'dynamic';
  className?: string;
}

export default function AppHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  showLogo = true,
  showTitle = true,
  showSearch = true,
  showAdmin = true,
  isLoading = false,
  onRefresh,
  actions,
  headerActions = [],
  variant = 'default',
  className
}: AppHeaderProps) {
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
  
  // Check if we're in the admin area
  const isAdminArea = pathname?.startsWith('/admin') && pathname !== '/admin';
  
  // Set appropriate title if not provided
  const displayTitle = title || (isAdminArea ? 'ניהול מערכת' : 'Driver Tasks');
  
  // Determine if we should show the logout button (user is logged in)
  const [showLogout, setShowLogout] = useState(false);
  
  // Determine if we should show admin dashboard (user is admin)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Prevent hydration mismatch by only showing dynamic content after mount
  useEffect(() => {
    setMounted(true);
    
    // Check if user is logged in
    if (typeof window !== 'undefined') {
      // Get user information from global context or localStorage
      const userData = window.__eyetask_user;
      const isAdmin = window.__eyetask_isAdmin;
      const adminToken = localStorage.getItem('adminToken');
      const adminUser = localStorage.getItem('adminUser');
      
      // Set user from either global or local storage
      if (userData) {
        setUser(userData);
        setShowLogout(true);
      } else if (adminUser && adminUser !== 'undefined' && adminUser !== 'null') {
        try {
          const parsedUser = JSON.parse(adminUser);
          setUser(parsedUser);
          setShowLogout(true);
        } catch (error) {
          console.error('Error parsing admin user data:', error);
        }
      }
      
      // Set admin dashboard visibility
      setShowAdminDashboard(!!(isAdmin || adminToken));
    }
    
    // Initialize the screen size detection
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };
    
    // Check on mount
    checkScreenSize();
    
    // Add listener for resize events
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      
      // Clean up references to avoid memory leaks
      if (typeof window !== 'undefined') {
        // Don't clear global state on unmount, only on logout
        // This prevents login state from being lost during navigation
      }
    };
  }, []);

  // Logout handler - works for both regular users and admin
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      // Clear global state
      window.__eyetask_user = null;
      window.__eyetask_isAdmin = false;
      
      // Clear any stored tokens
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      
      // Redirect to appropriate page
      if (isAdminArea) {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  };

  // Determine header actions based on variant
  const allHeaderActions: HeaderAction[] = [
    ...headerActions,
    ...(isAdminArea && !headerActions.some(action => action.label === 'יציאה') ? [
      {
        label: 'יציאה',
        icon: <LogOut className="h-4 w-4" />,
        onClick: handleLogout,
        variant: 'destructive'
      }
    ] : [])
  ];

  // Display regular buttons on desktop, dropdown on mobile if there are multiple actions
  const shouldUseDropdown = isSmallScreen && allHeaderActions.length > 1;

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full bg-background/90 backdrop-blur-sm border-b border-border",
      className
    )} dir="rtl">
      <div className="container px-3 md:px-6 py-2 md:py-3 mx-auto">
        <div className="flex items-center justify-between gap-4 h-12 md:h-14">
          {/* Left: Logo, Back Button and Title */}
          <div className="flex items-center gap-2 md:gap-3">
            {backHref && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => backHref ? router.push(backHref) : router.back()}
                    className="md:hidden h-8 w-8"
                    aria-label={backLabel || "חזור"}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{backLabel || "חזור"}</TooltipContent>
              </Tooltip>
            )}
            
            {backHref && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => backHref ? router.push(backHref) : router.back()}
                className="hidden md:flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                {backLabel || "חזור"}
              </Button>
            )}
            
            {showLogo && (
              <Link href={'/'} className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity">
                <div className={`h-5 sm:h-6 w-auto ${isSmallScreen ? 'scale-75' : ''}`}>
                  <MobileyeLogoIcon className="h-full w-auto text-foreground" />
                </div>
              </Link>
            )}
            
            {showTitle && (
              <div className="flex flex-col">
                <h1 className={cn(
                  "text-sm md:text-lg font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis",
                  hebrewHeading.fontClass
                )}>
                  {displayTitle}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                    {subtitle}
                  </p>
                )}
                {user && variant === 'admin' && (
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    שלום, {user.username}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Center - Search */}
          {showSearch && mounted && variant === 'admin' && (
            <div className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
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

          {/* Admin Navigation Menu - Desktop */}
          {variant === 'admin' && !isSmallScreen && (
            <div className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
              <AdminHeaderNav />
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search on small screens */}
            {showSearch && mounted && variant === 'admin' && isSmallScreen && (
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
            
            {/* Debug Icon */}
            {variant !== 'admin' && (
              <div className={isSmallScreen ? "scale-75" : ""}>
                <HeaderDebugIcon />
              </div>
            )}
            
            {/* Theme Toggle */}
            <div className={isSmallScreen ? "scale-75" : ""}>
              <ThemeToggle />
            </div>
            
            {/* Refresh Button */}
            {onRefresh && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onRefresh}
                      disabled={isLoading}
                      className="h-8 w-8"
                    >
                      <RefreshCw className={cn(
                        "h-4 w-4",
                        isLoading && "animate-spin"
                      )} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>רענן נתונים</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Header Actions - Desktop */}
            {!shouldUseDropdown && allHeaderActions.map((action, index) => {
              const ActionButton = () => (
                <Button
                  key={action.label}
                  variant={action.variant || "default"}
                  size="sm"
                  onClick={action.onClick}
                  className="hidden sm:flex items-center gap-2 h-8"
                >
                  {action.icon && <span className="text-inherit">{action.icon}</span>}
                  {action.label}
                </Button>
              );

              return action.href ? (
                <Link key={action.label} href={action.href}>
                  <ActionButton />
                </Link>
              ) : (
                <ActionButton key={action.label} />
              );
            })}

            {/* Custom actions */}
            {actions}

            {/* Mobile Menu or Actions Dropdown */}
            {(shouldUseDropdown || variant === 'default') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="תפריט"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Only show when mounted to prevent hydration mismatch */}
                  {mounted && (
                    <>
                      {/* Header actions for mobile */}
                      {shouldUseDropdown && allHeaderActions.map((action) => {
                        if (action.href) {
                          return (
                            <DropdownMenuItem key={action.label} asChild>
                              <Link href={action.href} className="flex items-center gap-2 w-full cursor-pointer">
                                {action.icon}
                                {action.label}
                              </Link>
                            </DropdownMenuItem>
                          );
                        }
                        
                        return (
                          <DropdownMenuItem 
                            key={action.label}
                            onClick={action.onClick}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer",
                              action.variant === 'destructive' && "text-destructive"
                            )}
                          >
                            {action.icon}
                            {action.label}
                          </DropdownMenuItem>
                        );
                      })}
                      
                      {/* Common navigation items */}
                      {variant === 'default' && (
                        <>
                          {!isHomePage && (
                            <DropdownMenuItem asChild>
                              <Link href="/" className="flex items-center gap-2 w-full cursor-pointer">
                                <Home className="h-4 w-4" />
                                עמוד הבית
                              </Link>
                            </DropdownMenuItem>
                          )}
                          
                          {showAdmin && showAdminDashboard && (
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
                          
                          {showLogout && variant === 'default' && (
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
                          )}
                        </>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 