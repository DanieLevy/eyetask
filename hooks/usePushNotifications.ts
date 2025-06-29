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
    console.log('[Push] Starting subscription process...');
    
    if (!state.isSupported) {
      console.error('[Push] Push notifications not supported');
      toast.error('Push notifications are not supported in this browser');
      return { success: false, error: 'Push notifications are not supported in this browser' };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission if not granted
      let permission = Notification.permission;
      console.log('[Push] Current permission:', permission);
      
      if (permission === 'default') {
        console.log('[Push] Requesting permission...');
        permission = await Notification.requestPermission();
        console.log('[Push] Permission result:', permission);
      }

      if (permission !== 'granted') {
        console.error('[Push] Permission denied');
        setState(prev => ({
          ...prev,
          permission,
          isLoading: false,
          error: 'Permission denied'
        }));
        toast.error('נדרשת הרשאה לשליחת התראות');
        return { success: false, error: 'נדרשת הרשאה לשליחת התראות' };
      }

      // Register service worker if not already registered
      console.log('[Push] Checking service worker registration...');
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        console.log('[Push] Registering service worker...');
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        console.log('[Push] Service worker registered:', registration);
      } else {
        console.log('[Push] Service worker already registered:', registration);
      }

      // Get VAPID public key
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      console.log('[Push] Fetching VAPID key...');
      
      const response = await fetch('/api/push/vapid-key');

      if (!response.ok) {
        console.error('[Push] Failed to fetch VAPID key:', response.status);
        throw new Error('Failed to fetch VAPID key');
      }

      const { publicKey } = await response.json();
      console.log('[Push] VAPID public key received, length:', publicKey?.length);

      // Detect if we're on iOS
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (navigator as any).standalone === true;
      
      console.log('[Push] Platform detection:', { isIOS, isStandalone });
      
      // iOS-specific validation
      if (isIOS && !publicKey) {
        throw new Error('VAPID key is required for iOS push notifications');
      }

      // Subscribe to push notifications
      console.log('[Push] Subscribing to push notifications...');
      
      // Check if user is admin for detailed logging
      const isAdmin = localStorage.getItem('adminToken') !== null;
      
      let subscription;
      try {
        // Log detailed VAPID key info for admin users
        if (isAdmin) {
          console.log('[Push Admin] Raw VAPID key:', publicKey);
          console.log('[Push Admin] VAPID key type:', typeof publicKey);
          console.log('[Push Admin] VAPID key first 50 chars:', publicKey?.substring(0, 50));
          
          try {
            const convertedKey = urlBase64ToUint8Array(publicKey);
            console.log('[Push Admin] Converted key byte length:', convertedKey.length);
            console.log('[Push Admin] First 10 bytes:', Array.from(convertedKey.slice(0, 10)));
          } catch (conversionError) {
            console.error('[Push Admin] VAPID key conversion error:', conversionError);
          }
        }
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        
        console.log('[Push] Subscription created:', subscription);
        console.log('[Push] Endpoint:', subscription.endpoint);
        
        // iOS-specific: Verify the subscription is valid
        if (isIOS && !subscription.endpoint) {
          throw new Error('Invalid subscription: no endpoint received');
        }
      } catch (subscribeError) {
        // Enhanced admin logging
        if (isAdmin) {
          console.error('[Push Admin] Full subscription error:', subscribeError);
          console.error('[Push Admin] Error name:', (subscribeError as Error).name);
          console.error('[Push Admin] Error message:', (subscribeError as Error).message);
          console.error('[Push Admin] Error stack:', (subscribeError as Error).stack);
          
          // Log DOMException details if available
          if (subscribeError instanceof DOMException) {
            console.error('[Push Admin] DOMException code:', subscribeError.code);
            console.error('[Push Admin] DOMException name:', subscribeError.name);
          }
        }
        
        console.error('[Push] Subscription error:', subscribeError);
        
        // Provide more specific error messages for iOS
        if (isIOS && subscribeError instanceof Error) {
          if (subscribeError.message.includes('applicationServerKey')) {
            throw new Error('iOS push notification setup failed: Invalid VAPID key format. Please contact support.');
          } else if (subscribeError.message.includes('permission')) {
            throw new Error('Push notification permission denied. Please enable notifications in iOS Settings.');
          }
        }
        
        throw subscribeError;
      }

      // Send subscription to server
      console.log('[Push] Sending subscription to server...');
      
      // Ensure we have a valid token
      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.error('[Push] No valid authentication token found');
        throw new Error('Authentication required');
      }
      
      const saveResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!saveResponse.ok) {
        console.error('[Push] Failed to save subscription:', saveResponse.status);
        const errorText = await saveResponse.text();
        console.error('[Push] Error response:', errorText);
        throw new Error('Failed to save subscription');
      }

      const result = await saveResponse.json();
      console.log('[Push] Subscription saved:', result);

      setState(prev => ({
        ...prev,
        permission: 'granted',
        isSubscribed: true,
        isLoading: false
      }));

      toast.success('הרשמת בהצלחה לקבלת התראות');
      return { success: true };
    } catch (error) {
      console.error('[Push] Error subscribing to push:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      // Don't show generic toast here, let the component handle it
      return { success: false, error: errorMessage };
    }
  }, [state.isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    console.log('[Push] Starting unsubscribe process...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      console.log('[Push] Current subscription:', subscription);

      if (!subscription) {
        setState(prev => ({
          ...prev,
          isSubscribed: false,
          isLoading: false
        }));
        return true;
      }

      // Unsubscribe from push
      console.log('[Push] Unsubscribing from push...');
      await subscription.unsubscribe();

      // Remove from server
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      console.log('[Push] Removing subscription from server...');
      
      // Ensure we have a valid token
      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.error('[Push] No valid authentication token found');
        throw new Error('Authentication required');
      }
      
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      console.log('[Push] Unsubscribed successfully');
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));

      toast.success('ביטלת את ההרשמה להתראות');
      return true;
    } catch (error) {
      console.error('[Push] Error unsubscribing from push:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message
      }));
      toast.error('שגיאה בביטול ההרשמה');
      return false;
    }
  }, []);

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

  return {
    ...state,
    subscribe,
    unsubscribe,
    showIOSInstallPrompt
  };
}

// Helper function to convert VAPID key - iOS compatible version
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const isAdmin = localStorage.getItem('adminToken') !== null;
  
  if (isAdmin) {
    console.log('[Push Admin] urlBase64ToUint8Array input:', base64String);
    console.log('[Push Admin] Input length:', base64String?.length);
    console.log('[Push Admin] Input type:', typeof base64String);
  }
  
  // Validate input
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Invalid VAPID key: empty or not a string');
  }
  
  // Remove any whitespace that might have been added
  base64String = base64String.trim();
  
  // iOS requires proper padding - ensure we have the right padding
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  if (isAdmin) {
    console.log('[Push Admin] After padding:', base64);
    console.log('[Push Admin] Padded length:', base64.length);
  }
  
  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    // Validate the key length for P-256 curve (iOS requirement)
    // P-256 public keys should be 65 bytes (uncompressed) or 33 bytes (compressed)
    if (outputArray.length !== 65 && outputArray.length !== 33) {
      console.warn('[Push] VAPID key length unusual:', outputArray.length, 'bytes');
      if (isAdmin) {
        console.error('[Push Admin] Invalid key length! Expected 65 or 33 bytes, got:', outputArray.length);
        console.error('[Push Admin] This may cause issues on iOS devices');
      }
    }
    
    if (isAdmin) {
      console.log('[Push Admin] Conversion successful, byte array length:', outputArray.length);
      console.log('[Push Admin] Key format:', outputArray.length === 65 ? 'uncompressed' : outputArray.length === 33 ? 'compressed' : 'unknown');
      
      // Check for uncompressed key format (should start with 0x04)
      if (outputArray.length === 65) {
        console.log('[Push Admin] First byte (should be 0x04 for uncompressed):', '0x' + outputArray[0].toString(16).padStart(2, '0'));
      }
    }
    
    return outputArray;
  } catch (error) {
    if (isAdmin) {
      console.error('[Push Admin] atob conversion failed:', error);
      console.error('[Push Admin] Base64 string that failed:', base64);
    }
    console.error('[Push] Error converting VAPID key:', error);
    throw new Error('Failed to convert VAPID key: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
} 