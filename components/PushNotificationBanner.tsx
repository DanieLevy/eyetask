'use client';

import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

export function PushNotificationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    showIOSInstallPrompt 
  } = usePushNotifications();

  useEffect(() => {
    // Check if banner should be shown
    if (isLoading) return;
    
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    if (!token) {
      setIsVisible(false);
      return;
    }

    // Check if already dismissed this session
    const dismissedThisSession = sessionStorage.getItem('pushBannerDismissed');
    if (dismissedThisSession === 'true') {
      setIsVisible(false);
      return;
    }

    // Check conditions for showing banner
    const shouldShow = isSupported && !isSubscribed && permission !== 'denied' && !isDismissed;
    setIsVisible(shouldShow);
  }, [isSupported, isSubscribed, permission, isLoading, isDismissed]);

  const handleSubscribe = async () => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
    
    if (isIOS && !isStandalone) {
      showIOSInstallPrompt();
      handleDismiss();
    } else {
      const result = await subscribe();
      if (result.success) {
        setIsVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem('pushBannerDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50",
      "bg-blue-600 text-white",
      "transform transition-transform duration-300 ease-in-out",
      isVisible ? "translate-y-0" : "-translate-y-full"
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              הפעל התראות כדי לקבל עדכונים חשובים
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSubscribe}
              disabled={isLoading}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              הפעל עכשיו
            </Button>
            
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-blue-700 rounded-md transition-colors"
              aria-label="סגור"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 