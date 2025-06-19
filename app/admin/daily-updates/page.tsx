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
  Calendar
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { toast } from 'sonner';

interface DailyUpdate {
  id: string;
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
      const response = await fetch('/api/daily-updates?includeHidden=true');
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
    if (!confirm('האם אתה בטוח שברצונך למחוק את העדכון?')) return;
    
    try {
      const response = await fetch(`/api/daily-updates/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setUpdates(prev => prev.filter(update => update.id !== id));
      } else {
        toast.error('שגיאה במחיקת העדכון');
      }
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error('שגיאה במחיקת העדכון');
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const response = await fetch(`/api/daily-updates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPinned })
      });
      
      if (response.ok) {
        setUpdates(prev => prev.map(update => 
          update.id === id 
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
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="h-6 w-6 text-primary" />
              <div>
                <h1 className={`text-xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
                  עדכונים יומיים
                </h1>
                <p className="text-sm text-muted-foreground">ניהול עדכונים יומיים למשתמשים</p>
              </div>
            </div>
            <Link
              href="/admin/daily-updates/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className={mixedBody.fontClass}>עדכון חדש</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-xs text-muted-foreground mb-4 p-3 bg-muted/30 rounded-md border border-border/30">
            <span className="flex items-center gap-1">
              <span className="font-medium text-foreground">{updates.length}</span>
              סך הכול
            </span>
            <span className="flex items-center gap-1">
              <Pin className="w-3 h-3" />
              <span className="font-medium text-primary">{updates.filter(u => u.is_pinned).length}</span>
              מוצמדים
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium text-blue-600">{updates.filter(u => u.isGeneral === true || (!u.projectId && u.isGeneral !== false)).length}</span>
              כלליים
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium text-green-600">{updates.filter(u => u.projectId && u.isGeneral === false).length}</span>
              ספציפיים
            </span>
          </div>

          {/* Fallback Message Settings */}
          <div className="bg-card rounded-lg border border-border mb-8">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h3 className={`text-sm font-medium ${hebrewHeading.fontClass}`}>הודעת ברירת מחדל</h3>
              </div>
              {!isEditingFallback ? (
                <button
                  onClick={() => setIsEditingFallback(true)}
                  className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-md"
                >
                  ערוך
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveFallbackMessage}
                    disabled={isSavingFallback}
                    className="text-xs px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50"
                  >
                    {isSavingFallback ? 'שומר...' : 'שמור'}
                  </button>
                  <button
                    onClick={() => setIsEditingFallback(false)}
                    className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-md"
                  >
                    בטל
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-2">הודעה שתוצג כאשר אין עדכונים זמינים</p>
              {isEditingFallback ? (
                <textarea
                  value={fallbackMessage}
                  onChange={(e) => setFallbackMessage(e.target.value)}
                  className="w-full border border-input rounded-md p-2 h-24"
                  placeholder="הזן הודעת ברירת מחדל"
                  dir="rtl"
                />
              ) : (
                <div className="bg-muted/30 p-3 rounded-md border border-border">
                  <p className="text-sm" dir="rtl">{fallbackMessage}</p>
                </div>
              )}
            </div>
          </div>
          
          {updates.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className={`text-lg font-semibold text-foreground mb-2 ${hebrewHeading.fontClass}`}>
                אין עדכונים יומיים
              </h3>
              <p className="text-muted-foreground mb-6">צור עדכון יומי ראשון כדי להתחיל</p>
              <Link
                href="/admin/daily-updates/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className={mixedBody.fontClass}>צור עדכון ראשון</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedUpdates.map((update) => (
                <div
                  key={update.id}
                  className={`
                    bg-card rounded-lg border transition-all hover:shadow-sm hover:border-border/60
                    ${update.is_pinned 
                      ? 'border-primary/30 bg-primary/5 shadow-sm' 
                      : 'border-border/40'
                    }
                  `}
                >
                  {/* Header Bar */}
                  <div className={`px-4 py-3 border-b border-border/20 ${update.is_pinned ? 'bg-primary/10' : 'bg-muted/20'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Priority Badge */}
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                          update.priority <= 3 ? 'bg-red-500' : 
                          update.priority <= 6 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}>
                          {update.priority}
                        </div>
                        
                        {/* Title */}
                        <h3 className={`text-base font-semibold text-foreground ${hebrewHeading.fontClass}`}>
                          {update.title}
                        </h3>
                        
                        {/* Type Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                          update.type === 'error' ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400' :
                          update.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400' :
                          update.type === 'success' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                          update.type === 'announcement' ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400' :
                          'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${getTypeColor(update.type)}`}></div>
                          {getTypeLabel(update.type)}
                        </span>
                        
                        {/* Pinned Badge */}
                        {update.is_pinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                            <Pin className="h-3 w-3" />
                            מוצמד
                          </span>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePin(update.id, update.is_pinned)}
                          className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${
                            update.is_pinned 
                              ? 'text-primary hover:bg-primary/20' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          }`}
                          title={update.is_pinned ? 'בטל הצמדה' : 'הצמד'}
                        >
                          {update.is_pinned ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </button>
                        <Link
                          href={`/admin/daily-updates/${update.id}/edit`}
                          className="flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                          title="ערוך"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(update.id)}
                          className="flex items-center justify-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                          title="מחק"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="px-4 py-3">
                    {/* Meta Information */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(update.duration_type, update.duration_value)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(update.created_at).toLocaleDateString('he-IL')}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                        (update.isGeneral === true || (!update.projectId && update.isGeneral !== false))
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30'
                          : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/30'
                      }`}>
                        {(update.isGeneral === true || (!update.projectId && update.isGeneral !== false)) 
                          ? <>🏠 כללי</> 
                          : <>📁 {loadingProjects ? '...' : getProjectName(update.projectId)}</>}
                      </span>
                    </div>
                    
                    {/* Update Content */}
                    <div className="text-foreground">
                      <p className={`text-sm leading-relaxed ${mixedBody.fontClass}`}>
                        {update.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 