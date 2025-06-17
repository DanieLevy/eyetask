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
    <nav className={cn("flex items-center justify-center gap-1.5", className)} dir="rtl">
      {items.map((item) => {
        return (
          <Link key={item.id} href={item.href} target={item.isExternal ? "_blank" : undefined}>
            <Button
              variant={item.isActive ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-9 font-light transition-all",
                item.isActive ? "font-normal" : "font-light",
                hebrewFont.fontClass
              )}
            >
              {item.icon && <item.icon className="h-3.5 w-3.5 ml-1.5" />}
              <span className="text-sm">{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </nav>
  );
};

export default HeaderNavigation; 