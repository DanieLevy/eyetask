'use client';

import React, { useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePWADetection } from '@/hooks/usePWADetection';

interface DeepLinkConfig {
  [key: string]: {
    path: string;
    requiresAuth?: boolean;
    fallback?: string;
  };
}

// Deep link route configurations
const DEEP_LINK_ROUTES: DeepLinkConfig = {
  // Task Management
  'task': {
    path: '/admin/tasks/{id}',
    requiresAuth: true,
    fallback: '/admin/tasks'
  },
  'new-task': {
    path: '/admin/tasks/new',
    requiresAuth: true,
    fallback: '/admin'
  },
  'edit-task': {
    path: '/admin/tasks/{id}',
    requiresAuth: true,
    fallback: '/admin/tasks'
  },
  
  // Project Management  
  'project': {
    path: '/project/{name}',
    requiresAuth: false,
    fallback: '/'
  },
  'admin-project': {
    path: '/admin/projects/{id}',
    requiresAuth: true,
    fallback: '/admin/projects'
  },
  
  // Analytics & Reports
  'analytics': {
    path: '/admin/analytics',
    requiresAuth: true,
    fallback: '/admin'
  },
  'dashboard': {
    path: '/admin/dashboard',
    requiresAuth: true,
    fallback: '/admin'
  },
  
  // Daily Updates
  'update': {
    path: '/admin/daily-updates/{id}',
    requiresAuth: true,
    fallback: '/admin/daily-updates'
  },
  'updates': {
    path: '/admin/daily-updates',
    requiresAuth: true,
    fallback: '/admin'
  },
  
  // General Routes
  'admin': {
    path: '/admin',
    requiresAuth: true,
    fallback: '/'
  },
  'home': {
    path: '/',
    requiresAuth: false
  },
  'projects': {
    path: '/admin/projects',
    requiresAuth: true,
    fallback: '/admin'
  },
  'feedback': {
    path: '/feedback',
    requiresAuth: false,
    fallback: '/'
  },
  'task-view': {
    path: '/task/{taskId}',
    requiresAuth: false,
    fallback: '/'
  },
  'project-view': {
    path: '/project/{projectName}',
    requiresAuth: false,
    fallback: '/'
  }
};

interface DeepLinkHandlerProps {
  children?: React.ReactNode;
}

// Main handler component that uses useSearchParams
function DeepLinkHandlerCore({ children }: DeepLinkHandlerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, getAppUrl, isAppUrl } = usePWADetection();

  // Handle PWA launch parameters
  const handleLaunchParams = useCallback(() => {
    if (!status.launchParams) return;

    const utmSource = status.launchParams.get('utm_source');
    const utmMedium = status.launchParams.get('utm_medium');
    const protocol = status.launchParams.get('protocol');
    const action = status.launchParams.get('action');
    const target = status.launchParams.get('target');

    // Track PWA launches
    if (utmSource === 'pwa') {
      console.log('App launched from:', utmMedium || 'unknown');
      
      // Track analytics if available
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as any).gtag('event', 'pwa_launch', {
          source: utmMedium,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Handle protocol launches
    if (protocol) {
      handleProtocolLaunch(protocol);
    }

    // Handle action-based launches
    if (action && target) {
      handleActionLaunch(action, target);
    }
  }, [status.launchParams]);

      // Handle custom protocol launches (web+drivershub://)
  const handleProtocolLaunch = useCallback((protocolData: string) => {
    try {
      const decodedData = decodeURIComponent(protocolData);
      const url = new URL(decodedData);
      
      // Extract path and navigate
      if (isAppUrl(decodedData)) {
        router.push(url.pathname + url.search);
      }
    } catch (error) {
      console.error('Failed to handle protocol launch:', error);
    }
  }, [router, isAppUrl]);

  // Handle action-based launches (shortcuts, notifications)
  const handleActionLaunch = useCallback((action: string, target: string) => {
    const config = DEEP_LINK_ROUTES[action];
    
    if (!config) {
      console.warn('Unknown deep link action:', action);
      return;
    }

    // Replace path parameters
    let targetPath = config.path;
    if (target && targetPath.includes('{')) {
      targetPath = targetPath.replace(/{(\w+)}/g, target);
    }

    // Navigate to target or fallback
    router.push(targetPath || config.fallback || '/');
  }, [router]);

  // Handle external links and redirections
  const handleExternalLink = useCallback((url: string) => {
    if (!isAppUrl(url)) return false;

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search + urlObj.hash;
      
      if (status.isStandalone) {
        // Already in PWA, just navigate
        router.push(path);
        return true;
      } else if (status.canHandleAppLinks) {
        // Try to open in installed PWA
        const appUrl = getAppUrl(path);
        window.location.href = appUrl;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to handle external link:', error);
      return false;
    }
  }, [status, router, isAppUrl, getAppUrl]);

  // Handle share target (when app receives shared content)
  const handleShareTarget = useCallback(() => {
    if (!searchParams) return;
    
    const sharedTitle = searchParams.get('title');
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');

    // Skip if this is a feedback form redirect or debug report
    if (window.location.pathname === '/feedback' || 
        window.location.search.includes('category=') ||
        window.location.search.includes('issueType=')) {
      return;
    }

    if (sharedTitle || sharedText || sharedUrl) {
      // Redirect to appropriate handler
      const shareData = {
        title: sharedTitle || '',
        text: sharedText || '',
        url: sharedUrl || ''
      };

      // Store in session for handling by target component
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('eyetask-shared-content', JSON.stringify(shareData));
      }
      
      // Navigate to new task creation with shared content
      router.push('/admin/tasks/new?shared=true');
    }
  }, [searchParams, router]);

  // Setup global link interception
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // Check if it's an app link that should be handled specially
      if (isAppUrl(href)) {
        const shouldIntercept = handleExternalLink(href);
        if (shouldIntercept) {
          event.preventDefault();
        }
      }
    };

    // Listen for clicks on links
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [handleExternalLink, isAppUrl]);

  // Setup message listeners for cross-frame communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { type, data } = event.data || {};

      // Skip processing if no type is provided
      if (!type) {
        return;
      }

      switch (type) {
        case 'NAVIGATE_TO':
          if (data?.path) {
            router.push(data.path);
          }
          break;
          
        case 'OPEN_IN_APP':
          if (data?.url) {
            handleExternalLink(data.url);
          }
          break;
          
        case 'SHARE_CONTENT':
          if (data?.content && typeof window !== 'undefined') {
            sessionStorage.setItem('eyetask-shared-content', JSON.stringify(data.content));
            router.push('/admin/tasks/new?shared=true');
          }
          break;
          
        default:
          // Only log if we have a valid type that we don't recognize
          if (typeof type === 'string' && type.length > 0) {
            console.log('Unknown message type:', type);
          }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [router, handleExternalLink]);

  // Process launch parameters on mount
  useEffect(() => {
    handleLaunchParams();
    handleShareTarget();
  }, [handleLaunchParams, handleShareTarget]);

  // Setup web app manifest event listeners
  useEffect(() => {
    // Handle app shortcut activations
    const handleAppShortcut = (event: any) => {
      if (event.url) {
        const url = new URL(event.url);
        router.push(url.pathname + url.search);
      }
    };

    // Handle file handlers
    const handleFileOpen = (event: any) => {
      if (event.files && event.files.length > 0 && typeof window !== 'undefined') {
        // Store files for processing
        sessionStorage.setItem('eyetask-opened-files', JSON.stringify(
          Array.from(event.files as FileList).map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size
          }))
        ));
        
        router.push('/import?files=true');
      }
    };

    // Listen for PWA events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data || {};
        
        // Skip processing if no type is provided
        if (!type) {
          return;
        }
        
        if (type === 'SHORTCUT_ACTIVATED') {
          handleAppShortcut(data);
        } else if (type === 'FILE_HANDLER_ACTIVATED') {
          handleFileOpen(data);
        }
      });
    }
  }, [router]);

  return <>{children}</>;
}

// Loading fallback component
function DeepLinkFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">טוען...</p>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function DeepLinkHandler({ children }: DeepLinkHandlerProps) {
  return (
    <Suspense fallback={<DeepLinkFallback />}>
      <DeepLinkHandlerCore>{children}</DeepLinkHandlerCore>
    </Suspense>
  );
}

// Utility hook for components that need deep linking functionality
export function useDeepLink() {
  const { getAppUrl, isAppUrl } = usePWADetection();
  const router = useRouter();

  const createDeepLink = useCallback((action: string, target?: string, params?: Record<string, string>) => {
    const baseUrl = getAppUrl();
    const searchParams = new URLSearchParams({
      action,
      ...(target && { target }),
      ...params
    });
    
    return `${baseUrl}?${searchParams.toString()}`;
  }, [getAppUrl]);

  const navigateToDeepLink = useCallback((action: string, target?: string, params?: Record<string, string>) => {
    const config = DEEP_LINK_ROUTES[action];
    
    if (!config) {
      console.warn('Unknown deep link action:', action);
      return;
    }

    let path = config.path;
    if (target && path.includes('{')) {
      path = path.replace(/{(\w+)}/g, target);
    }

    if (params) {
      const searchParams = new URLSearchParams(params);
      path += `?${searchParams.toString()}`;
    }

    router.push(path);
  }, [router]);

  const shareAppLink = useCallback(async (action: string, target?: string, title?: string, text?: string) => {
    const link = createDeepLink(action, target);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Drivers Hub',
                      text: text || 'צפה ב-Drivers Hub',
          url: link
        });
        return true;
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
    
    // Fallback to clipboard
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(link);
        return true;
      } catch (error) {
        console.error('Clipboard write failed:', error);
      }
    }
    
    return false;
  }, [createDeepLink]);

  return {
    createDeepLink,
    navigateToDeepLink,
    shareAppLink,
    isAppUrl
  };
} 