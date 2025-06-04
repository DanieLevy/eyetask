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
      const body = document.body;
      
      // Determine the actual theme to apply
      let resolvedTheme: 'light' | 'dark';
      if (newTheme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        console.log('[ThemeToggle] System theme detected as:', resolvedTheme);
      } else {
        resolvedTheme = newTheme;
        console.log('[ThemeToggle] Resolved theme set to:', resolvedTheme);
      }
      
      // Phase 1: Enhanced iOS class removal with forced reflows
      root.classList.remove('light', 'dark', 'theme-transition');
      
      // iOS-specific: Multiple forced reflows for better WebKit compatibility
      if (isIOS()) {
        try {
          if (root.offsetHeight !== undefined) root.offsetHeight;
          root.scrollTop = root.scrollTop;
          if (body.offsetHeight !== undefined) body.offsetHeight;
        } catch (error) {
          console.warn('[ThemeToggle] iOS reflow error:', error);
        }
        
        // Force CSS custom properties to update on iOS
        try {
          root.style.setProperty('--ios-theme-force', Date.now().toString());
          root.style.removeProperty('--ios-theme-force');
        } catch (error) {
          console.warn('[ThemeToggle] iOS CSS property error:', error);
        }
      }
      
      // Phase 2: Add transition class for smooth animation
      root.classList.add('theme-transition');
      
      // Phase 3: Apply new theme class and properties
      root.classList.add(resolvedTheme);
      root.style.colorScheme = resolvedTheme;
      root.setAttribute('data-theme', resolvedTheme);
      body.style.colorScheme = resolvedTheme;
      
      console.log('[ThemeToggle] Applied theme class:', resolvedTheme, 'New root classList:', root.classList.toString());
      
      // Phase 4: Enhanced iOS DOM manipulation with multiple RAF
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          // First RAF: Set CSS properties
          root.style.setProperty('color-scheme', resolvedTheme);
          body.style.setProperty('color-scheme', resolvedTheme);
          
          // iOS-specific: Force hardware acceleration
          if (isIOS()) {
            try {
              root.style.transform = 'translateZ(0)';
              root.style.willChange = 'transform';
            } catch (error) {
              console.warn('[ThemeToggle] iOS hardware acceleration error:', error);
            }
          }
          
          // Force another reflow
          try {
            if (root.offsetHeight !== undefined) root.offsetHeight;
          } catch (error) {
            console.warn('[ThemeToggle] RAF reflow error:', error);
          }
          
          requestAnimationFrame(() => {
            // Second RAF: Update meta theme-color with proper error handling
            try {
              const metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
              if (metaThemeColor) {
                metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff');
              } else {
                // Create theme-color meta tag if it doesn't exist
                const newMetaThemeColor = document.createElement('meta');
                newMetaThemeColor.name = 'theme-color';
                newMetaThemeColor.content = resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff';
                document.head.appendChild(newMetaThemeColor);
              }
            } catch (error) {
              console.warn('[ThemeToggle] Meta theme-color update error:', error);
            }
            
            // iOS-specific: Force viewport update with error handling
            if (isIOS()) {
              try {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                  const content = viewport.getAttribute('content');
                  if (content) {
                    const tempContent = content + ', theme-color=' + (resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff');
                    viewport.setAttribute('content', tempContent);
                    setTimeout(() => {
                      viewport.setAttribute('content', content);
                    }, 100);
                  }
                }
              } catch (error) {
                console.warn('[ThemeToggle] iOS viewport update error:', error);
              }
            }
            
            requestAnimationFrame(() => {
              // Third RAF: Clean up and force element recalculation
              root.classList.remove('theme-transition');
              
              // iOS-specific: Reset hardware acceleration
              if (isIOS()) {
                try {
                  root.style.transform = '';
                  root.style.willChange = 'auto';
                  
                  // Force all elements to recalculate styles on iOS
                  const allElements = document.querySelectorAll('*');
                  for (let i = 0; i < Math.min(allElements.length, 100); i++) {
                    try {
                      const el = allElements[i] as HTMLElement;
                      if (el && el.offsetHeight !== undefined) {
                        el.offsetHeight; // Force style recalculation
                      }
                    } catch (error) {
                      // Ignore individual element errors
                    }
                  }
                  
                  // Additional iOS force reflows
                  setTimeout(() => {
                    try {
                      const htmlElement = document.documentElement;
                      const currentDisplay = htmlElement.style.display;
                      htmlElement.style.display = 'none';
                      if (htmlElement.offsetHeight !== undefined) htmlElement.offsetHeight; // Trigger reflow
                      htmlElement.style.display = currentDisplay || '';
                    } catch (error) {
                      console.warn('[ThemeToggle] iOS final reflow error:', error);
                    }
                  }, 10);
                } catch (error) {
                  console.warn('[ThemeToggle] iOS cleanup error:', error);
                }
              }
            });
          });
        });
      }

      // iOS-specific: Additional force re-render with enhanced checks
      if (isIOS()) {
        setTimeout(() => {
          try {
            // Enhanced style recalculation for iOS WebKit
            const currentDisplay = document.body.style.display;
            document.body.style.display = 'none';
            if (document.body.offsetHeight !== undefined) document.body.offsetHeight; // Trigger reflow
            document.body.style.display = currentDisplay || '';
            
            // Verify theme application and retry if needed
            setTimeout(() => {
              if (!root.classList.contains(resolvedTheme)) {
                console.warn('[ThemeToggle] iOS theme application failed, retrying...');
                root.classList.add(resolvedTheme);
                root.style.colorScheme = resolvedTheme;
                body.style.colorScheme = resolvedTheme;
                
                // Force one more recalculation
                setTimeout(() => {
                  try {
                    if (root.offsetHeight !== undefined) root.offsetHeight;
                    if (body.offsetHeight !== undefined) body.offsetHeight;
                  } catch (error) {
                    console.warn('[ThemeToggle] iOS retry reflow error:', error);
                  }
                }, 50);
              }
            }, 100);
          } catch (error) {
            console.warn('[ThemeToggle] iOS additional rerender error:', error);
          }
        }, 10);
        
        // iOS-specific: Listen for orientation changes during theme switch
        const handleOrientationChange = () => {
          setTimeout(() => {
            if (root.classList.contains(resolvedTheme)) {
              root.style.colorScheme = resolvedTheme;
              body.style.colorScheme = resolvedTheme;
            }
          }, 100);
        };
        
        window.addEventListener('orientationchange', handleOrientationChange, { once: true });
        
        // Clean up after 5 seconds
        setTimeout(() => {
          window.removeEventListener('orientationchange', handleOrientationChange);
        }, 5000);
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

  // Enhanced toggle with iOS event handling and proper error handling
  const toggleTheme = (e?: React.MouseEvent | React.TouchEvent | Event) => {
    // Prevent default behavior on iOS and stop propagation with proper error handling
    if (e) {
      try {
        e.preventDefault();
        e.stopPropagation();
        
        // iOS-specific: Prevent double-tap zoom
        if (isIOS() && e.type === 'touchend') {
          // Access stopImmediatePropagation on the native event for TouchEvents
          const reactTouchEvent = e as React.TouchEvent; // Cast to React.TouchEvent to access nativeEvent
          if (reactTouchEvent.nativeEvent && typeof reactTouchEvent.nativeEvent.stopImmediatePropagation === 'function') {
            reactTouchEvent.nativeEvent.stopImmediatePropagation();
          }
        }
      } catch (error) {
        console.warn('[ThemeToggle] Event handling error:', error);
      }
    }
    
    console.log('[ThemeToggle] toggleTheme called. Current theme:', theme);
    const themeOrder: Theme[] = ['system', 'light', 'dark'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    console.log('[ThemeToggle] New theme will be:', newTheme);
    
    // Update state first
    setTheme(newTheme);
    
    // Save to localStorage with enhanced error handling
    try {
      saveTheme(newTheme);
      console.log('[ThemeToggle] Successfully stored new theme in localStorage:', newTheme);
    } catch (error) {
      console.warn('[ThemeToggle] Failed to store theme in localStorage:', error);
    }
    
    // Apply theme with iOS-specific timing and error handling
    try {
      if (isIOS()) {
        // iOS needs more time between state update and DOM manipulation
        // Use multiple timing strategies for better compatibility
        setTimeout(() => {
          applyTheme(newTheme);
        }, 50);
        
        // Backup application with longer delay
        setTimeout(() => {
          const root = document.documentElement;
          const expectedTheme = newTheme === 'system' ? 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
            newTheme;
          if (!root.classList.contains(expectedTheme)) {
            console.warn('[ThemeToggle] Backup iOS theme application triggered');
            applyTheme(newTheme);
          }
        }, 200);
      } else {
        // For non-iOS devices, apply immediately
        setTimeout(() => {
          applyTheme(newTheme);
        }, 0);
      }
    } catch (error) {
      console.error('[ThemeToggle] Error applying theme:', error);
      // Fallback: try to apply theme again
      setTimeout(() => {
        try {
    applyTheme(newTheme);
        } catch (fallbackError) {
          console.error('[ThemeToggle] Fallback theme application also failed:', fallbackError);
        }
      }, 100);
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
        return <Moon className="w-5 h-5 text-primary" />;
      case 'system':
        return resolvedTheme === 'dark' ? (
          <div className="relative">
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <Moon className="w-2.5 h-2.5 text-primary absolute -top-0.5 -right-0.5" />
          </div>
        ) : (
          <div className="relative">
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <Sun className="w-2.5 h-2.5 text-amber-500 absolute -top-0.5 -right-0.5" />
          </div>
        );
      default:
        return <Monitor className="w-5 h-5 text-muted-foreground" />;
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
          try {
            e.currentTarget.style.transform = 'scale(0.95)';
          } catch (error) {
            console.warn('[ThemeToggle] Touch start error:', error);
          }
        }
      }}
      onTouchEnd={(e) => {
        // iOS-specific: Reset transform and trigger toggle
        if (isIOS()) {
          try {
            e.currentTarget.style.transform = 'scale(1)';
            // Prevent double-triggering on iOS
            e.preventDefault();
            toggleTheme(e);
          } catch (error) {
            console.warn('[ThemeToggle] Touch end error:', error);
          }
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