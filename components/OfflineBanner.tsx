'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, RefreshCw, AlertTriangle, X, Info, ChevronUp } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useHebrewFont } from '@/hooks/useFont';
import { toast } from 'sonner';

interface CacheInfo {
  isServedFromCache: boolean;
  cacheDate?: string;
  lastSync?: string;
}

export default function OfflineBanner() {
  const { status: offlineStatus, isOnline } = useOfflineStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({ isServedFromCache: false });
  const [showDetails, setShowDetails] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [actuallyOffline, setActuallyOffline] = useState(false);
  const hebrewFont = useHebrewFont('body');

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // More conservative offline detection
  useEffect(() => {
    if (!isClient) return;
    
    let offlineTimeout: NodeJS.Timeout;
    
    const checkRealOfflineStatus = async () => {
      // Only consider truly offline if:
      // 1. navigator.onLine is false AND
      // 2. We can't reach our own server AND  
      // 3. We can't reach a reliable external service
      
      if (navigator.onLine === false) {
        // Double check with a network request
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch('/api/health', {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache'
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error('Health check failed');
          }
          
          // If we can reach our server, we're not really offline
          setActuallyOffline(false);
        } catch (error) {
          // Can't reach our server, likely truly offline
          setActuallyOffline(true);
        }
      } else {
        setActuallyOffline(false);
      }
    };

    // Check immediately
    checkRealOfflineStatus();
    
    // Set up event listeners
    const handleOnline = () => {
      setActuallyOffline(false);
    };
    
    const handleOffline = () => {
      // Delay before marking as offline to avoid false positives
      offlineTimeout = setTimeout(() => {
        checkRealOfflineStatus();
      }, 2000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineTimeout) {
        clearTimeout(offlineTimeout);
      }
    };
  }, [isClient]);

  // Check if current page is served from cache (only when actually offline)
  useEffect(() => {
    if (!isClient || !actuallyOffline) return;
    
    const checkCacheStatus = async () => {
      try {
        // Check service worker cache status
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'GET_CACHE_STATUS',
            url: window.location.href
          });
        }

        // Check response headers for cache indicators
        const lastResponse = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (lastResponse) {
          // Check if response came from cache based on timing
          const isFromCache = lastResponse.transferSize === 0 && lastResponse.decodedBodySize > 0;
          
          setCacheInfo(prev => ({
            ...prev,
            isServedFromCache: isFromCache || actuallyOffline
          }));
        }
      } catch (error) {
        console.warn('Failed to check cache status:', error);
      }
    };

    checkCacheStatus();

    // Listen for service worker messages about cache status
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CACHE_STATUS') {
        setCacheInfo(prev => ({
          ...prev,
          isServedFromCache: event.data.isFromCache,
          cacheDate: event.data.cacheDate,
          lastSync: event.data.lastSync
        }));
      }
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [actuallyOffline, isClient]);

  // Auto-expand when going offline
  useEffect(() => {
    if (!isClient) return;
    
    if (actuallyOffline) {
      setIsExpanded(true);
      // Auto-collapse after 10 seconds unless manually expanded
      const timer = setTimeout(() => {
        if (!showDetails) {
          setIsExpanded(false);
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [actuallyOffline, showDetails, isClient]);

  // Don't render on server or when online
  if (!isClient || !actuallyOffline) {
    return null;
  }

  // Force refresh function
  const handleRefresh = () => {
    // Clear caches and reload
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.includes('drivertasks-api')) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        ).then(() => {
          (window as any).location.reload();
        }).catch(() => {
          (window as any).location.reload();
        });
      }).catch(() => {
        (window as any).location.reload();
      });
    } else {
      (window as any).location.reload();
    }
  };

  const manualSync = async () => {
    try {
      if (!isOnline) {
        toast.error('בדוק את החיבור לאינטרנט ונסה שוב');
        return;
      }
      
      // ... existing code ...
    } catch (error) {
      console.error('Error in manualSync:', error);
    }
  };

  const getStatusInfo = () => {
    return {
      icon: <WifiOff className="h-4 w-4" />,
      color: 'border-destructive/20 bg-destructive/10 text-destructive',
      title: 'מצב אופליין',
      message: 'אין חיבור לאינטרנט. מציג נתונים שמורים במטמון.',
      severity: 'error' as const
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-300 transform
      ${
        isExpanded ? 'bg-background/95 backdrop-blur-sm' : 'bg-background/90 backdrop-blur-sm'
      }
      border-t border-border
      ${isExpanded ? 'translate-y-0' : 'translate-y-[70%]'}
    `}>
      <div className="max-w-md mx-auto px-3 py-2">
        {/* Compact View */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            {statusInfo.icon}
            <span className={`text-xs font-medium ${hebrewFont.fontClass}`}>
              {statusInfo.title}
            </span>
            <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            {isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="פרטים נוספים"
              >
                <Info className="h-3 w-3" />
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="p-1 hover:bg-accent rounded transition-colors"
              title="סגור"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="mt-3 space-y-3">
            <p className={`text-xs ${hebrewFont.fontClass}`}>
              {statusInfo.message}
            </p>

            {/* Cache Details */}
            {showDetails && cacheInfo.isServedFromCache && (
              <div className="bg-muted/30 rounded p-3 space-y-2 text-xs">
                <div className={`flex justify-between ${hebrewFont.fontClass}`}>
                  <span>מקור הנתונים:</span>
                  <span>מטמון מקומי</span>
                </div>
                {cacheInfo.cacheDate && (
                  <div className={`flex justify-between ${hebrewFont.fontClass}`}>
                    <span>נשמר בזמן:</span>
                    <span>{new Date(cacheInfo.cacheDate).toLocaleTimeString('he-IL')}</span>
                  </div>
                )}
                {cacheInfo.lastSync && (
                  <div className={`flex justify-between ${hebrewFont.fontClass}`}>
                    <span>סנכרון אחרון:</span>
                    <span>{new Date(cacheInfo.lastSync).toLocaleTimeString('he-IL')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Offline Capabilities Info */}
            {showDetails && (
              <div className="bg-muted/30 rounded p-3 space-y-2">
                <h4 className={`text-xs font-semibold ${hebrewFont.fontClass}`}>
                  זמין במצב אופליין:
                </h4>
                <ul className={`text-xs space-y-1 ${hebrewFont.fontClass}`}>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    צפייה בפרויקטים ומשימות שמורות
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    ניווט בין עמודים שנצפו
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    שמירת שינויים לסנכרון מאוחר יותר
                  </li>
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className={`
                  flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded
                  bg-card/50 hover:bg-card/70 transition-colors
                  ${hebrewFont.fontClass}
                `}
              >
                <RefreshCw className="h-3 w-3" />
                נסה להתחבר
              </button>

              <button
                onClick={manualSync}
                className={`
                  flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded
                  bg-card/50 hover:bg-card/70 transition-colors
                  ${hebrewFont.fontClass}
                `}
              >
                <AlertTriangle className="h-3 w-3" />
                פתור בעיית חיבור
              </button>
            </div>

            {/* Help Text */}
            <p className={`text-xs opacity-70 ${hebrewFont.fontClass}`}>
              האפליקציה פועלת במצב אופליין. שינויים יסונכרנו כשהחיבור יחזור.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 