'use client';

import { 
  LogOut,
  ChevronRight,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { cn } from '@/lib/utils';

interface AdminClientLayoutProps {
  children: React.ReactNode;
}

type AdminUser = {
  username: string;
  role: string;
};

function AdminLayoutContent({ children }: AdminClientLayoutProps) {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { navigationItems, isLoading: navLoading } = useAdminNavigation();

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    if (!token || !userData) {
      router.push('/admin');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as AdminUser;
      setCurrentUser(parsedUser);
    } catch {
      router.push('/admin');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('userPermissions');
    router.push('/admin');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'מנהל ראשי';
      case 'data_manager':
        return 'מנהל נתונים';
      case 'driver_manager':
        return 'מנהל נהגים';
      default:
        return role;
    }
  };

  if (!currentUser || navLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-card lg:border-r">
        <div className="p-6 border-b">
          <h1 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
            פאנל ניהול
          </h1>
          <p className={`text-sm text-muted-foreground mt-1 ${mixedBody.fontClass}`}>
            Driver Tasks Admin
          </p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.filter(item => item.id !== 'home').map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href && "bg-accent text-accent-foreground"
                  )}
                >
                  {<item.icon className="h-5 w-5" />}
                  <span className={mixedBody.fontClass}>{item.label}</span>
                  {pathname === item.href && (
                    <ChevronRight className="h-4 w-4 mr-auto" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <div className="px-3 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium">{currentUser?.username}</span>
            </div>
            <div className="text-xs">{getRoleLabel(currentUser?.role)}</div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start mt-2"
          >
            <LogOut className="h-4 w-4 ml-2" />
            התנתק
          </Button>
        </div>
      </aside>

      {/* Main Content - Now takes full width on mobile */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}

export default function AdminClientLayout({ children }: AdminClientLayoutProps) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
} 