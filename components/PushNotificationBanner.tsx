'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

export function PushNotificationBanner() {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    error, 
    subscribe, 
    permission,
    showIOSInstallPrompt
  } = usePushNotifications();
  const isOffline = useOfflineStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if iOS and PWA
  const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = sessionStorage.getItem('push-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Don't show if:
  // - Already dismissed in this session
  // - Already subscribed
  // - Not supported
  // - Loading
  // - Offline
  // - iOS but not PWA
  if (
    isDismissed || 
    isSubscribed || 
    !isSupported || 
    isLoading || 
    isOffline ||
    (isIOS && !isPWA)
  ) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('push-banner-dismissed', 'true');
  };

  const handleSubscribe = async () => {
    try {
      await subscribe();
      handleDismiss(); // Auto dismiss on successful subscription
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              קבל התראות על משימות חדשות
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              הישאר מעודכן עם התראות בזמן אמת
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            onClick={handleSubscribe}
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            הפעל התראות
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-gray-600 dark:text-gray-400"
          >
            לא עכשיו
          </Button>
        </div>
      </div>
    </div>
  );
} 