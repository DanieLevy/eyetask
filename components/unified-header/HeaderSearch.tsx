'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Command
} from '@/components/ui/command';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { HeaderSearchProps } from './types';

export const HeaderSearch = ({ className, variant = "default" }: HeaderSearchProps) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isMobileFullWidth = variant === "mobile-full-width";
  
  // Initialize keyboard shortcut for the command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };
  
  return (
    <div className={cn(
      isMobileFullWidth ? "w-full" : "",
      className
    )}>
      <Button 
        variant="outline" 
        size="sm" 
        className={cn(
          "gap-2 h-8 text-xs text-muted-foreground",
          isMobileFullWidth && "w-full justify-start"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        <span className={isMobileFullWidth ? "inline-block" : "hidden md:inline-block"}>
          חיפוש מהיר
        </span>
        {!isMobileFullWidth && (
          <kbd className="hidden md:inline-flex pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </Button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="חפש משימות, פרויקטים ועוד..." />
        <CommandList>
          <CommandEmpty>לא נמצאו תוצאות.</CommandEmpty>
          <CommandGroup heading="דפים נפוצים">
            <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
              <Search className="mr-2 h-4 w-4" />
              <span>עמוד הבית</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/dashboard'))}>
              <Search className="mr-2 h-4 w-4" />
              <span>לוח בקרה</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="פרויקטים">
            {/* Project items would be dynamically generated here */}
            <CommandItem onSelect={() => runCommand(() => router.push('/project/sample-project'))}>
              <Search className="mr-2 h-4 w-4" />
              <span>פרויקט לדוגמה</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="משימות אחרונות">
            {/* Recent task items would be dynamically generated here */}
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/tasks/sample-task'))}>
              <Search className="mr-2 h-4 w-4" />
              <span>משימה לדוגמה</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
};

export default HeaderSearch; 