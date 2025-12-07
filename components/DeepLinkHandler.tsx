'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useCallback, Suspense, useRef } from 'react';
import { toast } from 'sonner';
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
  const hasProcessedRef = useRef(false);
  const hasProcessedProtocolRef = useRef(false);

  // Handle shared content
  const handleSharedContent = useCallback((content: Record<string, unknown>) => {
    try {
      // Store shared content for the app to use
      sessionStorage.setItem('drivertasks-shared-content', JSON.stringify(content));
      
      toast.success('תוכן משותף התקבל', {
        description: 'התוכן זמין לשימוש באפליקציה'
      });
      
      // Navigate to appropriate page based on content type
      if (typeof content === 'object' && content !== null && 'type' in content && content.type === 'project' && 'projectName' in content && typeof content.projectName === 'string') {
        router.push(`/project/${encodeURIComponent(content.projectName)}`);
      } else if (typeof content === 'object' && content !== null && 'type' in content && content.type === 'task' && 'taskId' in content) {
        // Navigate to task
        toast.info('פתיחת משימה משותפת');
      }
    } catch {
      toast.error('שגיאה בעיבוד תוכן משותף');
    }
  }, [router]);

  // Handle shared files
  const handleSharedFiles = useCallback((files: Array<{ name?: string; type?: string; size?: number; lastModified?: number }>) => {
    try {
      // Store files for the app to use
      sessionStorage.setItem('drivertasks-shared-content', JSON.stringify({
        type: 'files',
        files: files.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
          lastModified: f.lastModified
        }))
      }));
      
      toast.success('קבצים התקבלו', {
        description: `${files.length} קבצים זמינים לשימוש`
      });
    } catch {
      toast.error('שגיאה בעיבוד קבצים');
    }
  }, []);

  // Handle deep link actions
  const handleDeepLinkAction = useCallback((action: string, params: Record<string, string | undefined>) => {
    switch (action) {
      case 'open-project':
        if (params.projectName) {
          router.push(`/project/${encodeURIComponent(params.projectName)}`);
          toast.success('פתיחת פרויקט', {
            description: `נפתח פרויקט: ${params.projectName}`
          });
        }
        break;
        
      case 'open-task':
        if (params.taskId) {
          // Implement task opening
          toast.info('פתיחת משימה', {
            description: `מזהה משימה: ${params.taskId}`
          });
        }
        break;
        
      case 'share-content':
        if (params.sharedContent) {
          try {
            const content = JSON.parse(params.sharedContent);
            handleSharedContent(content);
          } catch {
            toast.error('שגיאה בפענוח תוכן משותף');
          }
        }
        break;
        
      case 'open-files':
        if (params.files) {
          try {
            const fileList = JSON.parse(params.files);
            handleSharedFiles(fileList);
          } catch {
            toast.error('שגיאה בפתיחת קבצים');
          }
        }
        break;
        
      default:
        // Unknown action
        break;
    }
  }, [router, handleSharedContent, handleSharedFiles]);

  // Handle external link clicks
  const handleExternalLink = useCallback(async (action: string, params: Record<string, string | undefined>) => {
    try {
      switch (action) {
        case 'open-project':
          if (params.projectName) {
            router.push(`/project/${encodeURIComponent(params.projectName)}`);
            toast.success('פתיחת פרויקט', {
              description: `נפתח פרויקט: ${params.projectName}`
            });
          }
          break;
          
        case 'open-task':
          if (params.taskId) {
            // Would need to implement task opening logic
            toast.info('פתיחת משימה', {
              description: `מזהה משימה: ${params.taskId}`
            });
          }
          break;
          
        default:
          // Unknown action
          break;
      }
    } catch {
      toast.error('שגיאה בפתיחת קישור חיצוני');
    }
  }, [router]);

  // Handle URL parameters and deep links
  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    // Get URL parameters
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const action = searchParams.get('action');
    const projectName = searchParams.get('project');
    const taskId = searchParams.get('task');
    const sharedContent = searchParams.get('shared');
    const files = searchParams.get('files');

    // Handle protocol launches (drivertasks://)
    if (utmMedium === 'protocol' || utmSource === 'protocol') {
      if (action) {
        handleDeepLinkAction(action, { 
          projectName: projectName ?? undefined, 
          taskId: taskId ?? undefined, 
          sharedContent: sharedContent ?? undefined, 
          files: files ?? undefined 
        });
      }
      return;
    }

    // Handle external links
    if (utmSource === 'external' || utmMedium === 'external') {
      if (action) {
        handleExternalLink(action, { 
          projectName: projectName ?? undefined, 
          taskId: taskId ?? undefined, 
          sharedContent: sharedContent ?? undefined, 
          files: files ?? undefined 
        });
      }
      return;
    }

    // Handle shared content
    if (sharedContent) {
      try {
        const content = JSON.parse(decodeURIComponent(sharedContent));
        handleSharedContent(content);
      } catch {
        // Silent error handling
      }
      return;
    }

    // Handle file sharing
    if (files) {
      try {
        const fileList = JSON.parse(decodeURIComponent(files));
        handleSharedFiles(fileList);
      } catch {
        // Silent error handling
      }
      return;
    }

    // Handle direct navigation
    if (projectName) {
      router.push(`/project/${encodeURIComponent(projectName)}`);
      return;
    }

    if (taskId) {
      // Would need to fetch task details to get project name
      // For now, just show a toast
      toast.info('נווט למשימה', {
        description: `מזהה משימה: ${taskId}`
      });
      return;
    }

    // Handle app launches
    if (utmMedium && utmSource) {
      // Silent app launch tracking
    }
  }, [searchParams, router, handleDeepLinkAction, handleExternalLink, handleSharedContent, handleSharedFiles]);

  // Handle protocol-based deep links
  useEffect(() => {
    if (hasProcessedProtocolRef.current) return;

    const handleProtocolLaunch = (event: MessageEvent) => {
      try {
        const { type, data } = event.data;
        
        if (type === 'PROTOCOL_LAUNCH') {
          hasProcessedProtocolRef.current = true;
          
          const { action, params } = data;
          handleDeepLinkAction(action, params);
        }
      } catch {
        // Silent error handling
      }
    };

    // Listen for protocol messages
    window.addEventListener('message', handleProtocolLaunch);
    
    return () => {
      window.removeEventListener('message', handleProtocolLaunch);
    };
  }, [handleDeepLinkAction]);

  // Listen for messages from service worker or other sources
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};
      
      switch (type) {
        case 'OFFLINE_SYNC':
          if (data?.success) {
            toast.success('סנכרון הושלם', {
              description: 'הנתונים סונכרנו בהצלחה'
            });
          } else {
            toast.error('שגיאה בסנכרון', {
              description: 'לא ניתן לסנכרן את הנתונים'
            });
          }
          break;
          
        case 'CACHE_UPDATED':
          // Silent cache update
          break;
          
        case 'SHARE_CONTENT':
          if (data?.content) {
            handleSharedContent(data.content);
          }
          break;
          
        case 'OPEN_FILES':
          if (data?.files) {
            handleSharedFiles(data.files);
          }
          break;
          
        default:
          // Unknown message type
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleDeepLinkAction, handleSharedContent, handleSharedFiles]);

  // Web Share API support
  useEffect(() => {
    // Register share target if supported
    if ('serviceWorker' in navigator && 'share' in navigator) {
      // Enable web share target
    }
  }, []);

  // Handle app shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle keyboard shortcuts for deep link actions
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            // Quick search/command palette
            event.preventDefault();
            // Implement command palette
            break;
            
          case 'n':
            // New task
            event.preventDefault();
            router.push('/admin/tasks/new');
            break;
            
          case 'h':
            // Home
            event.preventDefault();
            router.push('/');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Handle share actions
  const handleShare = useCallback(async (content: { title?: string; description?: string; url?: string }) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: content.title || 'Driver Tasks',
          text: content.description || 'תוכן מ-Driver Tasks',
          url: content.url || window.location.href
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(content.url || window.location.href);
        toast.success('קישור הועתק ללוח');
      }
    } catch {
      toast.error('שגיאה בשיתוף');
    }
  }, []);

  const handleClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('הועתק ללוח');
    } catch {
      toast.error('שגיאה בהעתקה');
    }
  }, []);

  // Expose functions to global scope for external use
  useEffect(() => {
    (window as unknown as Record<string, unknown>).deepLinkHandler = {
      handleShare,
      handleClipboard,
      handleDeepLinkAction
    };

    return () => {
      delete (window as unknown as Record<string, unknown>).deepLinkHandler;
    };
  }, [handleShare, handleClipboard, handleDeepLinkAction]);

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
          title: title || 'Driver Tasks',
          text: text || 'צפה ב-Driver Tasks',
          url: link
        });
        return true;
      } catch {
        // Silent error handling
      }
    }
    
    // Fallback to clipboard
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(link);
        return true;
      } catch {
        // Silent error handling
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