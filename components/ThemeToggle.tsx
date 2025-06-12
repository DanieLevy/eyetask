'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function ThemeToggle() {
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
        variant="outline"
        size="icon"
        className="h-9 w-9 border-foreground/20"
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
        return <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500" />;
      case 'dark':
        return <Moon className="h-[1.2rem] w-[1.2rem] text-primary" />;
      case 'system':
        return resolvedTheme === 'dark' ? (
          <div className="relative">
            <Monitor className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
            <Moon className="h-[0.7rem] w-[0.7rem] text-primary absolute -top-0.5 -right-0.5" />
          </div>
        ) : (
          <div className="relative">
            <Monitor className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
            <Sun className="h-[0.7rem] w-[0.7rem] text-amber-500 absolute -top-0.5 -right-0.5" />
          </div>
        );
      default:
        return <Monitor className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />;
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

  // Toggle through theme options: system -> light -> dark -> system
  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 border-foreground/20"
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