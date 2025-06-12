"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function IOSThemeHandler() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
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
    
    if (isIOS && resolvedTheme) {
      // Apply iOS dark mode class based on resolved theme after hydration
      if (resolvedTheme === 'dark') {
        document.body.classList.add('ios-dark-mode');
      } else {
        document.body.classList.remove('ios-dark-mode');
      }
    }
  }, [resolvedTheme, mounted]);
  
  return null;
} 