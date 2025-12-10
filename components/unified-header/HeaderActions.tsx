'use client';

import { MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useHebrewFont } from '@/hooks/useFont';
import { cn } from '@/lib/utils';
import { HeaderActionsProps } from './types';

export const HeaderActions = ({ actions, className }: HeaderActionsProps) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const hebrewFont = useHebrewFont('body');
  const router = useRouter();
  
  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };
    
    // Check on mount
    checkScreenSize();
    
    // Add listener for resize events
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  // Show dropdown on mobile if more than 1 action
  const shouldUseDropdown = isSmallScreen && actions.length > 1;
  
  if (shouldUseDropdown) {
    return (
      <div className={cn("relative", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="פעולות"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuLabel className={cn("font-light", hebrewFont.fontClass)}>פעולות</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                disabled={action.disabled}
                onSelect={() => {
                  if (action.href) {
                    router.push(action.href);
                  } else if (action.onClick) {
                    action.onClick();
                  }
                }}
                className={cn("cursor-pointer font-light py-2.5", hebrewFont.fontClass)}
              >
                {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {actions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || "default"}
          size="sm"
          onClick={() => {
            if (action.href) {
              router.push(action.href);
            } else if (action.onClick) {
              action.onClick();
            }
          }}
          disabled={action.disabled}
          className={cn(
            "h-9 flex items-center justify-center gap-1.5 font-light transition-all", 
            hebrewFont.fontClass
          )}
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          <span className="text-sm">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default HeaderActions; 