'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Send,
  Users,
  User,
  History,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Smartphone,
  Monitor,
  Apple
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface NotificationHistory {
  _id: string;
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
  status: string;
  targetRoles?: string[];
  targetUsers?: string[];
}

interface Subscription {
  _id: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  deviceType: string;
  lastActive: string;
  createdAt: string;
}

export default function PushNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    ios: 0,
    android: 0,
    desktop: 0,
    byRole: {} as Record<string, number>
  });
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [requireInteraction, setRequireInteraction] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'roles' | 'users'>('all');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }

    try {
      const verifyResponse = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!verifyResponse.ok) {
        router.push('/admin');
        return;
      }

      await Promise.all([
        loadHistory(),
        loadSubscriptions()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/push/history', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/push/subscriptions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
        
        // Calculate stats
        const stats = {
          total: data.subscriptions.length,
          ios: 0,
          android: 0,
          desktop: 0,
          byRole: {} as Record<string, number>
        };
        
        data.subscriptions.forEach((sub: Subscription) => {
          // Device type stats
          if (sub.deviceType === 'ios') stats.ios++;
          else if (sub.deviceType === 'android') stats.android++;
          else stats.desktop++;
          
          // Role stats
          stats.byRole[sub.role] = (stats.byRole[sub.role] || 0) + 1;
        });
        
        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const handleSend = async () => {
    if (!title || !body) {
      toast.error('כותרת ותוכן הם שדות חובה');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('adminToken');
      const payload: any = {
        title,
        body,
        url: url || '/',
        requireInteraction
      };

      if (imageUrl) payload.image = imageUrl;

      // Set target
      if (targetType === 'roles' && selectedRoles.length > 0) {
        payload.targetRoles = selectedRoles;
      } else if (targetType === 'users' && selectedUsers.length > 0) {
        payload.targetUsers = selectedUsers;
      }

      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // Reset form
        setTitle('');
        setBody('');
        setUrl('');
        setImageUrl('');
        setRequireInteraction(false);
        setTargetType('all');
        setSelectedRoles([]);
        setSelectedUsers([]);
        // Reload history
        await loadHistory();
      } else {
        toast.error(result.error || 'שגיאה בשליחת ההתראה');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('שגיאה בשליחת ההתראה');
    } finally {
      setSending(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'ios':
        return <Apple className="h-4 w-4" />;
      case 'android':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500">נשלח</Badge>;
      case 'sending':
        return <Badge variant="secondary">שולח...</Badge>;
      case 'failed':
        return <Badge variant="destructive">נכשל</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  חזרה
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold">התראות Push</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadHistory();
                loadSubscriptions();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">סה"כ מנויים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">משתמשים פעילים</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">iOS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Apple className="h-5 w-5" />
                {stats.ios}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.ios / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Android</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                {stats.android}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.android / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Desktop</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                {stats.desktop}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.desktop / stats.total) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send">שלח התראה</TabsTrigger>
            <TabsTrigger value="history">היסטוריה</TabsTrigger>
            <TabsTrigger value="subscribers">מנויים</TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>שלח התראת Push</CardTitle>
                <CardDescription>
                  שלח התראה למשתמשים שהתקינו את האפליקציה
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>iOS:</strong> משתמשים חייבים להתקין את האפליקציה למסך הבית כדי לקבל התראות
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="title">כותרת *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="כותרת ההתראה"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">תוכן *</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="תוכן ההתראה"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">
                    <LinkIcon className="h-4 w-4 inline mr-1" />
                    קישור (אופציונלי)
                  </Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="/admin/tasks/123"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">
                    <ImageIcon className="h-4 w-4 inline mr-1" />
                    תמונה (אופציונלי)
                  </Label>
                  <Input
                    id="image"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireInteraction"
                    checked={requireInteraction}
                    onCheckedChange={(checked) => setRequireInteraction(checked as boolean)}
                  />
                  <Label htmlFor="requireInteraction" className="mr-2">
                    דרוש אינטראקציה (ההתראה לא תיעלם אוטומטית)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>קהל יעד</Label>
                  <Select value={targetType} onValueChange={(value: any) => setTargetType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל המשתמשים</SelectItem>
                      <SelectItem value="roles">לפי תפקיד</SelectItem>
                      <SelectItem value="users">משתמשים ספציפיים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {targetType === 'roles' && (
                  <div className="space-y-2">
                    <Label>בחר תפקידים</Label>
                    <div className="space-y-2">
                      {Object.entries(stats.byRole).map(([role, count]) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role}`}
                            checked={selectedRoles.includes(role)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRoles([...selectedRoles, role]);
                              } else {
                                setSelectedRoles(selectedRoles.filter(r => r !== role));
                              }
                            }}
                          />
                          <Label htmlFor={`role-${role}`} className="mr-2">
                            {role} ({count} משתמשים)
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={sending || !title || !body}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      שלח התראה
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>היסטוריית התראות</CardTitle>
                <CardDescription>
                  50 ההתראות האחרונות שנשלחו
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      אין התראות בהיסטוריה
                    </p>
                  ) : (
                    history.map((notification) => (
                      <div
                        key={notification._id}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {notification.body}
                            </p>
                          </div>
                          {getStatusBadge(notification.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {new Date(notification.sentAt).toLocaleString('he-IL')}
                          </span>
                          <span>נשלח ע"י: {notification.sentBy}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {notification.deliveryStats.sent}
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            {notification.deliveryStats.delivered}
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-3 w-3" />
                            {notification.deliveryStats.failed}
                          </span>
                          <span className="flex items-center gap-1 text-blue-600">
                            <Bell className="h-3 w-3" />
                            {notification.deliveryStats.clicked}
                          </span>
                        </div>
                        
                        {notification.targetRoles && notification.targetRoles.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span className="text-xs">
                              תפקידים: {notification.targetRoles.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>רשימת מנויים</CardTitle>
                <CardDescription>
                  משתמשים שהרשמו לקבל התראות
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subscriptions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      אין מנויים רשומים
                    </p>
                  ) : (
                    subscriptions.map((sub) => (
                      <div
                        key={sub._id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getDeviceIcon(sub.deviceType)}
                          <div>
                            <p className="font-medium">{sub.username}</p>
                            <p className="text-sm text-muted-foreground">
                              {sub.email} • {sub.role}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>רשום מ: {new Date(sub.createdAt).toLocaleDateString('he-IL')}</p>
                          <p>פעיל לאחרונה: {new Date(sub.lastActive).toLocaleString('he-IL')}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 