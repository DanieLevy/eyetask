'use client';

import { useState } from 'react';
import { Bell, BellOff, Smartphone, RefreshCw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

export function PushNotificationSettings() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe,
    showIOSInstallPrompt 
  } = usePushNotifications();

  const handleToggle = async () => {
    setIsProcessing(true);
    
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
        
        if (isIOS && !isStandalone) {
          showIOSInstallPrompt();
        } else {
          await subscribe();
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return <Badge variant="secondary">לא נתמך</Badge>;
    }
    if (permission === 'denied') {
      return <Badge variant="destructive">נחסם</Badge>;
    }
    if (isSubscribed) {
      return <Badge variant="default" className="bg-green-600">פעיל</Badge>;
    }
    return <Badge variant="outline">לא פעיל</Badge>;
  };

  const getStatusMessage = () => {
    if (!isSupported) {
      return 'הדפדפן שלך אינו תומך בהתראות Push';
    }
    if (permission === 'denied') {
      return 'התראות נחסמו. יש לאפשר אותן בהגדרות הדפדפן';
    }
    if (isSubscribed) {
      return 'אתה מקבל התראות על עדכונים ומשימות חדשות';
    }
    return 'הפעל התראות כדי לקבל עדכונים על משימות חדשות';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              התראות Push
            </CardTitle>
            <CardDescription>
              נהל את העדפות ההתראות שלך
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={cn(
          "border",
          isSubscribed ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-muted"
        )}>
          <div className="flex items-start gap-3">
            {isSubscribed ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <AlertDescription className="text-sm">
              {getStatusMessage()}
            </AlertDescription>
          </div>
        </Alert>

        {isSupported && permission !== 'denied' && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>התראות למכשיר זה</span>
            </div>
            
            <Button
              onClick={handleToggle}
              disabled={isLoading || isProcessing}
              variant={isSubscribed ? "destructive" : "default"}
              size="sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  מעבד...
                </>
              ) : isSubscribed ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  בטל התראות
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  הפעל התראות
                </>
              )}
            </Button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="text-sm text-muted-foreground space-y-2 pt-2">
            <p>כדי להפעיל התראות:</p>
            <ol className="list-decimal list-inside space-y-1 mr-2">
              <li>פתח את הגדרות הדפדפן</li>
              <li>חפש את הגדרות האתר או ההתראות</li>
              <li>אפשר התראות עבור אתר זה</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 