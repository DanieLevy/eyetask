import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PushManagerState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushManagerState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      console.log('[Push] Checking push notification support...');
      try {
        const isSupported = 
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          'Notification' in window;

        console.log('[Push] Support check:', {
          serviceWorker: 'serviceWorker' in navigator,
          PushManager: 'PushManager' in window,
          Notification: 'Notification' in window,
          isSupported
        });

        if (!isSupported) {
          setState(prev => ({
            ...prev,
            isSupported: false,
            isLoading: false,
            error: 'Push notifications are not supported in this browser'
          }));
          return;
        }

        // Check current permission
        const permission = Notification.permission;
        console.log('[Push] Current permission:', permission);

        // Check if already subscribed
        if ('serviceWorker' in navigator && permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          console.log('[Push] Service worker ready:', registration);
          
          const subscription = await registration.pushManager.getSubscription();
          console.log('[Push] Current subscription:', subscription);
          
          setState(prev => ({
            ...prev,
            isSupported: true,
            permission,
            isSubscribed: !!subscription,
            isLoading: false
          }));
          console.log('[Push] Initial check complete - isLoading: false, isSubscribed:', !!subscription);
        } else {
          setState(prev => ({
            ...prev,
            isSupported: true,
            permission,
            isSubscribed: false,
            isLoading: false
          }));
          console.log('[Push] Initial check complete - isLoading: false, permission:', permission);
        }
      } catch (error) {
        console.error('[Push] Error checking push support:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Error checking push notification support'
        }));
      }
    };

    checkSupport();
  }, []);

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (state.isLoading || state.isSubscribed) return;

    console.log('[Push Client] Starting subscription process...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check for service worker support
      if (!('serviceWorker' in navigator)) {
        console.error('[Push Client] Service Worker not supported');
        toast.error('Push notifications are not supported in this browser');
        return;
      }

      // Check for push API support
      if (!('PushManager' in window)) {
        console.error('[Push Client] Push API not supported');
        toast.error('Push notifications are not supported in this browser');
        return;
      }

      // iOS/Safari specific checks
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      console.log('[Push Client] Device detection:', { isIOS, isSafari });

      // Request notification permission
      console.log('[Push Client] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('[Push Client] Permission result:', permission);
      
      if (permission !== 'granted') {
        console.warn('[Push Client] Permission denied');
        toast.error('צריך לאשר התראות כדי להפעיל את השירות');
        return;
      }

      setState(prev => ({ ...prev, permission }));

      // Register service worker
      console.log('[Push Client] Registering service worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push Client] Service worker ready');

      // Get VAPID key
      console.log('[Push Client] Fetching VAPID key...');
      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to fetch VAPID key');
      }
      const { publicKey } = await vapidResponse.json();
      console.log('[Push Client] VAPID key received, length:', publicKey?.length);

      // Convert VAPID key with enhanced iOS support
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      console.log('[Push Client] Converted key, byte length:', applicationServerKey.byteLength);

      // Subscribe to push
      console.log('[Push Client] Creating push subscription...');
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      console.log('[Push Client] Push subscription created');

      // Get token
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      if (!token) {
        console.error('[Push Client] No auth token found');
        toast.error('צריך להתחבר כדי להפעיל התראות');
        return;
      }

      // Save subscription to server
      console.log('[Push Client] Saving subscription to server...');
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: pushSubscription.toJSON()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Push Client] Server response error:', response.status, error);
        throw new Error(`Failed to save subscription: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Push Client] Subscription saved successfully:', result);

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false
      }));

      toast.success('התראות הופעלו בהצלחה! 🔔');
      
      // Test notification after 2 seconds
      setTimeout(() => {
        console.log('[Push Client] Sending test notification...');
        fetch('/api/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: 'ברוכים הבאים!',
            body: 'התראות הופעלו בהצלחה',
            icon: '/icons/icon-192x192.png',
            test: true
          })
        }).catch(err => console.error('[Push Client] Test notification failed:', err));
      }, 2000);

    } catch (error) {
      console.error('[Push Client] Subscription error:', error);
      toast.error('שגיאה בהפעלת התראות: ' + (error as Error).message);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.isSubscribed]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (state.isLoading || !state.isSubscribed) return;

    console.log('[Push Client] Starting unsubscribe process...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('[Push Client] Found subscription, unsubscribing...');
        await subscription.unsubscribe();
        
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        if (token) {
          console.log('[Push Client] Removing subscription from server...');
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint
            })
          });
        }
      }
      
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));
      toast.success('התראות בוטלו בהצלחה');
      console.log('[Push Client] Unsubscribe completed');
    } catch (error) {
      console.error('[Push Client] Unsubscribe error:', error);
      toast.error('שגיאה בביטול התראות');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.isSubscribed]);

  // Show iOS install prompt
  const showIOSInstallPrompt = useCallback(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in navigator) && (navigator as any).standalone;
    
    console.log('[Push] iOS install prompt check:', { isIOS, isInStandaloneMode });
    
    if (isIOS && !isInStandaloneMode) {
      const message = `התקן את האפליקציה כדי לקבל התראות:
1. לחץ על כפתור השיתוף ⬆️
2. בחר "הוסף למסך הבית"
3. לחץ "הוסף"`;
      
      toast(message, {
        duration: 10000,
        action: {
          label: 'הבנתי',
          onClick: () => {}
        }
      });
      return true;
    }
    return false;
  }, []);

  // Helper setters
  const setIsLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  };

  const setIsSubscribed = (subscribed: boolean) => {
    setState(prev => ({ ...prev, isSubscribed: subscribed }));
  };

  const setPermission = (permission: NotificationPermission) => {
    setState(prev => ({ ...prev, permission }));
  };

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    error: state.error,
    subscribe,
    unsubscribe,
    showIOSInstallPrompt
  };
}

// Enhanced VAPID key conversion with iOS support
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Clean the input string
  base64String = base64String.trim();
  
  // Handle URL-safe base64
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  // Decode base64
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  // Validate P-256 key for iOS (65 bytes uncompressed or 33 bytes compressed)
  if (outputArray.length !== 65 && outputArray.length !== 33) {
    console.warn('[Push] VAPID key length:', outputArray.length, 'bytes - may not be compatible with iOS');
  }

  return outputArray;
} 