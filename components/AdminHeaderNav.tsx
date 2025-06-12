'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CheckSquare, FolderOpen, MessageCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHebrewFont } from '@/hooks/useFont';

interface AdminHeaderNavProps {
  className?: string;
}

export default function AdminHeaderNav({ className }: AdminHeaderNavProps) {
  const pathname = usePathname();
  const hebrewFont = useHebrewFont('body');
  
  return (
    <div className={cn("flex items-center gap-1", className)} dir="rtl">
      <Link href="/admin/dashboard">
        <Button 
          variant={pathname?.includes('/admin/dashboard') ? 'default' : 'ghost'} 
          size="sm"
          className={cn("h-8", hebrewFont.fontClass)}
        >
          <BarChart3 className="h-4 w-4 ml-1.5" />
          לוח בקרה
        </Button>
      </Link>
      
      <Link href="/admin/tasks">
        <Button 
          variant={pathname?.includes('/admin/tasks') ? 'default' : 'ghost'} 
          size="sm"
          className={cn("h-8", hebrewFont.fontClass)}
        >
          <CheckSquare className="h-4 w-4 ml-1.5" />
          משימות
        </Button>
      </Link>
      
      <Link href="/admin/projects">
        <Button 
          variant={pathname?.includes('/admin/projects') ? 'default' : 'ghost'} 
          size="sm"
          className={cn("h-8", hebrewFont.fontClass)}
        >
          <FolderOpen className="h-4 w-4 ml-1.5" />
          פרויקטים
        </Button>
      </Link>
      
      <Link href="/admin/feedback">
        <Button 
          variant={pathname?.includes('/admin/feedback') ? 'default' : 'ghost'} 
          size="sm"
          className={cn("h-8", hebrewFont.fontClass)}
        >
          <MessageCircle className="h-4 w-4 ml-1.5" />
          פניות
        </Button>
      </Link>
      
      <Link href="/">
        <Button 
          variant="outline" 
          size="sm"
          className={cn("h-8", hebrewFont.fontClass)}
        >
          <Home className="h-4 w-4 ml-1.5" />
          ראשי
        </Button>
      </Link>
    </div>
  );
} 