'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if user has a manually set theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    const initialTheme = savedTheme || 'system';
    setTheme(initialTheme);
    
    // Function to get system theme
    const getSystemTheme = (): 'light' | 'dark' => {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    };
    
    // Function to apply theme to document
    const applyTheme = (themeToApply: 'light' | 'dark' | 'system') => {
      let actualTheme: 'light' | 'dark';
      
      if (themeToApply === 'system') {
        actualTheme = getSystemTheme();
      } else {
        actualTheme = themeToApply;
      }
      
      setResolvedTheme(actualTheme);
      
      // Apply theme classes with higher specificity to override system preferences
      const htmlElement = document.documentElement;
      
      if (actualTheme === 'dark') {
        htmlElement.classList.add('dark');
        htmlElement.classList.remove('light');
        // Force dark mode with inline style to override system preferences
        htmlElement.style.colorScheme = 'dark';
      } else {
        htmlElement.classList.remove('dark');
        htmlElement.classList.add('light');
        // Force light mode with inline style to override system preferences
        htmlElement.style.colorScheme = 'light';
      }
    };
    
    // Apply initial theme
    applyTheme(initialTheme);
    
    // Listen for system theme changes only if theme is set to 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const currentTheme = localStorage.getItem('theme') || 'system';
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };
    
    // Add listener for system theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  const toggleTheme = () => {
    let newTheme: 'light' | 'dark' | 'system';
    
    // Cycle through: system -> light -> dark -> system
    if (theme === 'system') {
      newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    } else if (theme === 'light') {
      newTheme = 'dark';
    } else {
      newTheme = 'system';
    }
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme immediately
    let actualTheme: 'light' | 'dark';
    
    if (newTheme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = newTheme;
    }
    
    setResolvedTheme(actualTheme);
    
    // Apply theme with forced styling to override system preferences
    const htmlElement = document.documentElement;
    
    if (actualTheme === 'dark') {
      htmlElement.classList.add('dark');
      htmlElement.classList.remove('light');
      htmlElement.style.colorScheme = 'dark';
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.classList.add('light');
      htmlElement.style.colorScheme = 'light';
    }
  };

  if (!mounted) return null;

  const getThemeIcon = () => {
    if (theme === 'system') {
      // Show system preference icon with a small indicator
      return resolvedTheme === 'dark' ? (
        <div className="relative">
          <Moon className="w-5 h-5 text-blue-400" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-400 rounded-full border border-background"></div>
        </div>
      ) : (
        <div className="relative">
          <Sun className="w-5 h-5 text-yellow-500" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-400 rounded-full border border-background"></div>
        </div>
      );
    }
    
    return resolvedTheme === 'dark' ? (
      <Moon className="w-5 h-5 text-blue-400" />
    ) : (
      <Sun className="w-5 h-5 text-yellow-500" />
    );
  };

  const getThemeLabel = () => {
    if (theme === 'system') {
      return `אוטומטי (${resolvedTheme === 'dark' ? 'כהה' : 'בהיר'})`;
    }
    return theme === 'light' ? 'עבור למצב כהה' : 'עבור למצב בהיר';
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 overflow-hidden"
      title={getThemeLabel()}
      aria-label={getThemeLabel()}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {getThemeIcon()}
      </div>
    </button>
  );
} 