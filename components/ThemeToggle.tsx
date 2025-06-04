'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    console.log('[ThemeToggle] Component mounted.');
    
    // Get stored theme or default to system
    const storedTheme = (localStorage.getItem('theme') as Theme) || 'system';
    console.log('[ThemeToggle] Stored theme from localStorage:', storedTheme);
    setTheme(storedTheme);
    
    // Apply theme immediately
    console.log('[ThemeToggle] Applying initial theme:', storedTheme);
    applyTheme(storedTheme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    console.log('[ThemeToggle] applyTheme called with:', newTheme);
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    console.log('[ThemeToggle] Removed light/dark classes from root:', root.className);
    
    // Determine the actual theme to apply
    let resolvedTheme: 'light' | 'dark';
    if (newTheme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      console.log('[ThemeToggle] System theme detected as:', resolvedTheme);
    } else {
      resolvedTheme = newTheme;
      console.log('[ThemeToggle] Resolved theme set to:', resolvedTheme);
    }
    
    // Apply theme class and color-scheme
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    console.log('[ThemeToggle] Applied theme class:', resolvedTheme, 'New root classList:', root.classList.toString());
    console.log('[ThemeToggle] Set colorScheme style to:', resolvedTheme);
    
    // Force a repaint to ensure changes take effect
    root.offsetHeight;
  };

  // Toggle through theme options: system → light → dark → system
  const toggleTheme = () => {
    console.log('[ThemeToggle] toggleTheme called. Current theme:', theme);
    const themeOrder: Theme[] = ['system', 'light', 'dark'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    console.log('[ThemeToggle] New theme will be:', newTheme);
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('[ThemeToggle] Stored new theme in localStorage:', newTheme);
    applyTheme(newTheme);
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
      case 'light':
        return 'מעבר למצב כהה';
      case 'dark':
        return 'מעבר למצב אוטומטי';
      case 'system':
        return `מעבר למצב בהיר (כרגע: ${resolvedTheme === 'dark' ? 'כהה' : 'בהיר'})`;
      default:
        return 'החלף ערכת נושא';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg hover:bg-accent/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      <div className="flex items-center justify-center transform transition-transform duration-200 hover:scale-110">
        {getIcon()}
      </div>
    </button>
  );
} 