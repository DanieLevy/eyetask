'use client';

import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationModal() {
  const [isOpen, setIsOpen] = useState(false);
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
    // Check if modal should be shown
    if (isLoading) return;
    
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    if (!token) {
      setIsOpen(false);
      return;
    }

    // Check if already dismissed this session
    const dismissedThisSession = sessionStorage.getItem('pushModalDismissed');
    if (dismissedThisSession === 'true') {
      setIsOpen(false);
      return;
    }

    // Check conditions for showing modal
    const shouldShow = isSupported && !isSubscribed && permission !== 'denied' && !isDismissed;
    
    if (shouldShow) {
      // Show modal after a delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
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
        setIsOpen(false);
      }
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsOpen(false);
    sessionStorage.setItem('pushModalDismissed', 'true');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            הפעל התראות
          </DialogTitle>
          <DialogDescription>
            קבל התראות על משימות חדשות ועדכונים חשובים ישירות למכשיר שלך
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            התראות יעזרו לך להישאר מעודכן עם:
            <ul className="list-disc list-inside mt-2 space-y-1 mr-2">
              <li>משימות חדשות שהוקצו לך</li>
              <li>עדכונים חשובים במערכת</li>
              <li>תזכורות ומועדים</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
          >
            אולי מאוחר יותר
          </Button>
          
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            <Bell className="h-4 w-4 ml-2" />
            הפעל עכשיו
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 