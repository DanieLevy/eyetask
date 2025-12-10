'use client';

import { 
  User, 
  LogOut, 
  Settings,
  ChevronDown,
  UserCircle,
  UserCog
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHebrewFont } from '@/hooks/useFont';
import { cn } from '@/lib/utils';
import { HeaderUserMenuProps } from './types';

export const HeaderUserMenu = ({ user, className, onLogout }: HeaderUserMenuProps) => {
  const [mounted, setMounted] = useState(false);
  const hebrewFont = useHebrewFont('body');
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    logger.info('Component mounted', 'HEADER_USER_MENU', { username: user?.username, hasRouter: !!router });
  }, [user, router]);

  // Prevent hydration mismatch by only showing after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // If not mounted yet, don't render
  if (!mounted) {
    return null;
  }

  // If no user, don't render anything (login is handled by MobileMenu on mobile)
  // Note: This component only appears in the desktop view now
  if (!user) {
    const handleLoginClick = (e: React.MouseEvent) => {
      e.preventDefault();
      logger.info('התחבר (Login) button clicked', 'HEADER_USER_MENU', { hasRouter: !!router });
      logger.info('Navigating to /admin', 'HEADER_USER_MENU');
      router.push('/admin');
      logger.info('router.push called', 'HEADER_USER_MENU');
    };

    return (
      <Button 
        variant="default" 
        size="sm" 
        className={cn("h-8", className)}
        onClick={handleLoginClick}
      >
        <UserCircle className="h-4 w-4 ml-1" />
        <span className={cn("text-sm", hebrewFont.fontClass)}>התחבר</span>
      </Button>
    );
  }

  // Otherwise show user menu
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <User className="h-4 w-4 ml-1" />
            <span className={cn("text-sm max-w-28 truncate", hebrewFont.fontClass)}>
              {user.username}
            </span>
            <ChevronDown className="h-3 w-3 mr-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-y-1">
              <p className="text-sm font-medium">
                {user.username}
              </p>
              <p className="text-xs font-normal text-muted-foreground">
                {user.role === 'admin' ? 'מנהל מערכת' : 
                 user.role === 'data_manager' ? 'מנהל נתונים' :
                 user.role === 'driver_manager' ? 'מנהל נהגים' : 
                 'משתמש רגיל'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              logger.info('הפרופיל שלי (Profile) clicked', 'HEADER_USER_MENU');
              logger.info('Navigating to /admin/profile', 'HEADER_USER_MENU');
              router.push('/admin/profile');
              logger.info('router.push called', 'HEADER_USER_MENU');
            }}
            className="cursor-pointer"
          >
            <UserCog className="w-4 h-4 mr-2" />
            <span>הפרופיל שלי</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              logger.info('פאנל ניהול (Dashboard) clicked', 'HEADER_USER_MENU');
              logger.info('Navigating to /admin/dashboard', 'HEADER_USER_MENU');
              router.push('/admin/dashboard');
              logger.info('router.push called', 'HEADER_USER_MENU');
            }}
            className="cursor-pointer"
          >
            <Settings className="w-4 h-4 mr-2" />
            <span>פאנל ניהול</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onSelect={() => {
              logger.info('התנתק (Logout) clicked', 'HEADER_USER_MENU', { hasOnLogout: !!onLogout });
              if (onLogout) {
                logger.info('Calling onLogout', 'HEADER_USER_MENU');
                onLogout();
              } else {
                logger.error('onLogout is not defined', 'HEADER_USER_MENU');
              }
            }} 
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>התנתק</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HeaderUserMenu; 