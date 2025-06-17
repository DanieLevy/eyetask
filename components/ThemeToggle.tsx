'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Initialize component on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("w-8 h-8 p-0", className)}
        disabled
      >
        <div className="w-5 h-5 animate-pulse bg-muted rounded"></div>
      </Button>
    );
  }

  // Get icon based on current theme state
  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5 text-amber-500" />;
      case 'dark':
        return <Moon className="h-5 w-5 text-sky-400" />;
      case 'system':
        return resolvedTheme === 'dark' ? (
          <Moon className="h-5 w-5 text-sky-400" />
        ) : (
          <Sun className="h-5 w-5 text-amber-500" />
        );
      default:
        return resolvedTheme === 'dark' ? (
          <Moon className="h-5 w-5 text-sky-400" />
        ) : (
          <Sun className="h-5 w-5 text-amber-500" />
        );
    }
  };

  // Get tooltip text
  const getTooltip = () => {
    switch (theme) {
      case 'system':
        return `מעבר למצב ${resolvedTheme === 'dark' ? 'בהיר' : 'כהה'}`;
      case 'light':
        return 'מעבר למצב כהה';
      case 'dark':
        return 'מעבר למצב בהיר';
      default:
        return 'החלף ערכת נושא';
    }
  };

  // Toggle through theme options: light -> dark -> light
  const toggleTheme = () => {
    if (theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark')) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn("w-8 h-8 p-0 hover:bg-transparent", className)}
          aria-label={getTooltip()}
        >
          {getIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {getTooltip()}
      </TooltipContent>
    </Tooltip>
  );
} 