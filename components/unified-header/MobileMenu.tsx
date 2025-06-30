'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  LogOut,
  Sun,
  Moon,
  Bug,
  Info,
  User as UserIcon,
  Share,
  User,
  Settings,
  Home,
  CheckSquare,
  Users,
  Bell,
  BellOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MobileMenuProps, HeaderAction, NavigationItem } from './types';
import { useHebrewFont } from '@/hooks/useFont';
import HeaderSearch from './HeaderSearch';
import { renderIcon, getIconForItem } from './utils';
import { useAuth } from './AuthContext';
import { useTheme } from 'next-themes';
import BugReportModal from '../BugReportModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

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
  showThemeToggle?: boolean;
  showDebugIcon?: boolean;
}

export const MobileMenu = ({ 
  items, 
  actions = [], 
  showSearch = false,
  showThemeToggle = true,
  showDebugIcon = true
}: MobileMenuPropsInternal) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [showPushTooltip, setShowPushTooltip] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const hebrewFont = useHebrewFont('heading');
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  // Push notifications
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    showIOSInstallPrompt
  } = usePushNotifications();
  
  // Check if push notifications need attention
  const hasToken = typeof window !== 'undefined' && !!(localStorage.getItem('adminToken') || localStorage.getItem('token'));
  const needsPushAttention = isSupported && !isSubscribed && permission !== 'denied';
  
  // Push state tracking effect removed - no longer needed
  
  // Show tooltip if user dismissed banner but hasn't subscribed
  useEffect(() => {
    if (needsPushAttention && typeof window !== 'undefined') {
      const bannerDismissed = sessionStorage.getItem('push-banner-dismissed') === 'true';
      if (bannerDismissed) {
        // Show tooltip after 3 seconds
        const timer = setTimeout(() => {
          setShowPushTooltip(true);
          // Auto hide after 10 seconds
          setTimeout(() => setShowPushTooltip(false), 10000);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [needsPushAttention]);
  
  // Detect if running as PWA
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    // Check if running in standalone mode (PWA)
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
    // Set iOS PWA class if needed
    if (window.navigator.userAgent.match(/iPhone|iPad|iPod/)) {
      document.documentElement.classList.add('ios-pwa');
    }
  }, []);

  // Capture page context for bug reporting
  const capturePageContext = () => {
    const url = window.location.href;
    const pathname = window.location.pathname;
    const title = document.title || 'ללא כותרת';
    
    // Detect page type and related content
    let pageType: 'task' | 'project' | 'admin' | 'feedback' | 'home' | 'other' = 'other';
    
    if (pathname === '/') {
      pageType = 'home';
    } else if (pathname.startsWith('/admin')) {
      pageType = 'admin';
    } else if (pathname === '/feedback') {
      pageType = 'feedback';
    } else if (pathname.includes('/task/')) {
      pageType = 'task';
    } else if (pathname.includes('/project/')) {
      pageType = 'project';
    }

    return {
      url,
      pathname,
      title,
      pageType,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  };
  
  // Toggle theme function
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    // Don't close the dropdown
  };
  
  // Filter actions to only include important functional ones
  const functionalActions = actions.filter(action => {
    // Keep only login, logout, back, refresh, and adminPanel actions
    return ['login', 'logout', 'back', 'refresh', 'adminPanel'].includes(action.id);
  });
  
  return (
    <>
      <div className="relative">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 relative rounded-full z-50 touch-manipulation outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [@media(hover:none)]:focus:outline-none"
              aria-label="תפריט"
            >
              {isAdmin && (
                <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background z-10" />
              )}
              {needsPushAttention && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 ring-2 ring-background flex items-center justify-center z-20">
                  <span className="text-white text-[10px] font-bold leading-none">!</span>
                </span>
              )}
                          <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        
        {/* Push notification tooltip */}
        {showPushTooltip && needsPushAttention && !open && (
          <div className="absolute top-full mt-2 right-0 z-40 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-3 py-2 rounded-lg shadow-lg max-w-[200px]">
              <div className="flex items-center gap-2">
                <Bell className="h-3 w-3 flex-shrink-0" />
                <span className="leading-tight">אפשר להפעיל התראות מהתפריט</span>
              </div>
              <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45" />
            </div>
          </div>
        )}
        
        <DropdownMenuContent 
          align="end" 
          className={cn(
            "w-56 dropdown-menu-content rounded-xl shadow-lg border-border/50",
            "max-h-[calc(100vh-6rem)] overflow-y-auto",
            isPWA && "notch-aware-dropdown pb-0"
          )}
          sideOffset={8}
          avoidCollisions={true}
          style={{paddingTop: 0, marginTop: 0}}
        >
          {showSearch && (
            <div className="px-3 py-3 border-b border-border/50">
              <HeaderSearch className="w-full" variant="mobile-full-width" />
            </div>
          )}
          
          {/* Only show navigation items that are significant */}
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
          
          {/* Theme toggle and bug report section with separator */}
          <DropdownMenuSeparator className="my-1 opacity-50" />
          
          {/* Special feature section for theme and bug report */}
          <div className="py-2">
            {/* Theme Toggle */}
            {showThemeToggle && (
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer flex justify-between items-center py-2.5 px-4",
                  hebrewFont.fontClass
                )}
                onClick={toggleTheme}
              >
                <div className="flex items-center gap-2">
                  {resolvedTheme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-blue-400" />
                  )}
                  <span>{resolvedTheme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</span>
                </div>
                <Info className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
              </DropdownMenuItem>
            )}
            
            {/* Bug Report Button */}
            {showDebugIcon && (
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer flex justify-between items-center py-2.5 px-4",
                  hebrewFont.fontClass
                )}
                onClick={() => {
                  setIsBugReportOpen(true);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-orange-500" />
                  <span>דיווח על בעיה</span>
                </div>
              </DropdownMenuItem>
            )}
            
            {/* Push Notifications Button */}
            <DropdownMenuItem
                className={cn(
                  "cursor-pointer flex justify-between items-center py-2.5 px-4",
                  hebrewFont.fontClass,
                  !isSupported && "opacity-50"
                )}
                onClick={async (e) => {
                  e.preventDefault();
                  
                  if (!isSupported) {
                    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                       (window.navigator as any).standalone === true;
                    
                    if (isIOS && !isStandalone) {
                      toast.info('התקן את האפליקציה כדי להפעיל התראות', {
                        description: 'לחץ על כפתור השיתוף ⬆️ ובחר "הוסף למסך הבית"',
                        duration: 8000
                      });
                    } else {
                      toast.error('הדפדפן שלך לא תומך בהתראות');
                    }
                    return;
                  }
                  
                  if (isSubscribed) {
                    await unsubscribe();
                  } else {
                    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                       (window.navigator as any).standalone === true;
                    
                    if (isIOS && !isStandalone) {
                      showIOSInstallPrompt();
                    } else {
                      // Show name dialog before subscribing
                      setShowNameDialog(true);
                    }
                  }
                }}
                disabled={pushLoading || !isSupported}
              >
                <div className="flex items-center gap-2">
                  {pushLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>מעבד...</span>
                    </>
                  ) : isSubscribed ? (
                    <>
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                      <span>בטל התראות</span>
                    </>
                  ) : !isSupported && /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches ? (
                    <>
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">התקן כאפליקציה להתראות</span>
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 text-primary" />
                      <span>הפעל התראות</span>
                    </>
                  )}
                </div>
                {!isSubscribed && needsPushAttention && (
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                )}
              </DropdownMenuItem>
          </div>
          
          {functionalActions.length > 0 && (
            <>
              <DropdownMenuSeparator className="my-1 opacity-50" />
              
              {/* Render only functional actions */}
              <div className="py-2">
                {functionalActions.map((action) => {
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
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
      
      {/* Bug Report Modal */}
      {isBugReportOpen && (
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={() => setIsBugReportOpen(false)}
          pageContext={capturePageContext()}
        />
      )}
      
      {/* Name Dialog for Push Notifications */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>הרשמה להתראות</DialogTitle>
            <DialogDescription>
              אנא הכנס את שמך כדי שנוכל לשלוח לך התראות מותאמות אישית
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                שם
              </Label>
              <Input
                id="name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="הכנס את שמך"
                className="col-span-3"
                disabled={isSubscribing}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNameDialog(false);
                setUserName('');
              }}
              disabled={isSubscribing}
            >
              ביטול
            </Button>
            <Button
              onClick={async () => {
                if (!userName.trim()) {
                  toast.error('אנא הכנס את שמך');
                  return;
                }
                
                setIsSubscribing(true);
                try {
                  // Store the name temporarily
                  sessionStorage.setItem('push-subscribe-name', userName.trim());
                  await subscribe();
                  setShowNameDialog(false);
                  setUserName('');
                } catch (error) {
                  console.error('Subscription error:', error);
                  toast.error('שגיאה בהרשמה להתראות');
                } finally {
                  setIsSubscribing(false);
                }
              }}
              disabled={!userName.trim() || isSubscribing}
            >
              {isSubscribing ? 'מתחבר...' : 'הרשמה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileMenu; 