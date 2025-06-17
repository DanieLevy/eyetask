'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MobileMenuProps, HeaderAction, NavigationItem } from './types';
import { useHebrewFont } from '@/hooks/useFont';
import HeaderSearch from './HeaderSearch';
import { renderIcon, getIconForItem } from './utils';
import { useAuth } from './AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Type to support more flexible action variants for the mobile menu
type FlexibleHeaderAction = HeaderAction | Omit<HeaderAction, 'variant'> & { variant: string };

// Safe icon component to handle different icon types
const SafeIcon = ({ action }: { action: FlexibleHeaderAction }) => {
  if (action.icon) {
    return <span className="ml-auto rtl:ml-0 rtl:mr-auto">{renderIcon(action.icon)}</span>;
  } 
  
  const iconElement = getIconForItem(action.id);
  if (iconElement) {
    return <span className="ml-auto rtl:ml-0 rtl:mr-auto">{iconElement}</span>;
  }
  
  return null;
};

// Update interface to use FlexibleHeaderAction
interface MobileMenuPropsInternal {
  items: NavigationItem[];
  actions?: FlexibleHeaderAction[];
  showSearch?: boolean;
}

export const MobileMenu = ({ items, actions = [], showSearch = false }: MobileMenuPropsInternal) => {
  const [open, setOpen] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const hebrewFont = useHebrewFont('body');
  const { isAdmin } = useAuth();
  
  // Detect if running as PWA
  useEffect(() => {
    // Check if running in standalone mode (PWA)
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
    // Set iOS PWA class if needed
    if (window.navigator.userAgent.match(/iPhone|iPad|iPod/)) {
      document.documentElement.classList.add('ios-pwa');
    }
  }, []);
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 w-9 p-0 relative rounded-full",
            isAdmin && "bg-primary/10 hover:bg-primary/15"
          )}
          aria-label="תפריט"
        >
          {isAdmin && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
          <Menu className={cn(
            "h-5 w-5",
            isAdmin && "text-primary"
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-64 dropdown-menu-content rounded-xl shadow-lg border-border/50",
          "max-h-[calc(100vh-6rem)] overflow-y-auto",
          isPWA && "notch-aware-dropdown"
        )}
        sideOffset={8}
        avoidCollisions={true}
      >
        {/* Header section with close button */}
        <div className="flex items-center justify-between py-3 px-4 border-b border-border/50">
          {isAdmin && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Shield className="h-3.5 w-3.5" />
              <span className={cn(hebrewFont.fontClass)}>מצב ניהול</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-auto rtl:ml-0 rtl:mr-auto rounded-full hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {showSearch && (
          <div className="px-3 py-3 border-b border-border/50">
            <HeaderSearch className="w-full" variant="mobile-full-width" />
          </div>
        )}
        
        {items?.length > 0 && (
          <div className="py-2">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className={cn(
                  "cursor-pointer flex justify-between items-center py-2.5 px-4",
                  item.isActive && "bg-accent/50 text-accent-foreground font-medium",
                  hebrewFont.fontClass
                )}
                asChild
              >
                <Link href={item.href} onClick={() => setOpen(false)}>
                  <span>{item.label}</span>
                  {/* Use SafeIcon component for navigation items */}
                  <SafeIcon action={item} />
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        {actions && actions.length > 0 && items?.length > 0 && (
          <DropdownMenuSeparator className="my-1 opacity-50" />
        )}
        
        {actions && actions.length > 0 && (
          <div className="py-2">
            {actions.map((action) => {
              // If it has an href, wrap it in a Link
              if (action.href) {
                return (
                  <DropdownMenuItem
                    key={action.id}
                    className={cn(
                      "cursor-pointer flex justify-between items-center py-2.5 px-4",
                      action.variant === "destructive" && "text-destructive hover:text-destructive",
                      hebrewFont.fontClass
                    )}
                    disabled={action.disabled}
                    asChild
                  >
                    <Link href={action.href} onClick={() => setOpen(false)}>
                      <span>{action.label}</span>
                      {/* Use SafeIcon component */}
                      <SafeIcon action={action} />
                    </Link>
                  </DropdownMenuItem>
                );
              }
              
              // Otherwise, render a regular menu item with click handler
              return (
                <DropdownMenuItem
                  key={action.id}
                  className={cn(
                    "cursor-pointer flex justify-between items-center py-2.5 px-4",
                    action.variant === "destructive" && "text-destructive hover:text-destructive",
                    hebrewFont.fontClass
                  )}
                  disabled={action.disabled}
                  onClick={() => {
                    if (action.onClick) {
                      action.onClick();
                      setOpen(false);
                    }
                  }}
                >
                  <span>{action.label}</span>
                  {/* Use SafeIcon component */}
                  <SafeIcon action={action} />
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MobileMenu; 