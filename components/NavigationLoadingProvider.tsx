'use client';

import React, { useEffect, useRef, useCallback, createContext, useContext, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';
import { LoadingOverlay } from '@/components/LoadingSystem';
import { logger } from '@/lib/logger';

interface NavigationLoadingContextType {
  isNavigating: boolean;
  startNavigation: (to: string, options?: { message?: string; timeout?: number }) => void;
  finishNavigation: () => void;
  cancelNavigation: () => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextType | null>(null);

// Internal component that uses useSearchParams
function NavigationLoadingCore({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startLoading, stopLoading, isLoading } = useLoading();
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState<string>('');
  
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationStartRef = useRef<number>(0);
  const currentNavigationId = useRef<string>('');

  // Generate unique navigation ID
  const generateNavigationId = useCallback(() => {
    return `navigation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Start navigation loading
  const startNavigation = useCallback((to: string, options: { message?: string; timeout?: number } = {}) => {
    const { message = 'טוען דף...', timeout = 10000 } = options;
    
    const navigationId = generateNavigationId();
    currentNavigationId.current = navigationId;
    navigationStartRef.current = Date.now();
    
    setIsNavigating(true);
    setNavigationMessage(message);
    
    startLoading(navigationId, 'navigation', {
      priority: 'high',
      message,
      timeout
    });

    // Set up navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    navigationTimeoutRef.current = setTimeout(() => {
      logger.warn('Navigation timeout', 'NAVIGATION_LOADING', { to, timeout });
      finishNavigation();
    }, timeout);

    logger.debug('Navigation started', 'NAVIGATION_LOADING', { to, navigationId });
  }, [startLoading, generateNavigationId]);

  // Finish navigation loading
  const finishNavigation = useCallback(() => {
    if (currentNavigationId.current) {
      stopLoading(currentNavigationId.current);
      
      const duration = Date.now() - navigationStartRef.current;
      logger.debug('Navigation finished', 'NAVIGATION_LOADING', { 
        navigationId: currentNavigationId.current, 
        duration 
      });
      
      currentNavigationId.current = '';
    }

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    setIsNavigating(false);
    setNavigationMessage('');
  }, [stopLoading]);

  // Cancel navigation loading
  const cancelNavigation = useCallback(() => {
    logger.debug('Navigation cancelled', 'NAVIGATION_LOADING', { 
      navigationId: currentNavigationId.current 
    });
    finishNavigation();
  }, [finishNavigation]);

  // Monitor route changes
  useEffect(() => {
    // Finish any ongoing navigation when route actually changes
    if (isNavigating) {
      const finishTimer = setTimeout(() => {
        finishNavigation();
      }, 100); // Small delay to ensure navigation completed

      return () => clearTimeout(finishTimer);
    }
  }, [pathname, searchParams, isNavigating, finishNavigation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (currentNavigationId.current) {
        stopLoading(currentNavigationId.current);
      }
    };
  }, [stopLoading]);

  // Override default link behavior to show loading
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Skip external links, hash links, and download links
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        link.hasAttribute('download') ||
        link.hasAttribute('target') ||
        href === pathname // Same page
      ) {
        return;
      }

      // Determine loading message based on route
      let message = 'טוען דף...';
      if (href.includes('/admin')) {
        message = 'טוען עמוד ניהול...';
      } else if (href.includes('/project')) {
        message = 'טוען פרויקט...';
      } else if (href.includes('/feedback')) {
        message = 'טוען טופס פניות...';
      }

      startNavigation(href, { message });
    };

    // Add click listener
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [pathname, startNavigation]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopstate = () => {
      if (!isNavigating) {
        startNavigation(window.location.pathname, { message: 'טוען דף...' });
      }
    };

    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, [isNavigating, startNavigation]);

  const contextValue: NavigationLoadingContextType = {
    isNavigating,
    startNavigation,
    finishNavigation,
    cancelNavigation,
  };

  return (
    <NavigationLoadingContext.Provider value={contextValue}>
      {children}
      
      {/* Navigation Loading Overlay */}
      <LoadingOverlay
        show={isNavigating}
        message={navigationMessage}
        priority="high"
        canCancel={true}
        onCancel={cancelNavigation}
      />
    </NavigationLoadingContext.Provider>
  );
}

// Main provider component with Suspense boundary
export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NavigationLoadingCore>{children}</NavigationLoadingCore>
    </Suspense>
  );
}

// Hook to use navigation loading
export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (!context) {
    throw new Error('useNavigationLoading must be used within a NavigationLoadingProvider');
  }
  return context;
}

// HOC for components that need navigation loading
export function withNavigationLoading<P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) {
  return function NavigationLoadingWrapper(props: P) {
    const { startNavigation } = useNavigationLoading();
    
    // Auto-start navigation for certain prop changes
    useEffect(() => {
      if (loadingMessage) {
        startNavigation(window.location.pathname, { message: loadingMessage });
      }
    }, []);

    return <Component {...props} />;
  };
}

// Enhanced Link component with loading states
export const LoadingLink: React.FC<{
  href: string;
  children: React.ReactNode;
  loadingMessage?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ href, children, loadingMessage, className = '', onClick }) => {
  const { startNavigation } = useNavigationLoading();

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    
    if (!e.defaultPrevented) {
      startNavigation(href, { message: loadingMessage });
    }
  };

  return (
    <a 
      href={href} 
      className={className} 
      onClick={handleClick}
    >
      {children}
    </a>
  );
}; 