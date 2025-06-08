'use client';

import { useState, useEffect, useCallback } from 'react';

interface PWAInstallPrompt extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAStatus {
  // Installation & Display
  isStandalone: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
  
  // Platform Detection
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  isIOSSafari: boolean;
  isAndroidChrome: boolean;
  
  // User Experience
  shouldShowInstallPrompt: boolean;
  shouldShowSmartBanner: boolean;
  hasBeenPromptedBefore: boolean;
  installDismissed: boolean;
  neverShow: boolean;
  
  // Deep Linking
  canHandleAppLinks: boolean;
  launchParams?: URLSearchParams;
}

interface UsePWADetectionReturn {
  status: PWAStatus;
  
  // Installation Actions
  installApp: () => Promise<boolean>;
  showInstallInstructions: () => void;
  dismissInstallPrompt: () => void;
  
  // App Launching
  openInApp: (url?: string) => boolean;
  redirectToApp: (path?: string) => void;
  
  // User Preferences
  neverShowAgain: () => void;
  remindLater: () => void;
  
  // Utilities
  getAppUrl: (path?: string) => string;
  isAppUrl: (url: string) => boolean;
}

const STORAGE_KEYS = {
  INSTALL_DISMISSED: 'eyetask-install-dismissed',
  INSTALL_REMINDED: 'eyetask-install-reminded',
  NEVER_SHOW: 'eyetask-never-show-install',
  LAUNCH_COUNT: 'eyetask-launch-count'
} as const;

const APP_DOMAINS = [
  'drivershub.netlify.app',
  'localhost:3000',
  '192.168.8.236:3000'
] as const;

export function usePWADetection(): UsePWADetectionReturn {
  const [status, setStatus] = useState<PWAStatus>({
    isStandalone: false,
    isInstallable: false,
    isInstalled: false,
    canInstall: false,
    displayMode: 'browser',
    platform: 'unknown',
    isIOSSafari: false,
    isAndroidChrome: false,
    shouldShowInstallPrompt: false,
    shouldShowSmartBanner: false,
    hasBeenPromptedBefore: false,
    installDismissed: false,
    neverShow: false,
    canHandleAppLinks: false
  });

  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Detect platform and capabilities
  const detectPlatform = useCallback((): PWAStatus['platform'] => {
    if (typeof window === 'undefined' || !isClient) return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = /mobile/.test(userAgent);
    
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    if (!isMobile) return 'desktop';
    return 'unknown';
  }, [isClient]);

  // Check if running in standalone mode
  const checkStandaloneMode = useCallback((): boolean => {
    if (typeof window === 'undefined' || !isClient) return false;
    
    // Standard PWA standalone detection
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    
    // iOS Safari specific detection
    if ((window.navigator as any).standalone) return true;
    
    // Additional checks for various browsers
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    
    return false;
  }, [isClient]);

  // Get current display mode
  const getDisplayMode = useCallback((): PWAStatus['displayMode'] => {
    if (typeof window === 'undefined' || !isClient) return 'browser';
    
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    return 'browser';
  }, [isClient]);

  // Check if app is likely installed
  const checkInstallationStatus = useCallback((): boolean => {
    if (typeof window === 'undefined' || !isClient) return false;
    
    // If running in standalone, it's definitely installed
    if (checkStandaloneMode()) return true;
    
    // Check launch count (higher count suggests installation)
    const launchCount = parseInt(localStorage.getItem(STORAGE_KEYS.LAUNCH_COUNT) || '0');
    
    // Check if user has interacted with install prompts before
    const hasBeenPrompted = localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED) !== null;
    
    // Heuristic: if high launch count and no prompts shown, likely installed
    return launchCount > 10 && !hasBeenPrompted;
  }, [checkStandaloneMode, isClient]);

  // Check if should show install prompt
  const shouldShowInstallPrompt = useCallback((): boolean => {
    if (typeof window === 'undefined' || !isClient) return false;
    
    // Don't show if already in standalone mode
    if (checkStandaloneMode()) return false;
    
    // Don't show if user opted out
    if (localStorage.getItem(STORAGE_KEYS.NEVER_SHOW) === 'true') return false;
    
    // Don't show if recently dismissed
    const dismissed = localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return false; // Wait 7 days
    }
    
    // Show if installable prompt is available
    return deferredPrompt !== null;
  }, [checkStandaloneMode, deferredPrompt, isClient]);

  // Parse launch parameters for deep linking
  const getLaunchParams = useCallback((): URLSearchParams | undefined => {
    if (typeof window === 'undefined' || !isClient) return undefined;
    return new URLSearchParams(window.location.search);
  }, [isClient]);

  // Update status
  const updateStatus = useCallback(() => {
    if (!isClient) return;
    
    const platform = detectPlatform();
    const isStandalone = checkStandaloneMode();
    const displayMode = getDisplayMode();
    const isInstalled = checkInstallationStatus();
    const launchParams = getLaunchParams();
    
    const newStatus: PWAStatus = {
      isStandalone,
      isInstallable: deferredPrompt !== null,
      isInstalled,
      canInstall: deferredPrompt !== null,
      displayMode,
      platform,
      isIOSSafari: platform === 'ios' && /safari/.test(navigator.userAgent.toLowerCase()),
      isAndroidChrome: platform === 'android' && /chrome/.test(navigator.userAgent.toLowerCase()),
      shouldShowInstallPrompt: shouldShowInstallPrompt(),
      shouldShowSmartBanner: !isStandalone && !shouldShowInstallPrompt(),
      hasBeenPromptedBefore: localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED) !== null,
      installDismissed: localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED) !== null,
      neverShow: localStorage.getItem(STORAGE_KEYS.NEVER_SHOW) === 'true',
      canHandleAppLinks: isStandalone || isInstalled,
      launchParams
    };
    
    setStatus(newStatus);
  }, [
    detectPlatform,
    checkStandaloneMode,
    getDisplayMode,
    checkInstallationStatus,
    getLaunchParams,
    shouldShowInstallPrompt,
    deferredPrompt,
    isClient
  ]);

  // Install app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: Installation accepted');
        localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED, Date.now().toString());
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('PWA: Installation dismissed');
        dismissInstallPrompt();
        return false;
      }
    } catch (error) {
      console.error('PWA: Installation failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Show install instructions for iOS
  const showInstallInstructions = useCallback(() => {
    // This will be handled by a modal/banner component
    console.log('PWA: Showing install instructions');
  }, []);

  // Dismiss install prompt
  const dismissInstallPrompt = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED, Date.now().toString());
    setDeferredPrompt(null);
    updateStatus();
  }, [updateStatus]);

  // Get app URL for deep linking
  const getAppUrl = useCallback((path: string = ''): string => {
    const baseUrl = 'https://drivershub.netlify.app';
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }, []);

  // Check if URL belongs to this app
  const isAppUrl = useCallback((url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return APP_DOMAINS.some(domain => urlObj.hostname === domain);
    } catch {
      return false;
    }
  }, []);

  // Open in app (attempt to launch PWA)
  const openInApp = useCallback((url?: string): boolean => {
    if (!status.canHandleAppLinks) return false;
    
    const targetUrl = url || window.location.href;
    
    try {
      // Try to use custom URL scheme (if configured)
      const appSchemeUrl = `drivershub://${new URL(targetUrl).pathname}${new URL(targetUrl).search}`;
      window.location.href = appSchemeUrl;
      
      // Fallback to regular URL after short delay
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 100);
      
      return true;
    } catch (error) {
      console.error('PWA: Failed to open in app:', error);
      return false;
    }
  }, [status.canHandleAppLinks]);

  // Redirect to app
  const redirectToApp = useCallback((path?: string) => {
    const appUrl = getAppUrl(path);
    
    if (status.isStandalone) {
      // Already in app, just navigate
      window.location.href = appUrl;
    } else if (status.canHandleAppLinks) {
      // Try to open in installed app
      openInApp(appUrl);
    } else {
      // Open in browser
      window.location.href = appUrl;
    }
  }, [status.isStandalone, status.canHandleAppLinks, getAppUrl, openInApp]);

  // Never show install prompts again
  const neverShowAgain = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.NEVER_SHOW, 'true');
    updateStatus();
  }, [updateStatus]);

  // Remind later (7 days)
  const remindLater = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.INSTALL_REMINDED, Date.now().toString());
    updateStatus();
  }, [updateStatus]);

  // Setup event listeners
  useEffect(() => {
    if (!isClient) return;
    
    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Only prevent default if we want to control the prompt timing
      const neverShow = localStorage.getItem(STORAGE_KEYS.NEVER_SHOW) === 'true';
      const isStandalone = checkStandaloneMode();
      
      if (!neverShow && !isStandalone) {
        e.preventDefault(); // Only prevent if we plan to show our own prompt
        setDeferredPrompt(e as PWAInstallPrompt);
      }
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('PWA: App installed successfully');
      setDeferredPrompt(null);
      updateStatus();
    };

    // Listen for display mode changes
    const handleDisplayModeChange = () => {
      updateStatus();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);

    // Track launch count
    const launchCount = parseInt(localStorage.getItem(STORAGE_KEYS.LAUNCH_COUNT) || '0');
    localStorage.setItem(STORAGE_KEYS.LAUNCH_COUNT, (launchCount + 1).toString());

    // Initial status update
    updateStatus();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, [updateStatus, isClient]);

  return {
    status,
    installApp,
    showInstallInstructions,
    dismissInstallPrompt,
    openInApp,
    redirectToApp,
    neverShowAgain,
    remindLater,
    getAppUrl,
    isAppUrl
  };
} 