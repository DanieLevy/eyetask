'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  Settings,
  ChevronDown,
  UserCircle,
  UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { HeaderUserMenuProps } from './types';
import { useHebrewFont } from '@/hooks/useFont';
import Link from 'next/link';

export const HeaderUserMenu = ({ user, className, onLogout }: HeaderUserMenuProps) => {
  const [mounted, setMounted] = useState(false);
  const hebrewFont = useHebrewFont('body');

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
    return (
      <Link href="/admin">
        <Button variant="default" size="sm" className={cn("h-8", className)}>
          <UserCircle className="h-4 w-4 ml-1" />
          <span className={cn("text-sm", hebrewFont.fontClass)}>התחבר</span>
        </Button>
      </Link>
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
          <DropdownMenuItem asChild>
            <Link href="/admin/profile" className="cursor-pointer flex">
              <UserCog className="w-4 h-4 mr-2" />
              <span>הפרופיל שלי</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/admin/dashboard" className="cursor-pointer flex">
              <Settings className="w-4 h-4 mr-2" />
              <span>פאנל ניהול</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              if (onLogout) {
                onLogout();
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