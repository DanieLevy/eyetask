'use client';

import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Bell,
  Send,
  History,
  Users,
  UserX,
  BellRing,
  Smartphone,
  Monitor,
  Shield,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  Filter,
  User,
  Clock,
  TrendingUp,
  Wifi,
  WifiOff,
  ChevronDown,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface PushSubscription {
  _id: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  deviceType: 'ios' | 'android' | 'desktop';
  createdAt: string;
  lastActive: string;
  isActive: boolean;
}

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  sentBy: string;
  deliveryStats: {
    sent: number;
    delivered: number;
    failed: number;
    clicked: number;
  };
  status: 'pending' | 'sending' | 'sent' | 'failed';
  targetRoles?: string[];
  targetUsers?: string[];
}

export default function PushNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'authenticated' | 'anonymous' | 'specific' | 'byName'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  
  const router = useRouter();

  const loadSubscriptions = useCallback(async () => {
    try {
      const response = await fetch('/api/push/subscriptions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      logger.error('Error loading subscriptions', 'PUSH_ADMIN', undefined, error as Error);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/push/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      logger.error('Error loading history', 'PUSH_ADMIN', undefined, error as Error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSubscriptions(),
        loadHistory()
      ]);
    } catch (error) {
      logger.error('Error loading data', 'PUSH_ADMIN', undefined, error as Error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [loadSubscriptions, loadHistory]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }
    loadData();
  }, [router, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('הנתונים רועננו');
  };

  const handleSend = async () => {
    if (!title || !body) {
      toast.error('כותרת ותוכן הם שדות חובה');
      return;
    }

    setSending(true);
    try {
      interface NotificationPayload {
        title: string;
        body: string;
        icon: string;
        badge: string;
        url: string;
        targetUsers?: string[];
        targetUsernames?: string[];
      }
      
      const payload: NotificationPayload = {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/'
      };

      // Set target based on selection
      if (targetType === 'authenticated') {
        // Filter authenticated users (those with non-null user_id)
        const authenticatedUserIds = subscriptions
          .filter(sub => sub.userId && !sub.userId.startsWith('anon_'))
          .map(sub => sub.userId);
        
        if (authenticatedUserIds.length > 0) {
          payload.targetUsers = authenticatedUserIds;
        } else {
          toast.error('לא נמצאו משתמשים מאומתים');
          setSending(false);
          return;
        }
      } else if (targetType === 'anonymous') {
        // For anonymous users, we'll send to all users with null user_id
        // by not specifying targetUsers, but we need a special flag
        payload.targetUsers = ['anonymous'];
      } else if (targetType === 'specific' && selectedUsers.length > 0) {
        payload.targetUsers = selectedUsers;
      } else if (targetType === 'byName' && selectedUsers.length > 0) {
        // NEW: When sending by name, we need to extract unique usernames
        const targetUsernames = new Set<string>();
        selectedUsers.forEach(userId => {
          const user = subscriptions.find(s => s.userId === userId);
          if (user && user.username && user.username !== 'Anonymous User') {
            targetUsernames.add(user.username);
          }
        });
        
        if (targetUsernames.size === 0) {
          toast.error('לא נמצאו משתמשים עם שמות חוקיים');
          setSending(false);
          return;
        }
        
        payload.targetUsernames = Array.from(targetUsernames);
        logger.info('Sending to users by name', 'PUSH_ADMIN', {
          usernames: payload.targetUsernames
        });
      }

      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`התראה נשלחה בהצלחה ל-${result.sent} משתמשים`);
        // Reset form
        setTitle('');
        setBody('');
        setTargetType('all');
        setSelectedUsers([]);
        // Reload history
        await loadHistory();
      } else {
        toast.error(result.error || 'שגיאה בשליחת ההתראה');
      }
    } catch (error) {
      logger.error('Error sending notification', 'PUSH_ADMIN', undefined, error as Error);
      toast.error('שגיאה בשליחת ההתראה');
    } finally {
      setSending(false);
    }
  };

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      // Search filter
      if (searchQuery && !sub.username.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Role filter
      if (filterRole !== 'all' && sub.role !== filterRole) {
        return false;
      }
      
      // Device filter
      if (filterDevice !== 'all' && sub.deviceType !== filterDevice) {
        return false;
      }
      
      // Active filter
      if (filterActive === 'active' && !sub.isActive) {
        return false;
      } else if (filterActive === 'inactive' && sub.isActive) {
        return false;
      }
      
      return true;
    });
  }, [subscriptions, searchQuery, filterRole, filterDevice, filterActive]);

  // Stats calculations
  const stats = {
    total: subscriptions.length,
    authenticated: subscriptions.filter(s => !s.userId.startsWith('anon_')).length,
    anonymous: subscriptions.filter(s => s.userId.startsWith('anon_')).length,
    active: subscriptions.filter(s => s.isActive).length,
    byDevice: {
      ios: subscriptions.filter(s => s.deviceType === 'ios').length,
      android: subscriptions.filter(s => s.deviceType === 'android').length,
      desktop: subscriptions.filter(s => s.deviceType === 'desktop').length
    },
    recentlyActive: subscriptions.filter(s => {
      const lastActive = new Date(s.lastActive);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastActive > dayAgo;
    }).length
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'ios':
        return <Smartphone className="h-4 w-4 text-blue-500" />;
      case 'android':
        return <Smartphone className="h-4 w-4 text-green-500" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="text-xs bg-red-500">מנהל</Badge>;
      case 'guest':
        return <Badge variant="secondary" className="text-xs bg-gray-200">אורח</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{role}</Badge>;
    }
  };

  // Unique names for dropdown
  const uniqueNames = useMemo(() => {
    const names = new Set<string>();
    subscriptions.forEach(sub => {
      if (sub.username && sub.username !== 'Anonymous User') {
        names.add(sub.username);
      }
    });
    return Array.from(names).sort();
  }, [subscriptions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800" dir="rtl">
      <div className="container max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/admin/dashboard')}
              className="shrink-0"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bell className="h-6 w-6 text-purple-600" />
                ניהול התראות
              </h1>
              <p className="text-muted-foreground mt-1">
                שלח התראות Push למשתמשי האפליקציה
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            רענן נתונים
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">סהכ מנויים</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">פעילים</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <Wifi className="h-8 w-8 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">רשומים</p>
                  <p className="text-2xl font-bold">{stats.authenticated}</p>
                </div>
                <Shield className="h-8 w-8 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">אורחים</p>
                  <p className="text-2xl font-bold">{stats.anonymous}</p>
                </div>
                <UserX className="h-8 w-8 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">פעילים ב-24h</p>
                  <p className="text-2xl font-bold">{stats.recentlyActive}</p>
                </div>
                <Clock className="h-8 w-8 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">התראות נשלחו</p>
                  <p className="text-2xl font-bold">{history.length}</p>
                </div>
                <BellRing className="h-8 w-8 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Stats */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">התפלגות מכשירים</h3>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span>iOS ({stats.byDevice.ios})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span>Android ({stats.byDevice.android})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full" />
                  <span>Desktop ({stats.byDevice.desktop})</span>
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="flex h-full">
                <div 
                  className="bg-blue-500" 
                  style={{ width: `${(stats.byDevice.ios / stats.total) * 100}%` }}
                />
                <div 
                  className="bg-green-500" 
                  style={{ width: `${(stats.byDevice.android / stats.total) * 100}%` }}
                />
                <div 
                  className="bg-gray-500" 
                  style={{ width: `${(stats.byDevice.desktop / stats.total) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="send" className="space-y-4">
          <TabsList className="grid w-full max-w-[400px] grid-cols-3 bg-white dark:bg-gray-800">
            <TabsTrigger value="send" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              <Send className="h-4 w-4 ml-2" />
              שליחה
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              <Users className="h-4 w-4 ml-2" />
              מנויים
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              <History className="h-4 w-4 ml-2" />
              היסטוריה
            </TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle>שליחת התראה חדשה</CardTitle>
                <CardDescription>
                  מלא את הפרטים ובחר למי לשלוח את ההתראה
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Content */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">כותרת</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="כותרת ההתראה"
                      maxLength={50}
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground text-left">
                      {title.length}/50
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body">תוכן ההודעה</Label>
                    <Textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="תוכן ההודעה שתופיע למשתמשים..."
                      rows={4}
                      maxLength={200}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-left">
                      {body.length}/200
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Target Selection */}
                <div className="space-y-4">
                  <Label>קהל יעד</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={cn(
                      "relative flex cursor-pointer rounded-lg border-2 p-4 hover:bg-accent transition-colors",
                      targetType === 'all' && "border-purple-500 bg-purple-50"
                    )}>
                      <input
                        type="radio"
                        value="all"
                        checked={targetType === 'all'}
                        onChange={() => setTargetType('all')}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">כל המשתמשים</p>
                          <p className="text-sm text-muted-foreground">{stats.total} משתמשים</p>
                        </div>
                      </div>
                      {targetType === 'all' && (
                        <CheckCircle2 className="absolute top-2 left-2 h-5 w-5 text-purple-600" />
                      )}
                    </label>

                    <label className={cn(
                      "relative flex cursor-pointer rounded-lg border-2 p-4 hover:bg-accent transition-colors",
                      targetType === 'authenticated' && "border-green-500 bg-green-50"
                    )}>
                      <input
                        type="radio"
                        value="authenticated"
                        checked={targetType === 'authenticated'}
                        onChange={() => setTargetType('authenticated')}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">רשומים בלבד</p>
                          <p className="text-sm text-muted-foreground">{stats.authenticated} משתמשים</p>
                        </div>
                      </div>
                      {targetType === 'authenticated' && (
                        <CheckCircle2 className="absolute top-2 left-2 h-5 w-5 text-green-600" />
                      )}
                    </label>

                    <label className={cn(
                      "relative flex cursor-pointer rounded-lg border-2 p-4 hover:bg-accent transition-colors",
                      targetType === 'anonymous' && "border-orange-500 bg-orange-50"
                    )}>
                      <input
                        type="radio"
                        value="anonymous"
                        checked={targetType === 'anonymous'}
                        onChange={() => setTargetType('anonymous')}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3">
                        <UserX className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">אנונימיים בלבד</p>
                          <p className="text-sm text-muted-foreground">{stats.anonymous} משתמשים</p>
                        </div>
                      </div>
                      {targetType === 'anonymous' && (
                        <CheckCircle2 className="absolute top-2 left-2 h-5 w-5 text-orange-600" />
                      )}
                    </label>

                    <label className={cn(
                      "relative flex cursor-pointer rounded-lg border-2 p-4 hover:bg-accent transition-colors",
                      targetType === 'byName' && "border-blue-500 bg-blue-50"
                    )}>
                      <input
                        type="radio"
                        value="byName"
                        checked={targetType === 'byName'}
                        onChange={() => {
                          setTargetType('byName');
                          setSelectedUsers([]);
                        }}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">לפי שם</p>
                          <p className="text-sm text-muted-foreground">בחר משתמשים</p>
                        </div>
                      </div>
                      {targetType === 'byName' && (
                        <CheckCircle2 className="absolute top-2 left-2 h-5 w-5 text-blue-600" />
                      )}
                    </label>
                  </div>

                  {/* Name Selection Dropdown */}
                  {targetType === 'byName' && (
                    <div className="space-y-2">
                      <Label>בחר משתמשים לפי שם</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map(userId => {
                          const user = subscriptions.find(s => s.userId === userId);
                          return (
                            <Badge key={userId} variant="secondary" className="gap-1">
                              {user?.username}
                              <X 
                                className="h-3 w-3 cursor-pointer" 
                                onClick={() => setSelectedUsers(prev => prev.filter(id => id !== userId))}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                      <Select 
                        value=""
                        onValueChange={(value) => {
                          const userIds = subscriptions
                            .filter(s => s.username === value)
                            .map(s => s.userId);
                          setSelectedUsers(prev => [...new Set([...prev, ...userIds])]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר משתמש..." />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueNames.map(name => (
                            <SelectItem key={name} value={name}>
                              {name} ({subscriptions.filter(s => s.username === name).length} מכשירים)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={sending || !title || !body || (targetType === 'byName' && selectedUsers.length === 0)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  size="lg"
                >
                  {sending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="ml-2 h-4 w-4" />
                      שלח התראה
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle>רשימת מנויים</CardTitle>
                <CardDescription>
                  כל המשתמשים שנרשמו לקבלת התראות
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="חיפוש לפי שם..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        סינון
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>סנן לפי</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground">תפקיד</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={filterRole === 'all'}
                        onCheckedChange={() => setFilterRole('all')}
                      >
                        הכל
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterRole === 'admin'}
                        onCheckedChange={() => setFilterRole('admin')}
                      >
                        מנהלים
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterRole === 'guest'}
                        onCheckedChange={() => setFilterRole('guest')}
                      >
                        אורחים
                      </DropdownMenuCheckboxItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground">מכשיר</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={filterDevice === 'all'}
                        onCheckedChange={() => setFilterDevice('all')}
                      >
                        הכל
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterDevice === 'ios'}
                        onCheckedChange={() => setFilterDevice('ios')}
                      >
                        iOS
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterDevice === 'android'}
                        onCheckedChange={() => setFilterDevice('android')}
                      >
                        Android
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterDevice === 'desktop'}
                        onCheckedChange={() => setFilterDevice('desktop')}
                      >
                        Desktop
                      </DropdownMenuCheckboxItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground">סטטוס</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={filterActive === 'all'}
                        onCheckedChange={() => setFilterActive('all')}
                      >
                        הכל
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterActive === 'active'}
                        onCheckedChange={() => setFilterActive('active')}
                      >
                        פעילים
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filterActive === 'inactive'}
                        onCheckedChange={() => setFilterActive('inactive')}
                      >
                        לא פעילים
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="text-sm text-muted-foreground">
                  מציג {filteredSubscriptions.length} מתוך {subscriptions.length} משתמשים
                </div>

                <ScrollArea className="h-[500px] w-full rounded-md border">
                  <div className="p-4 space-y-3">
                    {filteredSubscriptions.map((sub) => (
                      <div
                        key={sub._id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-all",
                          !sub.isActive && "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {getDeviceIcon(sub.deviceType)}
                            {sub.isActive ? (
                              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                            ) : (
                              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gray-400 rounded-full" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {sub.username}
                              {sub.userId.startsWith('anon_') && (
                                <Badge variant="outline" className="text-xs">
                                  אנונימי
                                </Badge>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getRoleBadge(sub.role)}
                              <span className="text-xs text-muted-foreground">
                                נרשם {formatDistanceToNow(new Date(sub.createdAt), { 
                                  locale: he,
                                  addSuffix: true 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {sub.isActive ? (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                              <Wifi className="h-3 w-3 ml-1" />
                              פעיל
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <WifiOff className="h-3 w-3 ml-1" />
                              לא פעיל
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle>היסטוריית שליחות</CardTitle>
                <CardDescription>
                  כל ההתראות שנשלחו למשתמשים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] w-full rounded-md border">
                  <div className="p-4 space-y-3">
                    {history.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 rounded-lg border bg-card space-y-3 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-lg">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {notification.body}
                            </p>
                          </div>
                          <Badge
                            variant={notification.status === 'sent' ? 'default' : 
                                    notification.status === 'failed' ? 'destructive' : 
                                    'secondary'}
                            className={cn(
                              notification.status === 'sent' && "bg-green-100 text-green-700",
                              notification.status === 'failed' && "bg-red-100 text-red-700"
                            )}
                          >
                            {notification.status === 'sent' ? 'נשלח' :
                             notification.status === 'failed' ? 'נכשל' :
                             notification.status === 'sending' ? 'בשליחה' : 'ממתין'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            נשלח {formatDistanceToNow(new Date(notification.sentAt), { 
                              locale: he,
                              addSuffix: true 
                            })}
                          </span>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            עי {notification.sentBy}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Send className="h-3 w-3 text-blue-500" />
                            <span>{notification.deliveryStats.sent} נשלחו</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span>{notification.deliveryStats.delivered} התקבלו</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" />
                            <span>{notification.deliveryStats.failed} נכשלו</span>
                          </div>
                          {notification.deliveryStats.clicked > 0 && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-purple-500" />
                              <span>{notification.deliveryStats.clicked} נלחצו</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
