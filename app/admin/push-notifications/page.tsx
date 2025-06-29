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
  Smartphone,
  Monitor,
  Apple,
  Clock,
  Users,
  Target,
  Loader2,
  Upload,
  Home,
  FolderOpen,
  X
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  projectName: string;
  displayName: string;
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
    if (!apiClient.isAuthenticated()) {
      router.push('/admin');
      return;
    }

    try {
      const verifyResponse = await apiClient.get<any>('/api/auth/verify');
      
      await Promise.all([
        loadHistory(),
        loadSubscriberCount(),
        loadProjects()
      ]);
    } catch (error: any) {
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
      const data = await apiClient.get<any>('/api/push/history');
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadSubscriberCount = async () => {
    try {
      const data = await apiClient.get<any>('/api/push/subscriptions');
      setActiveSubscribers(data.subscriptions?.length || 0);
    } catch (error) {
      console.error('Error loading subscribers:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await apiClient.get<any>('/api/projects');
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setImageUrl(data.url);
      setUploadedImage(file);
      toast.success('התמונה הועלתה בהצלחה');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('שגיאה בהעלאת התמונה');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSend = async () => {
    if (!title || !body) {
      toast.error('כותרת ותוכן הם שדות חובה');
      return;
    }

    setSending(true);
    try {
      // Build URL based on selection
      let url = '/';
      if (linkType === 'project' && selectedProject) {
        const project = projects.find(p => p._id === selectedProject);
        if (project) {
          url = `/project/${project.projectName}`;
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

      if (imageUrl) payload.image = imageUrl;

      // Set target
      if (targetType === 'roles' && selectedRoles.length > 0) {
        payload.targetRoles = selectedRoles;
      }

      const result = await apiClient.post<any>('/api/push/send', payload);

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
        toast.error(result.error || 'שגיאה בשליחת ההתראה');
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[500px] rounded-2xl" />
            <Skeleton className="h-[500px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
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
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    מערכת התראות
                  </h1>
                  <p className="text-sm text-muted-foreground">
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
              className="rounded-xl"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="send" className="space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <TabsTrigger 
              value="send" 
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm"
            >
              <Send className="h-4 w-4 mr-2" />
              שליחה
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm"
            >
              <History className="h-4 w-4 mr-2" />
              היסטוריה
            </TabsTrigger>
          </TabsList>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Notification Form */}
              <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <CardTitle className="text-xl">יצירת התראה</CardTitle>
                  <CardDescription className="text-blue-100">
                    מלא את הפרטים ושלח התראה למשתמשים
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-base font-medium">
                      כותרת *
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="לדוגמה: משימה חדשה נוספה"
                      className="text-lg rounded-xl"
                      maxLength={50}
                    />
                    <p className="text-sm text-muted-foreground text-left">
                      {title.length}/50
                    </p>
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <Label htmlFor="body" className="text-base font-medium">
                      תוכן ההודעה *
                    </Label>
                    <Textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="תוכן ההודעה שתופיע למשתמשים..."
                      rows={3}
                      className="resize-none rounded-xl"
                      maxLength={200}
                    />
                    <p className="text-sm text-muted-foreground text-left">
                      {body.length}/200
                    </p>
                  </div>

                  {/* Link Destination */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      לאן תוביל ההתראה?
                    </Label>
                    <RadioGroup value={linkType} onValueChange={(v: any) => setLinkType(v)}>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="home" id="home" />
                        <Label htmlFor="home" className="font-normal cursor-pointer flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          דף הבית
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="project" id="project" />
                        <Label htmlFor="project" className="font-normal cursor-pointer flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          פרויקט ספציפי
                        </Label>
                      </div>
                    </RadioGroup>

                    {linkType === 'project' && (
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="בחר פרויקט" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project._id} value={project._id}>
                              {project.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      תמונה (אופציונלי)
                    </Label>
                    
                    {!imageUrl ? (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className={cn(
                            "flex flex-col items-center justify-center w-full h-32",
                            "border-2 border-dashed border-gray-300 rounded-xl",
                            "cursor-pointer hover:border-gray-400 transition-colors",
                            "bg-gray-50 dark:bg-gray-800",
                            uploadingImage && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {uploadingImage ? (
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-500">
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
                          className="w-full h-32 object-cover rounded-xl"
                        />
                        <button
                          onClick={() => {
                            setImageUrl('');
                            setUploadedImage(null);
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Options & Send */}
              <div className="space-y-6">
                {/* Target Audience */}
                <Card className="shadow-xl border-0 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      קהל יעד
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all" className="font-normal cursor-pointer">
                          כל המשתמשים
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="roles" id="roles" />
                        <Label htmlFor="roles" className="font-normal cursor-pointer">
                          לפי תפקיד
                        </Label>
                      </div>
                    </RadioGroup>

                    {targetType === 'roles' && (
                      <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
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
                            <Label htmlFor={role} className="font-normal cursor-pointer">
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
                <Card className="shadow-xl border-0 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5" />
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
                      <Label htmlFor="requireInteraction" className="font-normal cursor-pointer">
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
                  className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      שלח התראה
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle>היסטוריית התראות</CardTitle>
                <CardDescription>
                  כל ההתראות שנשלחו ב-30 הימים האחרונים
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {history.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>אין התראות בהיסטוריה</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {history.map((item) => (
                        <div
                          key={item._id}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {item.status === 'sent' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : item.status === 'failed' ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-gray-500" />
                                )}
                                <h4 className="font-medium">{item.title}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.body}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(item.sentAt)}
                                </span>
                                <span>נשלח ע"י {item.sentBy}</span>
                                {item.deliveryStats && (
                                  <>
                                    <Badge variant="outline" className="text-xs">
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
                              {item.url && item.url !== '/' && (
                                <div className="flex items-center gap-1 text-xs text-blue-600">
                                  <LinkIcon className="h-3 w-3" />
                                  <span>{item.url}</span>
                                </div>
                              )}
                            </div>
                            {item.image && (
                              <img
                                src={item.image}
                                alt=""
                                className="w-16 h-16 rounded-lg object-cover"
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