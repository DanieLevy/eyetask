'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Pin, 
  PinOff,
  ArrowRight,
  Settings,
  Clock,
  Calendar,
  Eye,
  EyeOff,
  Filter,
  X,
  Loader2
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

interface DailyUpdate {
  id: string;
  _id?: string; // Support for legacy data
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  duration_type: 'hours' | 'days' | 'permanent';
  duration_value?: number;
  is_pinned: boolean;
  is_active: boolean;
  projectId?: string; // NEW: Project association
  isGeneral?: boolean; // NEW: General vs project-specific
  created_at: string;
  updated_at: string;
}

interface Project {
  _id: string;
  name: string;
}

export default function DailyUpdatesPage() {
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');
  
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallbackMessage, setFallbackMessage] = useState('לא נמצאו עדכונים להצגה');
  const [isEditingFallback, setIsEditingFallback] = useState(false);
  const [isSavingFallback, setIsSavingFallback] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    fetchUpdates();
    fetchFallbackMessage();
    fetchProjects();
  }, []);

  const fetchUpdates = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/daily-updates?includeHidden=true', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      const result = await response.json();
      
      if (result.success) {
        setUpdates(result.updates);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/projects', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const getProjectName = (projectId?: string): string => {
    if (!projectId) return 'כללי';
    const project = projects.find(p => p._id === projectId);
    return project ? project.name : 'פרויקט לא נמצא';
  };

  const fetchFallbackMessage = async () => {
    try {
      const response = await fetch('/api/settings/main-page-carousel-fallback-message');
      if (response.ok) {
        const result = await response.json();
        if (result.value) {
          setFallbackMessage(result.value);
        }
      }
    } catch (error) {
      console.error('Error fetching fallback message:', error);
    }
  };

  const handleSaveFallbackMessage = async () => {
    try {
      setIsSavingFallback(true);
      const response = await fetch('/api/settings/main-page-carousel-fallback-message', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: fallbackMessage })
      });
      
      if (response.ok) {
        setIsEditingFallback(false);
        toast.success('הודעת ברירת מחדל נשמרה בהצלחה');
      } else {
        toast.error('שגיאה בשמירת הודעת ברירת מחדל');
      }
    } catch (error) {
      console.error('Error saving fallback message:', error);
      toast.error('שגיאה בשמירת הודעת ברירת מחדל');
    } finally {
      setIsSavingFallback(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      console.error('Update ID is undefined');
      toast.error('שגיאה: מזהה העדכון חסר');
      return;
    }
    
    if (!confirm('האם אתה בטוח שברצונך למחוק את העדכון?')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/daily-updates/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setUpdates(prev => prev.filter(update => update.id !== id && update._id !== id));
      } else {
        toast.error('שגיאה במחיקת העדכון');
      }
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error('שגיאה במחיקת העדכון');
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    if (!id) {
      console.error('Update ID is undefined');
      toast.error('שגיאה: מזהה העדכון חסר');
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/daily-updates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isPinned: !currentPinned })
      });
      
      if (response.ok) {
        setUpdates(prev => prev.map(update => 
          (update.id === id || update._id === id)
            ? { ...update, is_pinned: !currentPinned }
            : update
        ));
      } else {
        toast.error('שגיאה בעדכון הצמדה');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('שגיאה בעדכון הצמדה');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'announcement': return 'bg-purple-500';
      default: return 'bg-blue-500';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'info': return 'מידע';
      case 'warning': return 'אזהרה';
      case 'success': return 'הצלחה';
      case 'error': return 'שגיאה';
      case 'announcement': return 'הודעה';
      default: return 'מידע';
    }
  };

  const formatDuration = (durationType: string, durationValue?: number) => {
    if (durationType === 'permanent') return 'קבוע';
    if (!durationValue) return 'לא מוגדר';
    const unit = durationType === 'hours' ? 'שעות' : 'ימים';
    return `${durationValue} ${unit}`;
  };

  // Sort updates: pinned first, then by priority, then by creation date
  const sortedUpdates = [...updates].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    
    // Add date validation
    const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
    const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
    
    // Check if dates are valid
    const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
    const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
    
    return timeB - timeA;
  });

  // Type badges configuration
  const typeBadges = {
    info: { label: 'מידע', icon: '💬', className: 'bg-blue-500 text-white' },
    warning: { label: 'אזהרה', icon: '⚠️', className: 'bg-yellow-500 text-white' },
    success: { label: 'הצלחה', icon: '✅', className: 'bg-green-500 text-white' },
    error: { label: 'שגיאה', icon: '❌', className: 'bg-red-500 text-white' },
    announcement: { label: 'הכרזה', icon: '📢', className: 'bg-purple-500 text-white' }
  };

  const getUpdateLocation = (update: DailyUpdate) => {
    if (update.isGeneral) return '🏠 כללי';
    const project = projects.find(p => p._id === update.projectId);
    return `📁 ${project?.name || 'פרויקט'}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'תאריך לא ידוע';
    
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      {/* Mobile-friendly header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className={`text-xl md:text-2xl font-bold ${hebrewHeading.fontClass}`}>
                ניהול עדכונים יומיים
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                {updates.length} עדכונים פעילים
              </p>
            </div>
            <Link href="/admin/daily-updates/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">עדכון חדש</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">סה"כ</p>
                  <p className="text-2xl font-bold">{updates.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">נעוצים</p>
                  <p className="text-2xl font-bold">{updates.filter(u => u.is_pinned).length}</p>
                </div>
                <Pin className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400">פעילים</p>
                  <p className="text-2xl font-bold">{updates.filter(u => u.is_active).length}</p>
                </div>
                <Eye className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-400">זמניים</p>
                  <p className="text-2xl font-bold">{updates.filter(u => u.duration_type !== 'permanent').length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Updates List */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className={`text-lg font-semibold ${hebrewHeading.fontClass}`}>
                רשימת עדכונים
              </h2>
              <div className="flex items-center gap-2">
                {/* Future: Add filters here */}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sortedUpdates.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">אין עדכונים יומיים</p>
                <Link href="/admin/daily-updates/new">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    צור עדכון ראשון
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 p-4 md:p-0">
                {sortedUpdates.map((update) => {
                  const updateId = update.id || update._id;
                  const typeBadge = typeBadges[update.type as keyof typeof typeBadges] || typeBadges.info;
                  
                  return (
                    <div
                      key={updateId || `update-${update.created_at}`}
                      className={cn(
                        "bg-card rounded-lg border transition-all hover:shadow-sm hover:border-border/60 group",
                        update.is_pinned 
                          ? 'border-primary/30 bg-primary/5 shadow-sm' 
                          : 'border-border/40'
                      )}
                    >
                      <div className="p-4 md:p-5">
                        {/* Mobile: Stack layout, Desktop: Row layout */}
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Main Content */}
                          <div className="flex-1 space-y-2">
                            {/* Title and badges */}
                            <div className="flex items-start gap-2 flex-wrap">
                              <h3 className="font-semibold text-base md:text-lg">
                                {update.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={cn("text-xs", typeBadge.className)}>
                                  {typeBadge.icon} {typeBadge.label}
                                </Badge>
                                {update.is_pinned && (
                                  <Badge variant="outline" className="text-xs">
                                    <Pin className="h-3 w-3 mr-1" />
                                    נעוץ
                                  </Badge>
                                )}
                                {!update.is_active && (
                                  <Badge variant="secondary" className="text-xs">
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    מוסתר
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Content preview */}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {update.content}
                            </p>
                            
                            {/* Metadata */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(update.created_at)}
                              </span>
                              <span>•</span>
                              <span>עדיפות: {update.priority}</span>
                              <span>•</span>
                              <span>{getUpdateLocation(update)}</span>
                              {update.duration_type !== 'permanent' && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {update.duration_value} {update.duration_type === 'hours' ? 'שעות' : 'ימים'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 self-end md:self-start">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateId && handleTogglePin(updateId, update.is_pinned)}
                              className="h-8 px-2"
                              title={update.is_pinned ? 'בטל נעיצה' : 'נעץ'}
                            >
                              <Pin className={cn("h-4 w-4", update.is_pinned && "fill-current")} />
                            </Button>
                            <Link href={`/admin/daily-updates/${updateId}/edit`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                ערוך
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!updateId) {
                                  console.error('Update ID is undefined:', update);
                                  toast.error('שגיאה: מזהה העדכון חסר');
                                  return;
                                }
                                handleDelete(updateId);
                              }}
                              className="h-8 px-2 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 