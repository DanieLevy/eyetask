"use client";

import { useEffect } from "react";

export default function IOSThemeHandler() {
  useEffect(() => {
    // Check if device is iOS from localStorage (set by the inline script)
    const isIOS = localStorage.getItem('isIOSDevice') === 'true';
    
    if (isIOS) {
      // Apply iOS dark mode class based on current theme after hydration
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (isDarkMode) {
        document.body.classList.add('ios-dark-mode');
      } else {
        document.body.classList.remove('ios-dark-mode');
      }
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.body.classList.add('ios-dark-mode');
        } else {
          document.body.classList.remove('ios-dark-mode');
        }
      };
      
      mediaQuery.addEventListener('change', handleThemeChange);
      
      // Also listen for changes to ios-theme-state
      const checkIOSThemeState = () => {
        try {
          const iosTheme = localStorage.getItem('ios-theme-state');
          if (iosTheme === 'dark') {
            document.body.classList.add('ios-dark-mode');
          } else if (iosTheme === 'light') {
            document.body.classList.remove('ios-dark-mode');
          }
        } catch (error) {
          // Ignore localStorage errors
        }
      };
      
      // Set up a storage event listener
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'ios-theme-state') {
          checkIOSThemeState();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleThemeChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, []);
  
  return null;
} 