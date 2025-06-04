'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // iOS-safe localStorage helpers
  const saveTheme = (theme: Theme) => {
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.warn('localStorage not available:', error);
      // On iOS, localStorage might fail in private mode or with restrictions
    }
  };

  const getTheme = (): Theme | null => {
    try {
      return (localStorage.getItem('theme') as Theme) || null;
    } catch (error) {
      console.warn('localStorage not available:', error);
      return null;
    }
  };

  // Detect iOS device
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  // Apply theme with iOS-specific handling
  const applyTheme = (newTheme: Theme) => {
    console.log('[ThemeToggle] applyTheme called with:', newTheme);
    
    const applyThemeLogic = () => {
      const root = document.documentElement;
      
      // Determine the actual theme to apply
      let resolvedTheme: 'light' | 'dark';
      if (newTheme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        console.log('[ThemeToggle] System theme detected as:', resolvedTheme);
      } else {
        resolvedTheme = newTheme;
        console.log('[ThemeToggle] Resolved theme set to:', resolvedTheme);
      }
      
      // iOS-specific: Remove classes first, then force reflow
      root.classList.remove('light', 'dark');
      root.offsetHeight; // Force reflow for iOS
      
      // Apply new theme
      root.classList.add(resolvedTheme);
      root.style.colorScheme = resolvedTheme;
      
      console.log('[ThemeToggle] Applied theme class:', resolvedTheme, 'New root classList:', root.classList.toString());
      
      // iOS-specific: Force additional reflow with RAF
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          root.style.setProperty('color-scheme', resolvedTheme);
          // Toggle a dummy class to ensure iOS recognizes the change
          root.classList.add('theme-transition');
          requestAnimationFrame(() => {
            root.classList.remove('theme-transition');
          });
        });
      }

      // iOS-specific: Force re-render if needed
      if (isIOS()) {
        setTimeout(() => {
          const currentDisplay = root.style.display;
          root.style.display = 'none';
          root.offsetHeight; // Trigger reflow
          root.style.display = currentDisplay || '';
        }, 0);
      }
    };

    // Ensure DOM is ready before applying theme
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyThemeLogic);
    } else {
      applyThemeLogic();
    }
  };

  // Initialize theme on mount with better iOS handling
  useEffect(() => {
    setMounted(true);
    console.log('[ThemeToggle] Component mounted.');
    
    // Get stored theme with fallback
    const storedTheme = getTheme() || 'system';
    console.log('[ThemeToggle] Stored theme from localStorage:', storedTheme);
    setTheme(storedTheme);
    
    // Apply theme with proper timing
    const initializeTheme = () => {
      console.log('[ThemeToggle] Applying initial theme:', storedTheme);
      applyTheme(storedTheme);
    };

    // iOS-specific: Ensure DOM is fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeTheme);
    } else {
      // Use small delay for iOS to ensure everything is ready
      if (isIOS()) {
        setTimeout(initializeTheme, 10);
      } else {
        initializeTheme();
      }
    }
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      document.removeEventListener('DOMContentLoaded', initializeTheme);
    };
  }, []);

  // Enhanced toggle with iOS event handling and error handling
  const toggleTheme = (e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent default behavior on iOS
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[ThemeToggle] toggleTheme called. Current theme:', theme);
    const themeOrder: Theme[] = ['system', 'light', 'dark'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    console.log('[ThemeToggle] New theme will be:', newTheme);
    
    // Update state first
    setTheme(newTheme);
    
    // Save to localStorage with error handling
    saveTheme(newTheme);
    console.log('[ThemeToggle] Attempted to store new theme in localStorage:', newTheme);
    
    // Apply theme with iOS-specific timing
    if (isIOS()) {
      // iOS needs more time between state update and DOM manipulation
      setTimeout(() => {
        applyTheme(newTheme);
      }, 50);
    } else {
      setTimeout(() => {
        applyTheme(newTheme);
      }, 0);
    }
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg flex items-center justify-center">
        <div className="w-5 h-5 animate-pulse bg-muted rounded"></div>
      </div>
    );
  }

  // Get current resolved theme for display
  const getResolvedTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  const resolvedTheme = getResolvedTheme();

  // Get icon based on current theme state
  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'dark':
        return <Moon className="w-5 h-5 text-blue-400" />;
      case 'system':
        return resolvedTheme === 'dark' ? (
          <div className="relative">
            <Monitor className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <Moon className="w-2.5 h-2.5 text-blue-400 absolute -top-0.5 -right-0.5" />
          </div>
        ) : (
          <div className="relative">
            <Monitor className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <Sun className="w-2.5 h-2.5 text-amber-500 absolute -top-0.5 -right-0.5" />
          </div>
        );
      default:
        return <Monitor className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  // Get tooltip text
  const getTooltip = () => {
    switch (theme) {
      case 'system':
        return `מעבר למצב בהיר (כרגע: ${resolvedTheme === 'dark' ? 'כהה' : 'בהיר'})`;
      case 'light':
        return 'מעבר למצב כהה';
      case 'dark':
        return 'מעבר למצב אוטומטי';
      default:
        return 'החלף ערכת נושא';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      onTouchStart={(e) => {
        // iOS-specific: Handle touch start for better responsiveness
        if (isIOS()) {
          e.currentTarget.style.transform = 'scale(0.95)';
        }
      }}
      onTouchEnd={(e) => {
        // iOS-specific: Reset transform and trigger toggle
        if (isIOS()) {
          e.currentTarget.style.transform = 'scale(1)';
          // Prevent double-triggering on iOS
          e.preventDefault();
          toggleTheme(e);
        }
      }}
      className="relative p-2 rounded-lg hover:bg-accent/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      <div className="flex items-center justify-center transform transition-transform duration-200 hover:scale-110">
        {getIcon()}
      </div>
    </button>
  );
} 