'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

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
      // Removed verbose push notification logging

      try {
        const isSupported = 
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          'Notification' in window;

        // Support check done silently

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

        // Check if already subscribed
        if ('serviceWorker' in navigator && permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          setState(prev => ({
            ...prev,
            isSupported: true,
            permission,
            isSubscribed: !!subscription,
            isLoading: false
          }));
          // Initial check complete
        } else {
          setState(prev => ({
            ...prev,
            isSupported: true,
            permission,
            isSubscribed: false,
            isLoading: false
          }));
          // Initial check complete
        }
      } catch (error) {
        logger.error('[Push] Error checking push support:', 'PUSH_NOTIFICATIONS', undefined, error as Error);
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

    logger.info('[Push Client] Starting subscription process...', 'PUSH_NOTIFICATIONS');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check for service worker support
      if (!('serviceWorker' in navigator)) {
        logger.error('[Push Client] Service Worker not supported', 'PUSH_NOTIFICATIONS');
        toast.error('Push notifications are not supported in this browser');
        return;
      }

      // Check for push API support
      if (!('PushManager' in window)) {
        logger.error('[Push Client] Push API not supported', 'PUSH_NOTIFICATIONS');
        toast.error('Push notifications are not supported in this browser');
        return;
      }

      // iOS/Safari specific checks
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      logger.info('[Push Client] Device detection:', 'PUSH_NOTIFICATIONS', { isIOS, isSafari });

      // Request notification permission
      logger.info('[Push Client] Requesting permission...', 'PUSH_NOTIFICATIONS');
      const permission = await Notification.requestPermission();
      logger.info('[Push Client] Permission result:', 'PUSH_NOTIFICATIONS', { permission });
      
      if (permission !== 'granted') {
        logger.warn('[Push Client] Permission denied', 'PUSH_NOTIFICATIONS');
        toast.error('צריך לאשר התראות כדי להפעיל את השירות');
        return;
      }

      setState(prev => ({ ...prev, permission }));

      // Register service worker
      logger.info('[Push Client] Registering service worker...', 'PUSH_NOTIFICATIONS');
      const registration = await navigator.serviceWorker.ready;
      logger.info('[Push Client] Service worker ready', 'PUSH_NOTIFICATIONS');

      // Get VAPID key
      logger.info('[Push Client] Fetching VAPID key...', 'PUSH_NOTIFICATIONS');
      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to fetch VAPID key');
      }
      const { publicKey } = await vapidResponse.json();
      logger.info('[Push Client] VAPID key received, length:', 'PUSH_NOTIFICATIONS', { length: publicKey?.length });

      // Convert VAPID key with enhanced iOS support
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      logger.info('[Push Client] Converted key, byte length:', 'PUSH_NOTIFICATIONS', { byteLength: applicationServerKey.byteLength });

      // Subscribe to push
      logger.info('[Push Client] Creating push subscription...', 'PUSH_NOTIFICATIONS');
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      logger.info('[Push Client] Push subscription created', 'PUSH_NOTIFICATIONS');

      // Get token (optional - not required for subscription)
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      logger.info('[Push Client] Auth token status:', 'PUSH_NOTIFICATIONS', { hasToken: !!token });

      // Get user name from session storage
      const userName = sessionStorage.getItem('push-subscribe-name') || '';
      
      // Save subscription to server
      logger.info('[Push Client] Saving subscription to server...', 'PUSH_NOTIFICATIONS');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
          userName: userName
        })
      });
      
      // Clear the name from session storage after use
      sessionStorage.removeItem('push-subscribe-name');

      if (!response.ok) {
        const error = await response.text();
        logger.error('[Push Client] Server response error:', 'PUSH_NOTIFICATIONS', {
          status: response.status,
          error
        });
        throw new Error(`Failed to save subscription: ${response.status}`);
      }

      const result = await response.json();
      logger.info('[Push Client] Subscription saved successfully:', 'PUSH_NOTIFICATIONS', result);

      // Store the userId in sessionStorage for later use
      if (result.userId) {
        sessionStorage.setItem('push-subscription-user-id', result.userId);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false
      }));

      toast.success('התראות הופעלו בהצלחה! 🔔');
      
      // Test notification after 2 seconds (only if user is authenticated)
      if (token) {
        setTimeout(() => {
          logger.info('[Push Client] Sending test notification...', 'PUSH_NOTIFICATIONS');
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
          }).catch(err => logger.error('[Push Client] Test notification failed:', 'PUSH_NOTIFICATIONS', undefined, err));
        }, 2000);
      }

    } catch (error) {
      logger.error('[Push Client] Subscription error:', 'PUSH_NOTIFICATIONS', undefined, error as Error);
      toast.error('שגיאה בהפעלת התראות: ' + (error as Error).message);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.isSubscribed]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (state.isLoading || !state.isSubscribed) return;

    logger.info('[Push Client] Starting unsubscribe process...', 'PUSH_NOTIFICATIONS');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        logger.info('[Push Client] Found subscription, unsubscribing...', 'PUSH_NOTIFICATIONS');
        await subscription.unsubscribe();
        
        // Remove from server (with or without auth)
        logger.info('[Push Client] Removing subscription from server...', 'PUSH_NOTIFICATIONS');
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers,
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }
      
      // Clear stored userId
      sessionStorage.removeItem('push-subscription-user-id');
      
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));
      toast.success('התראות בוטלו בהצלחה');
      logger.info('[Push Client] Unsubscribe completed', 'PUSH_NOTIFICATIONS');
    } catch (error) {
      logger.error('[Push Client] Unsubscribe error:', 'PUSH_NOTIFICATIONS', undefined, error as Error);
      toast.error('שגיאה בביטול התראות');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.isSubscribed]);

  // Show iOS install prompt
  const showIOSInstallPrompt = useCallback(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               ((window.navigator as unknown) as { standalone?: boolean }).standalone === true;
    
    logger.info('[Push] iOS install prompt check:', 'PUSH_NOTIFICATIONS', { isIOS, isInStandaloneMode });
    
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
    logger.warn('[Push] VAPID key length may not be compatible with iOS', 'PUSH_NOTIFICATIONS', {
      length: outputArray.length,
      expectedLengths: [33, 65]
    });
  }

  return outputArray;
} 