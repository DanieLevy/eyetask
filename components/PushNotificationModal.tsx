'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Smartphone, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isSupported, permission, subscribe, isSubscribed, isLoading } = usePushNotifications();
  const { toast } = useToast();

  useEffect(() => {
    // Add global function for testing (remove in production)
    if (typeof window !== 'undefined') {
      (window as any).resetPushNotifications = () => {
        localStorage.removeItem('pushNotificationAsked');
        console.log('[PushModal] Reset push notification state');
        window.location.reload();
      };
    }
    
    // Don't check until push notification state is loaded
    if (isLoading) {
      console.log('[PushModal] Still loading push notification state...');
      return;
    }
    
    // Check if we should show the modal
    const checkShouldShowModal = () => {
      if (!isSupported) return false;
      
      // Check if user is authenticated
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      if (!token) return false;
      
      // Don't show if already subscribed
      if (isSubscribed) return false;
      
      // Don't show if user has already been asked (stored in localStorage)
      const hasBeenAsked = localStorage.getItem('pushNotificationAsked');
      if (hasBeenAsked === 'true') return false;
      
      // Don't show if permission is denied (user explicitly denied)
      if (permission === 'denied') {
        localStorage.setItem('pushNotificationAsked', 'true');
        return false;
      }
      
      // Show modal if:
      // - Permission is default (not asked yet) OR
      // - Permission is granted but no subscription exists (user granted permission but didn't complete subscription)
      if (permission === 'default' || (permission === 'granted' && !isSubscribed)) {
        return true;
      }
      
      return false;
    };

    // Log immediately when loading completes
    console.log('[PushModal] Push notification state loaded:', {
      isSupported,
      hasToken: !!localStorage.getItem('adminToken') || !!localStorage.getItem('token'),
      isSubscribed,
      hasBeenAsked: localStorage.getItem('pushNotificationAsked'),
      permission,
      isLoading
    });

    // Show modal after a delay AFTER loading completes
    const timer = setTimeout(() => {
      const shouldShow = checkShouldShowModal();
      console.log('[PushModal] Delayed check result:', {
        shouldShow
      });
      
      if (shouldShow) {
        console.log('[PushModal] Opening modal...');
        setIsOpen(true);
      }
    }, 3000); // Wait 3 seconds after loading completes

    return () => clearTimeout(timer);
  }, [isSupported, permission, isSubscribed, isLoading]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    localStorage.setItem('pushNotificationAsked', 'true');
    
    try {
      const result = await subscribe();
      
      if (result.success) {
        toast({
          title: 'התראות הופעלו בהצלחה!',
          description: 'כעת תקבל עדכונים על משימות ופרויקטים',
        });
        setIsOpen(false);
      } else {
        toast({
          title: 'שגיאה בהפעלת התראות',
          description: result.error || 'אנא נסה שוב מאוחר יותר',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'לא ניתן להפעיל התראות כרגע';
      
      // Check if it's an authentication error
      if (errorMessage.includes('Authentication')) {
        toast({
          title: 'נדרשת התחברות',
          description: 'יש להתחבר למערכת כדי להפעיל התראות',
          variant: 'destructive',
        });
        // Close modal on auth error
        setIsOpen(false);
      } else {
        toast({
          title: 'שגיאה',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pushNotificationAsked', 'true');
    setIsOpen(false);
  };

  if (!isSupported || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            הפעל התראות
          </DialogTitle>
          <DialogDescription>
            קבל התראות על משימות חדשות ועדכונים חשובים ישירות למכשיר שלך
          </DialogDescription>
        </DialogHeader>
        <div className="text-right space-y-3 py-4">
          <p className="text-sm text-muted-foreground">קבל התראות על:</p>
          <ul className="list-disc list-inside space-y-1 mr-4 text-sm text-muted-foreground">
            <li>משימות חדשות שהוקצו לך</li>
            <li>עדכונים על פרויקטים שאתה מעורב בהם</li>
            <li>תזכורות למשימות דחופות</li>
            <li>הודעות מהמערכת</li>
          </ul>
          <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              התראות יעבדו גם כשהאפליקציה סגורה
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isProcessing}
          >
            אולי מאוחר יותר
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>טוען...</>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                הפעל התראות
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 