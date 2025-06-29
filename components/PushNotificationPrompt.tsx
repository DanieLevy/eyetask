'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Smartphone, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export default function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    showIOSInstallPrompt
  } = usePushNotifications();

  useEffect(() => {
    // Check if iOS
    const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(iOS);
    
    // Check if PWA is installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    
    // Show prompt after 30 seconds if:
    // - Push is supported
    // - Not already subscribed
    // - Permission not denied
    // - User is logged in
    // - For iOS: app is installed
    const timer = setTimeout(() => {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (
        token &&
        isSupported && 
        !isSubscribed && 
        permission !== 'denied' &&
        (!iOS || standalone)
      ) {
        setShowPrompt(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission]);

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleIOSPrompt = () => {
    showIOSInstallPrompt();
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  // iOS users who haven't installed the app
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
        <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Apple className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  התקן את האפליקציה לקבלת התראות
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  כדי לקבל התראות חשובות, יש להתקין את האפליקציה למסך הבית
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleIOSPrompt}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    הצג הוראות
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowPrompt(false)}
                  >
                    אחר כך
                  </Button>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setShowPrompt(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular prompt for other devices
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                קבל התראות חשובות
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                הפעל התראות כדי לקבל עדכונים על משימות, הודעות חדשות ועוד
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'מפעיל...' : 'הפעל התראות'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowPrompt(false)}
                >
                  לא עכשיו
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setShowPrompt(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 