'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HeaderNavigationProps } from './types';
import { useHebrewFont } from '@/hooks/useFont';

export const HeaderNavigation = ({ items, className }: HeaderNavigationProps) => {
  const hebrewFont = useHebrewFont('body');
  
  if (!items || items.length === 0) {
    return null;
  }
  
  return (
    <nav className={cn("flex items-center gap-1", className)} dir="rtl">
      {items.map((item) => {
        return (
          <Link key={item.id} href={item.href} target={item.isExternal ? "_blank" : undefined}>
            <Button
              variant={item.isActive ? "default" : "ghost"}
              size="sm"
              className={cn("h-8", hebrewFont.fontClass)}
            >
              {item.icon && <item.icon className="h-4 w-4 ml-1.5" />}
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
};

export default HeaderNavigation; 