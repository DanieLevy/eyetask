"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function IOSThemeHandler() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Detect if the app is running as a PWA
    try {
      setIsPWA(
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        localStorage.getItem('isPWA') === 'true'
      );
      
      // Add listener for PWA display mode changes
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      const handleDisplayChange = (e: MediaQueryListEvent) => {
        setIsPWA(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleDisplayChange);
      return () => mediaQuery.removeEventListener('change', handleDisplayChange);
    } catch (e) {
      console.warn('PWA detection error:', e);
    }
  }, []);
  
  useEffect(() => {
    if (!mounted) return;
    
    // Only run on client after mount
    const isIOS = (() => {
      try {
        return localStorage.getItem('isIOSDevice') === 'true';
      } catch (e) {
        return false;
      }
    })();
    
    if (isIOS) {
      // Apply iOS dark mode class based on resolved theme after hydration
      if (resolvedTheme === 'dark') {
        document.body.classList.add('ios-dark-mode');
        
        // Update status bar color for dark mode in PWA
        if (isPWA) {
          const metaTheme = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
          if (metaTheme) {
            metaTheme.setAttribute('content', 'black-translucent');
          }
          
          // Change the theme meta color dynamically
          const themeColorMeta = document.querySelector('meta[name="theme-color"]');
          if (themeColorMeta) {
            themeColorMeta.setAttribute('content', '#000000');
          }
        }
      } else {
        document.body.classList.remove('ios-dark-mode');
        
        // Update status bar color for light mode in PWA
        if (isPWA) {
          const metaTheme = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
          if (metaTheme) {
            metaTheme.setAttribute('content', 'black-translucent');
          }
          
          // Change the theme meta color dynamically
          const themeColorMeta = document.querySelector('meta[name="theme-color"]');
          if (themeColorMeta) {
            themeColorMeta.setAttribute('content', '#ffffff');
          }
        }
      }
      
      // Add class to handle notch spacing if iOS PWA
      if (isPWA) {
        document.documentElement.classList.add('ios-pwa');
      } else {
        document.documentElement.classList.remove('ios-pwa');
      }
    }
  }, [resolvedTheme, mounted, isPWA]);
  
  return null;
} 