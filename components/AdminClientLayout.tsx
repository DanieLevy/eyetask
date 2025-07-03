'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen,
  ListTodo,
  MessageSquare,
  BarChart3,
  Bell,
  Menu,
  X,
  LogOut,
  Calendar,
  ChevronRight,
  HardDrive,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { PermissionProvider, usePermissions } from '@/contexts/PermissionContext';
import { PERMISSIONS } from '@/lib/permissions';

interface AdminClientLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  permission?: string;
}

function AdminLayoutContent({ children }: AdminClientLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  const menuItems: MenuItem[] = [
    { 
      title: 'לוח בקרה', 
      icon: <LayoutDashboard className="h-5 w-5" />, 
      href: '/admin/dashboard',
      permission: PERMISSIONS.ACCESS_ADMIN_DASHBOARD
    },
    { 
      title: 'משתמשים', 
      icon: <Users className="h-5 w-5" />, 
      href: '/admin/users',
      permission: PERMISSIONS.ACCESS_USERS_MANAGEMENT
    },
    { 
      title: 'פרויקטים', 
      icon: <FolderOpen className="h-5 w-5" />, 
      href: '/admin/projects',
      permission: PERMISSIONS.ACCESS_PROJECTS_MANAGEMENT
    },
    { 
      title: 'משימות', 
      icon: <ListTodo className="h-5 w-5" />, 
      href: '/admin/tasks',
      permission: PERMISSIONS.ACCESS_TASKS_MANAGEMENT
    },
    { 
      title: 'עדכונים יומיים', 
      icon: <Calendar className="h-5 w-5" />, 
      href: '/admin/daily-updates',
      permission: PERMISSIONS.ACCESS_DAILY_UPDATES
    },
    { 
      title: 'משוב', 
      icon: <MessageSquare className="h-5 w-5" />, 
      href: '/admin/feedback',
      permission: PERMISSIONS.ACCESS_FEEDBACK
    },
    { 
      title: 'אנליטיקה', 
      icon: <BarChart3 className="h-5 w-5" />, 
      href: '/admin/analytics',
      permission: PERMISSIONS.ACCESS_ANALYTICS
    },
    { 
      title: 'התראות Push', 
      icon: <Bell className="h-5 w-5" />, 
      href: '/admin/push-notifications',
      permission: PERMISSIONS.ACCESS_PUSH_NOTIFICATIONS
    },
    { 
      title: 'ניהול מטמון', 
      icon: <HardDrive className="h-5 w-5" />, 
      href: '/admin/cache',
      permission: PERMISSIONS.ACCESS_CACHE_MANAGEMENT
    },
  ];

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    if (!token || !userData) {
      router.push('/admin');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setCurrentUser(parsedUser);
    } catch (error) {
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

  if (!currentUser || permissionsLoading) {
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
            {visibleMenuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.icon}
                  <span className={mixedBody.fontClass}>{item.title}</span>
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

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className={`text-lg font-semibold ${hebrewHeading.fontClass}`}>
            פאנל ניהול
          </h1>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Mobile Sidebar */}
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <aside className="fixed inset-y-0 right-0 w-64 bg-card border-l shadow-lg">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-bold ${hebrewHeading.fontClass}`}>
                    תפריט ניהול
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              <nav className="p-4">
                <ul className="space-y-2">
                  {visibleMenuItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          pathname === item.href && "bg-accent text-accent-foreground"
                        )}
                      >
                        {item.icon}
                        <span className={mixedBody.fontClass}>{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                <div className="px-3 py-2 text-sm text-muted-foreground mb-2">
                  <div className="font-medium">{currentUser?.username}</div>
                  <div className="text-xs">{getRoleLabel(currentUser?.role)}</div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminClientLayout({ children }: AdminClientLayoutProps) {
  return (
    <PermissionProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </PermissionProvider>
  );
} 