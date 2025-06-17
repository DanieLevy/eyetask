'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useHebrewFont } from '@/hooks/useFont';

import { UnifiedHeaderProps, HeaderAction } from './types';
import { useAuth } from './AuthContext';
import { useHeaderContext } from './HeaderContext';
import HeaderLogo from './HeaderLogo';
import HeaderSearch from './HeaderSearch';
import HeaderActions from './HeaderActions';
import HeaderNavigation from './HeaderNavigation';
import HeaderUserMenu from './HeaderUserMenu';
import MobileMenu from './MobileMenu';
import ThemeToggle from '@/components/ThemeToggle';
import HeaderDebugIcon from '@/components/HeaderDebugIcon';

export const UnifiedHeader = (props: UnifiedHeaderProps) => {
  const [mounted, setMounted] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const { getConfigForCurrentRoute } = useHeaderContext();
  const router = useRouter();
  const hebrewHeading = useHebrewFont('heading');
  
  // Merge route-based config with passed props
  const routeConfig = getConfigForCurrentRoute();
  const config = { ...routeConfig, ...props };
  
  const {
    variant = 'default',
    title,
    subtitle,
    backHref,
    backLabel,
    navigationItems = [],
    showLogo = true,
    showSearch = false,
    showUserMenu = true,
    showThemeToggle = true,
    showBackButton = !!backHref,
    actions: actionsProp,
    className,
    onRefresh,
    isLoading = false,
  } = config;
  
  // Normalize actions to array
  const actions = Array.isArray(actionsProp) 
    ? actionsProp 
    : [];
  
  // All actions including mobile-specific ones
  const allActions: (HeaderAction | Omit<HeaderAction, 'variant'> & { variant: string })[] = [
    // Back action (only for mobile menu)
    ...(showBackButton ? [{
      id: 'back',
      label: backLabel || 'חזור',
      onClick: handleBackClick,
      icon: ArrowRight
    }] : []),
    
    // Refresh action
    ...(onRefresh ? [{
      id: 'refresh',
      label: 'רענן נתונים',
      onClick: onRefresh,
      disabled: isLoading,
      icon: RefreshCw
    }] : []),
    
    // Regular actions
    ...actions,
    
    // Login/logout actions
    ...(!user && showUserMenu ? [{
      id: 'login',
      label: 'התחבר',
      href: '/admin',
      variant: 'default' as const
    }] : []),
    
    ...(user && showUserMenu && isAdmin && !actions.some(action => action.id === 'logout') ? [
      // Admin dashboard link
      {
        id: 'adminPanel',
        label: 'פאנל ניהול',
        href: '/admin/dashboard',
        variant: 'default' as const
      },
      // Logout action
      {
        id: 'logout',
        label: 'התנתק',
        onClick: logout,
        variant: 'destructive' as const
      }
    ] : [])
  ];
  
  // Screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    
    // Check on mount
    checkScreenSize();
    
    // Add listener for resize events
    window.addEventListener('resize', checkScreenSize);
    
    // Mark as mounted
    setMounted(true);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  // Handle back button click
  function handleBackClick() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }
  
  // If not mounted yet, render a placeholder to avoid hydration mismatch
  if (!mounted) {
    return (
      <header className={cn(
        "sticky top-0 z-50 w-full bg-background/90 backdrop-blur-sm border-b border-border h-14",
        className
      )} />
    );
  }
  
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full bg-background/90 backdrop-blur-sm border-b border-border unified-header",
      className
    )} dir="rtl">
      <div className="container px-3 md:px-6 py-2 md:py-3 mx-auto">
        <div className="flex items-center justify-between gap-2 md:gap-4 h-11">
          {/* Left Section: Logo and Title */}
          <div className="flex items-center gap-2 md:gap-3 flex-1 sm:flex-none">
            {showLogo && (
              <HeaderLogo condensed={isSmallScreen || !!title} className="ltr:mr-auto rtl:ml-auto" />
            )}
            
            {title && (
              <div className="flex flex-col overflow-hidden">
                <h1 className={cn(
                  "text-base md:text-lg font-semibold leading-none truncate",
                  hebrewHeading.fontClass
                )}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Center: Navigation (Desktop Only) */}
          {navigationItems.length > 0 && (
            <div className="hidden md:block flex-1 max-w-xl mx-auto">
              <HeaderNavigation items={navigationItems} className="justify-center" />
            </div>
          )}
          
          {/* Right Section: Actions, Search, User */}
          <div className="flex items-center gap-2">
            {/* Debug Icon - Always visible */}
            <HeaderDebugIcon />
            
            {/* Theme Toggle - Always visible */}
            {showThemeToggle && (
              <ThemeToggle />
            )}
            
            {/* Desktop-only elements */}
            <div className="hidden md:flex items-center gap-2">
              {showSearch && (
                <HeaderSearch />
              )}
              
              {onRefresh && (
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
                        "h-3.5 w-3.5",
                        isLoading && "animate-spin"
                      )} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">רענן נתונים</TooltipContent>
                </Tooltip>
              )}
              
              {/* Back button - Desktop only */}
              {showBackButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackClick}
                  className="flex items-center gap-2 h-8"
                >
                  <ArrowRight className="h-4 w-4" />
                  {backLabel || "חזור"}
                </Button>
              )}
              
              {/* Actions - Desktop */}
              {actions.length > 0 && (
                <HeaderActions actions={actions} />
              )}
              
              {/* User Menu - Desktop */}
              {showUserMenu && user && (
                <HeaderUserMenu user={user} onLogout={logout} />
              )}
            </div>
            
            {/* Mobile Menu Button */}
            <MobileMenu
              items={navigationItems}
              actions={allActions}
              showSearch={showSearch}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default UnifiedHeader; 