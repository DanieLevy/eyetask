'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Send,
  History,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Clock,
  Users,
  Loader2,
  Upload,
  Home,
  FolderOpen,
  X,
  ChevronDown
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

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
  icon?: string;
  image?: string;
  url?: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

export default function PushNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkType, setLinkType] = useState<'home' | 'project'>('home');
  const [selectedProject, setSelectedProject] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [requireInteraction, setRequireInteraction] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'roles'>('all');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    console.log('[Push Admin] Checking auth and loading data...');
    if (!apiClient.isAuthenticated()) {
      console.log('[Push Admin] Not authenticated, redirecting...');
      router.push('/admin');
      return;
    }

    try {
      console.log('[Push Admin] Verifying auth...');
      const verifyResponse = await apiClient.get<any>('/api/auth/verify');
      console.log('[Push Admin] Auth verified:', verifyResponse);
      
      console.log('[Push Admin] Loading data in parallel...');
      await Promise.all([
        loadHistory(),
        loadSubscriberCount(),
        loadProjects()
      ]);
      console.log('[Push Admin] All data loaded successfully');
    } catch (error: any) {
      console.error('[Push Admin] Error loading data:', error);
      if (error.status === 401) {
        router.push('/admin');
      } else {
        toast.error('שגיאה בטעינת הנתונים');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      console.log('[Push Admin] Loading notification history...');
      const data = await apiClient.get<any>('/api/push/history');
      console.log('[Push Admin] History loaded:', data.history?.length || 0, 'notifications');
      setHistory(data.history || []);
    } catch (error) {
      console.error('[Push Admin] Error loading history:', error);
    }
  };

  const loadSubscriberCount = async () => {
    try {
      console.log('[Push Admin] Loading subscriber count...');
      const data = await apiClient.get<any>('/api/push/subscriptions');
      console.log('[Push Admin] Subscribers loaded:', data.subscriptions?.length || 0);
      setActiveSubscribers(data.subscriptions?.length || 0);
    } catch (error) {
      console.error('[Push Admin] Error loading subscribers:', error);
    }
  };

  const loadProjects = async () => {
    try {
      console.log('[Push Admin] Loading projects...');
      const data = await apiClient.get<any>('/api/projects');
      console.log('[Push Admin] Projects loaded:', data.projects?.length || 0);
      console.log('[Push Admin] Projects data:', data.projects);
      setProjects(data.projects || []);
    } catch (error) {
      console.error('[Push Admin] Error loading projects:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    console.log('[Push Admin] Starting image upload...');
    console.log('[Push Admin] File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('[Push Admin] Uploading to /api/upload/image...');
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      console.log('[Push Admin] Upload response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Push Admin] Upload failed:', errorText);
        throw new Error('Upload failed');
      }

      const data = await response.json();
      console.log('[Push Admin] Upload successful:', data);
      const imageUrl = data.data?.publicUrl || data.data?.filePath || data.url;
      if (!imageUrl) {
        console.error('[Push Admin] No URL in response:', data);
        throw new Error('No image URL in response');
      }
      setImageUrl(imageUrl);
      setUploadedImage(file);
      toast.success('התמונה הועלתה בהצלחה');
    } catch (error) {
      console.error('[Push Admin] Error uploading image:', error);
      toast.error('שגיאה בהעלאת התמונה');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSend = async () => {
    console.log('[Push Admin] Starting send process...');
    if (!title || !body) {
      console.log('[Push Admin] Missing required fields');
      toast.error('כותרת ותוכן הם שדות חובה');
      return;
    }

    setSending(true);
    try {
      // Build URL based on selection
      let url = '/';
      if (linkType === 'project' && selectedProject) {
        const project = projects.find(p => p._id === selectedProject);
        console.log('[Push Admin] Selected project:', project);
        if (project) {
          url = `/project/${project.name}`;
          console.log('[Push Admin] Built project URL:', url);
        }
      }

      const payload: any = {
        title,
        body,
        url,
        requireInteraction,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      };

      if (imageUrl) {
        payload.image = imageUrl;
        console.log('[Push Admin] Including image:', imageUrl);
      }

      // Set target
      if (targetType === 'roles' && selectedRoles.length > 0) {
        payload.targetRoles = selectedRoles;
        console.log('[Push Admin] Target roles:', selectedRoles);
      }

      console.log('[Push Admin] Sending notification with payload:', payload);
      const result = await apiClient.post<any>('/api/push/send', payload);
      console.log('[Push Admin] Send result:', result);

      if (result.success) {
        toast.success(result.message || 'התראה נשלחה בהצלחה');
        // Reset form
        setTitle('');
        setBody('');
        setLinkType('home');
        setSelectedProject('');
        setImageUrl('');
        setUploadedImage(null);
        setRequireInteraction(false);
        setTargetType('all');
        setSelectedRoles([]);
        // Reload history
        await loadHistory();
      } else {
        console.error('[Push Admin] Send failed:', result);
        toast.error(result.error || 'שגיאה בשליחת ההתראה');
      }
    } catch (error: any) {
      console.error('[Push Admin] Error sending notification:', error);
      toast.error(error.message || 'שגיאה בשליחת ההתראה');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'לפני רגע';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[500px]" />
            <Skeleton className="h-[500px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Minimal Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  <span className="hidden sm:inline">חזרה</span>
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    מערכת התראות
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeSubscribers} משתמשים פעילים
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                loadHistory();
                loadSubscriberCount();
              }}
              className="rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="send" className="space-y-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 p-1 h-11">
            <TabsTrigger value="send" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              <Send className="h-4 w-4 mr-2" />
              שליחה
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              <History className="h-4 w-4 mr-2" />
              היסטוריה
            </TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Notification Form */}
              <Card className="border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium">יצירת התראה</CardTitle>
                  <CardDescription className="text-sm">
                    מלא את הפרטים ושלח התראה למשתמשים
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      כותרת *
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="לדוגמה: משימה חדשה נוספה"
                      className="h-10"
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500 text-left">
                      {title.length}/50
                    </p>
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <Label htmlFor="body" className="text-sm font-medium">
                      תוכן ההודעה *
                    </Label>
                    <Textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="תוכן ההודעה שתופיע למשתמשים..."
                      rows={3}
                      className="resize-none"
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 text-left">
                      {body.length}/200
                    </p>
                  </div>

                  {/* Link Destination */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      לאן תוביל ההתראה?
                    </Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                        <input
                          type="radio"
                          value="home"
                          checked={linkType === 'home'}
                          onChange={() => {
                            console.log('[Push Admin] Link type changed to: home');
                            setLinkType('home');
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="flex items-center gap-2 text-sm">
                          <Home className="h-4 w-4 text-gray-500" />
                          דף הבית
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                        <input
                          type="radio"
                          value="project"
                          checked={linkType === 'project'}
                          onChange={() => {
                            console.log('[Push Admin] Link type changed to: project');
                            setLinkType('project');
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="flex items-center gap-2 text-sm">
                          <FolderOpen className="h-4 w-4 text-gray-500" />
                          פרויקט ספציפי
                        </span>
                      </label>
                    </div>

                    {linkType === 'project' && (
                      <Select 
                        value={selectedProject} 
                        onValueChange={(value) => {
                          console.log('[Push Admin] Project selected:', value);
                          setSelectedProject(value);
                        }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="בחר פרויקט" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project._id} value={project._id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      תמונה (אופציונלי)
                    </Label>
                    
                    {!imageUrl ? (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log('[Push Admin] File selected:', file.name);
                              handleImageUpload(file);
                            }
                          }}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className={cn(
                            "flex flex-col items-center justify-center w-full h-24",
                            "border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg",
                            "cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors",
                            "bg-gray-50 dark:bg-gray-900",
                            uploadingImage && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {uploadingImage ? (
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-gray-400 mb-1" />
                              <span className="text-xs text-gray-500">
                                לחץ להעלאת תמונה
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    ) : (
                      <div className="relative group">
                        <img
                          src={imageUrl}
                          alt="Uploaded"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            console.log('[Push Admin] Removing image');
                            setImageUrl('');
                            setUploadedImage(null);
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Options & Send */}
              <div className="space-y-6">
                {/* Target Audience */}
                <Card className="border-gray-200 dark:border-gray-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      קהל יעד
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                        <input
                          type="radio"
                          value="all"
                          checked={targetType === 'all'}
                          onChange={() => setTargetType('all')}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm">כל המשתמשים</span>
                      </label>
                      <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                        <input
                          type="radio"
                          value="roles"
                          checked={targetType === 'roles'}
                          onChange={() => setTargetType('roles')}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm">לפי תפקיד</span>
                      </label>
                    </div>

                    {targetType === 'roles' && (
                      <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        {['admin', 'data_manager', 'driver_manager'].map(role => (
                          <div key={role} className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id={role}
                              checked={selectedRoles.includes(role)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRoles([...selectedRoles, role]);
                                } else {
                                  setSelectedRoles(selectedRoles.filter(r => r !== role));
                                }
                              }}
                            />
                            <Label htmlFor={role} className="text-sm font-normal cursor-pointer">
                              {role === 'admin' ? 'מנהל מערכת' : 
                               role === 'data_manager' ? 'מנהל נתונים' : 
                               'מנהל נהגים'}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Advanced Options */}
                <Card className="border-gray-200 dark:border-gray-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-medium">
                      אפשרויות מתקדמות
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="requireInteraction"
                        checked={requireInteraction}
                        onCheckedChange={(checked) => setRequireInteraction(checked as boolean)}
                      />
                      <Label htmlFor="requireInteraction" className="text-sm font-normal cursor-pointer">
                        ההתראה תישאר על המסך עד שהמשתמש יסגור אותה
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={sending || !title || !body}
                  size="lg"
                  className="w-full h-12 text-base bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      שלח התראה
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle>היסטוריית התראות</CardTitle>
                <CardDescription>
                  כל ההתראות שנשלחו ב-30 הימים האחרונים
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {history.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>אין התראות בהיסטוריה</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {history.map((item) => (
                        <div
                          key={item._id}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                {item.status === 'sent' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : item.status === 'failed' ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-gray-500" />
                                )}
                                <h4 className="font-medium text-sm">{item.title}</h4>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {item.body}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(item.sentAt)}
                                </span>
                                <span>נשלח ע"י {item.sentBy}</span>
                                {item.deliveryStats && (
                                  <>
                                    <Badge variant="secondary" className="text-xs">
                                      {item.deliveryStats.sent} נשלחו
                                    </Badge>
                                    {item.deliveryStats.failed > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        {item.deliveryStats.failed} נכשלו
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {item.image && (
                              <img
                                src={item.image}
                                alt=""
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 