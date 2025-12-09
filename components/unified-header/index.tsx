'use client';

import { ArrowRight, RefreshCw } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useHebrewFont } from '@/hooks/useFont';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthContext';
import HeaderActions from './HeaderActions';
import { useHeaderContext } from './HeaderContext';
import HeaderLogo from './HeaderLogo';
import HeaderNavigation from './HeaderNavigation';
import HeaderSearch from './HeaderSearch';
import HeaderUserMenu from './HeaderUserMenu';
import MobileMenu from './MobileMenu';
import { UnifiedHeaderProps, HeaderAction } from './types';

export const UnifiedHeader = (props: UnifiedHeaderProps) => {
  const [mounted, setMounted] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const { getConfigForCurrentRoute } = useHeaderContext();
  const hebrewHeading = useHebrewFont('heading');
  
  // Merge route-based config with passed props
  const routeConfig = getConfigForCurrentRoute();
  const config = { ...routeConfig, ...props };
  
  const {
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
      onClick: () => handleBackClick(),
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
  function handleBackClick(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    if (backHref) {
      window.location.href = backHref;
    } else {
      window.history.back();
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
      "m-0",
      className
    )} dir="rtl" style={{marginTop: 0, paddingTop: "env(safe-area-inset-top)"}}>
      <div className="container px-3 md:px-6 py-2 md:py-3 mx-auto">
        <div className="flex items-center justify-center gap-2 md:gap-4 h-11">
          {/* Left Section: Logo and Title - Now with better vertical alignment */}
          <div className="flex items-center justify-center gap-2 md:gap-3 flex-1">
            {showLogo && (
              <HeaderLogo condensed={isSmallScreen || !!title} className="ltr:mr-auto rtl:ml-auto" />
            )}
            
            {title && (
              <div className="flex flex-col overflow-hidden items-center">
                <h1 className={cn(
                  "text-base md:text-xl font-light leading-none truncate",
                  hebrewHeading.fontClass
                )}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5 font-light">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Center: Navigation (Desktop Only) - Now properly centered */}
          {navigationItems.length > 0 && (
            <div className="hidden md:flex items-center justify-center flex-1 max-w-xl mx-auto">
              <HeaderNavigation items={navigationItems} className="justify-center" />
            </div>
          )}
          
          {/* Right Section: Actions, Search, User */}
          <div className="flex items-center justify-end gap-2 flex-1">
            {/* Desktop-only elements with improved alignment */}
            <div className="hidden md:flex items-center justify-center gap-2">
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
                      className="h-9 w-9 rounded-full"
                    >
                      <RefreshCw className={cn(
                        "h-4 w-4",
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
                  className="flex items-center justify-center gap-2 h-9 px-3 font-light"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-sm">{backLabel || "חזור"}</span>
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
            
            {/* Mobile Menu Button - Now passing showThemeToggle and showDebugIcon */}
            <MobileMenu
              items={navigationItems}
              actions={allActions}
              showSearch={showSearch}
              showThemeToggle={showThemeToggle}
              showDebugIcon={true}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default UnifiedHeader; 