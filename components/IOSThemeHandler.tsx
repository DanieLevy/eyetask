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
  
  useEffect(() => {
    // Run only on client side
    if (typeof window !== 'undefined') {
      // Check if device is iOS
      const isIOSDevice = localStorage.getItem('isIOSDevice') === 'true';
      const isPWA = localStorage.getItem('isPWA') === 'true';

      if (isIOSDevice) {
        document.documentElement.classList.add('ios-device');
        
        // Apply PWA specific styles for iOS
        if (isPWA) {
          document.documentElement.classList.add('ios-pwa');
          
          // Fix layout spacing issues in PWA mode
          const fixPWASpacing = () => {
            // Fix spacing: remove any unnecessary padding/margin at the top
            document.documentElement.style.padding = '0';
            document.documentElement.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.margin = '0';
            
            // Apply safe-area-inset only to the header
            const header = document.querySelector('header.unified-header');
            if (header) {
              // Use inline style for immediate effect
              header.setAttribute('style', 'padding-top: env(safe-area-inset-top); margin-top: 0;');
            }
            
            // Fix dropdown menus
            const dropdowns = document.querySelectorAll('.dropdown-menu-content');
            dropdowns.forEach(dropdown => {
              dropdown.classList.add('notch-aware-dropdown');
              // Ensure no padding at top of dropdown
              (dropdown as HTMLElement).style.paddingTop = '0';
              (dropdown as HTMLElement).style.marginTop = '0';
            });
          };
          
          // Apply fixes immediately
          fixPWASpacing();
          
          // Also apply fixes after a short delay to handle post-hydration rendering
          setTimeout(fixPWASpacing, 100);
          setTimeout(fixPWASpacing, 500);
        }
      }
    }
  }, []);
  
  return null;
} 