'use client';

import { 
  User, 
  LogOut, 
  Settings,
  ChevronDown,
  UserCircle,
  UserCog
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
    console.log('[HeaderUserMenu] Component mounted', { user: user?.username, hasRouter: !!router });
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
      console.log('[HeaderUserMenu] התחבר (Login) button clicked');
      console.log('[HeaderUserMenu] router object:', router);
      console.log('[HeaderUserMenu] Navigating to /admin');
      router.push('/admin');
      console.log('[HeaderUserMenu] router.push called');
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
              console.log('[HeaderUserMenu] הפרופיל שלי (Profile) clicked');
              console.log('[HeaderUserMenu] router object:', router);
              console.log('[HeaderUserMenu] Navigating to /admin/profile');
              router.push('/admin/profile');
              console.log('[HeaderUserMenu] router.push called');
            }}
            className="cursor-pointer"
          >
            <UserCog className="w-4 h-4 mr-2" />
            <span>הפרופיל שלי</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              console.log('[HeaderUserMenu] פאנל ניהול (Dashboard) clicked');
              console.log('[HeaderUserMenu] router object:', router);
              console.log('[HeaderUserMenu] Navigating to /admin/dashboard');
              router.push('/admin/dashboard');
              console.log('[HeaderUserMenu] router.push called');
            }}
            className="cursor-pointer"
          >
            <Settings className="w-4 h-4 mr-2" />
            <span>פאנל ניהול</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onSelect={() => {
              console.log('[HeaderUserMenu] התנתק (Logout) clicked');
              console.log('[HeaderUserMenu] onLogout function:', onLogout);
              if (onLogout) {
                console.log('[HeaderUserMenu] Calling onLogout');
                onLogout();
              } else {
                console.error('[HeaderUserMenu] onLogout is not defined!');
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