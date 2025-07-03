'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, Clock, Pin, Eye, EyeOff, Save, X, AlertCircle, CheckCircle2, Hash, Type, Sparkles, Info } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UpdateForm {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  durationType: 'hours' | 'days' | 'permanent';
  durationValue: number;
  isPinned: boolean;
  projectId: string;
  isGeneral: boolean;
}

interface Project {
  _id: string;
  name: string;
}

interface DailyUpdate {
  id: string;
  _id?: string;
  title: string;
  content: string;
  type: string;
  priority: number;
  durationType: string;
  durationValue?: number;
  expiresAt?: string;
  isActive: boolean;
  isPinned: boolean;
  isHidden: boolean;
  targetAudience: string[];
  projectId?: string;
  isGeneral: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

const typeOptions = [
  { value: 'info', label: 'מידע', icon: '💬', color: 'from-blue-500 to-blue-600', bgColor: 'from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50' },
  { value: 'warning', label: 'אזהרה', icon: '⚠️', color: 'from-yellow-500 to-yellow-600', bgColor: 'from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50' },
  { value: 'success', label: 'הצלחה', icon: '✅', color: 'from-green-500 to-green-600', bgColor: 'from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50' },
  { value: 'error', label: 'שגיאה', icon: '❌', color: 'from-red-500 to-red-600', bgColor: 'from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50' },
  { value: 'announcement', label: 'הכרזה', icon: '📢', color: 'from-purple-500 to-purple-600', bgColor: 'from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50' }
];

const durationOptions = [
  { value: 'hours', label: 'שעות', icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
  { value: 'days', label: 'ימים', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  { value: 'permanent', label: 'קבוע', icon: Pin, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/30' }
];

export default function EditDailyUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [update, setUpdate] = useState<DailyUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  const [form, setForm] = useState<UpdateForm>({
    title: '',
    content: '',
    type: 'info',
    priority: 5,
    durationType: 'days',
    durationValue: 1,
    isPinned: false,
    projectId: 'general',
    isGeneral: true
  });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }

    fetchProjects();
    fetchUpdate();
  }, [id, router]);

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
      toast.error('שגיאה בטעינת פרויקטים');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchUpdate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/daily-updates/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch update');
      }

      const data = await response.json();
      
      if (!data.success || !data.update) {
        throw new Error('Failed to fetch update data');
      }
      
      const updateData = data.update;
      setUpdate(updateData);

      // Calculate duration from dates
      const expireDate = updateData.expiresAt ? new Date(updateData.expiresAt) : null;
      const createdDate = updateData.createdAt ? new Date(updateData.createdAt) : new Date();
      
      const isExpireDateValid = expireDate && !isNaN(expireDate.getTime());
      const isCreatedDateValid = !isNaN(createdDate.getTime());
      
      let durationType: 'hours' | 'days' | 'permanent' = 'days';
      let durationValue = 1;

      if (!isExpireDateValid || !updateData.expiresAt) {
        durationType = 'permanent';
      } else if (isCreatedDateValid && isExpireDateValid) {
        const diffHours = Math.round((expireDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
        
        if (diffHours < 24) {
          durationType = 'hours';
          durationValue = Math.max(1, diffHours);
        } else {
          durationType = 'days';
          durationValue = Math.max(1, Math.round(diffHours / 24));
        }
      }

      setForm({
        title: updateData.title || '',
        content: updateData.content || '',
        type: updateData.type || 'info',
        priority: updateData.priority || 5,
        durationType,
        durationValue,
        isPinned: updateData.isPinned || false,
        projectId: updateData.projectId || 'general',
        isGeneral: updateData.isGeneral !== false
      });

    } catch (error) {
      console.error('Error fetching update:', error);
      toast.error('שגיאה בטעינת העדכון');
      setTimeout(() => router.push('/admin/daily-updates'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    const isGeneral = projectId === 'general';
    setForm({
      ...form,
      projectId,
      isGeneral
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('adminToken');
      
      let expiresAt = null;
      if (form.durationType !== 'permanent') {
        const now = new Date();
        if (form.durationType === 'hours') {
          expiresAt = new Date(now.getTime() + form.durationValue * 60 * 60 * 1000);
        } else {
          expiresAt = new Date(now.getTime() + form.durationValue * 24 * 60 * 60 * 1000);
        }
      }

      const updateData = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        priority: form.priority,
        isPinned: form.isPinned,
        projectId: form.projectId === 'general' ? null : form.projectId,
        isGeneral: form.isGeneral,
        expiresAt,
        targetAudience: form.isGeneral ? ['all'] : [`project:${form.projectId}`]
      };

      const response = await fetch(`/api/daily-updates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update');
      }

      toast.success('העדכון נשמר בהצלחה');
      router.push('/admin/daily-updates');
    } catch (error) {
      console.error('Error updating:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשמירת העדכון');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <Loader2 className="h-12 w-12 text-primary/30 mx-auto" />
            </div>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto relative" />
          </div>
          <p className="text-muted-foreground font-medium">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const createdAtDate = update && update.createdAt ? new Date(update.createdAt) : new Date();
  const isValidDate = !isNaN(createdAtDate.getTime());
  const timeAgo = isValidDate 
    ? formatDistanceToNow(createdAtDate, { addSuffix: true, locale: he })
    : 'זמן לא ידוע';

  const selectedType = typeOptions.find(t => t.value === form.type);
  const selectedDuration = durationOptions.find(d => d.value === form.durationType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Mobile-friendly header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.push('/admin/daily-updates')}
              className="p-2.5 hover:bg-accent rounded-xl transition-all hover:scale-105 bg-background/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                עריכת עדכון
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="h-3 w-3" />
                {update?.title || 'עדכון יומי'} • {timeAgo}
              </p>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2.5 hover:bg-accent rounded-xl transition-all hover:scale-105 md:hidden bg-background/50"
            >
              {showPreview ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl relative">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form section */}
          <div className={cn(
            "lg:col-span-2 space-y-6",
            showPreview && "hidden lg:block"
          )}>
            {/* Basic Information Card */}
            <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Type className="h-5 w-5 text-primary" />
                  </div>
                  פרטי העדכון
                </h2>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium mb-2">כותרת *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background/50"
                    placeholder="הזן כותרת מרשימה לעדכון"
                    required
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">תוכן *</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none bg-background/50"
                    placeholder="הזן את תוכן העדכון המלא"
                    required
                    dir="rtl"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-muted-foreground">
                      {form.content.length} / 500 תווים
                    </p>
                    {form.content.length > 400 && (
                      <p className="text-xs text-orange-500">
                        קרוב למגבלת התווים
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Type and Priority Card */}
            <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  סוג ועדיפות
                </h2>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div>
                  <label className="block text-sm font-medium mb-4">סוג העדכון</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {typeOptions.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm({ ...form, type: type.value as any })}
                        className={cn(
                          "relative p-4 rounded-xl border-2 transition-all transform hover:scale-105",
                          "flex flex-col items-center gap-2",
                          form.type === type.value
                            ? `border-transparent bg-gradient-to-br ${type.bgColor} shadow-md`
                            : "border-border hover:border-primary/50 bg-background/50"
                        )}
                      >
                        {form.type === type.value && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <span className="text-2xl">{type.icon}</span>
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium">
                    עדיפות: <span className="text-primary font-bold text-lg">{form.priority}</span>
                  </label>
                  <div className="px-3">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, 
                          #10b981 0%, 
                          #10b981 ${(form.priority - 1) * 11.11}%, 
                          #f59e0b ${(form.priority - 1) * 11.11}%, 
                          #f59e0b ${(form.priority - 1) * 11.11 + 33.33}%, 
                          #ef4444 ${(form.priority - 1) * 11.11 + 33.33}%, 
                          #ef4444 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>נמוכה</span>
                      <span>בינונית</span>
                      <span>גבוהה</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Display Settings Card */}
            <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Eye className="h-5 w-5 text-primary" />
                  </div>
                  הגדרות תצוגה
                </h2>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Project Assignment */}
                <div>
                  <label className="block text-sm font-medium mb-4">היכן להציג</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-accent/50 transition-all group">
                      <input
                        type="radio"
                        checked={form.projectId === 'general'}
                        onChange={() => handleProjectChange('general')}
                        className="text-primary h-5 w-5"
                      />
                      <div className="flex-1">
                        <span className="font-medium group-hover:text-primary transition-colors">כללי</span>
                        <p className="text-xs text-muted-foreground">יוצג בדף הבית לכל המשתמשים</p>
                      </div>
                    </label>
                    
                    {!loadingProjects && projects.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground px-3 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          או בחר פרויקט ספציפי:
                        </p>
                        {projects.map(project => (
                          <label key={project._id} className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-accent/50 transition-all group">
                            <input
                              type="radio"
                              checked={form.projectId === project._id}
                              onChange={() => handleProjectChange(project._id)}
                              className="text-primary h-5 w-5"
                            />
                            <div className="flex-1">
                              <span className="font-medium group-hover:text-primary transition-colors">{project.name}</span>
                              <p className="text-xs text-muted-foreground">יוצג רק בעמוד הפרויקט</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Duration Settings */}
                <div>
                  <label className="block text-sm font-medium mb-4">משך הצגה</label>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {durationOptions.map((duration) => {
                      const Icon = duration.icon;
                      return (
                        <button
                          key={duration.value}
                          type="button"
                          onClick={() => setForm({ ...form, durationType: duration.value as any })}
                          className={cn(
                            "relative p-4 rounded-xl border-2 transition-all transform hover:scale-105",
                            "flex flex-col items-center gap-2",
                            form.durationType === duration.value
                              ? `border-transparent ${duration.bgColor} shadow-md`
                              : "border-border hover:border-primary/50 bg-background/50"
                          )}
                        >
                          {form.durationType === duration.value && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <Icon className={cn("h-6 w-6", duration.color)} />
                          <span className="text-sm font-medium">{duration.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {form.durationType !== 'permanent' && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <input
                        type="number"
                        min={1}
                        value={form.durationValue}
                        onChange={(e) => setForm({ ...form, durationValue: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 border rounded-lg text-center bg-background"
                      />
                      <span className="text-sm font-medium">
                        {form.durationType === 'hours' ? 'שעות' : 'ימים'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pin Option */}
                <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-accent/50 transition-all group">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                    className="h-5 w-5 rounded text-primary"
                  />
                  <Pin className={cn("h-5 w-5 transition-colors", form.isPinned && "text-primary")} />
                  <div className="flex-1">
                    <span className="font-medium group-hover:text-primary transition-colors">נעוץ בראש הרשימה</span>
                    <p className="text-xs text-muted-foreground">העדכון יופיע תמיד בראש הרשימה</p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>

          {/* Preview section */}
          <div className={cn(
            "lg:col-span-1",
            !showPreview && "hidden lg:block"
          )}>
            <div className="sticky top-24">
              <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    תצוגה מקדימה
                  </h2>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="border-2 rounded-xl p-4 bg-background/50 space-y-3">
                    {/* Preview header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold text-lg">
                            {form.title || 'כותרת העדכון'}
                          </h3>
                          {form.isPinned && (
                            <Pin className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        {selectedType && (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
                            `bg-gradient-to-r ${selectedType.color} text-white`
                          )}>
                            {selectedType.icon} {selectedType.label}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Preview content */}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" dir="rtl">
                      {form.content || 'תוכן העדכון יופיע כאן...'}
                    </p>
                    
                    {/* Preview footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                      <span>{form.isGeneral ? '🏠 כללי' : `📁 ${projects.find(p => p._id === form.projectId)?.name || 'פרויקט'}`}</span>
                      <span className="flex items-center gap-2">
                        <span>עדיפות: {form.priority}</span>
                        <span>•</span>
                        <span>{selectedDuration?.label} {form.durationType !== 'permanent' && `(${form.durationValue})`}</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        {/* Floating Action Buttons - Always visible */}
        <div className="fixed bottom-6 left-6 right-6 z-40 flex justify-center">
          <div className="bg-background/80 backdrop-blur-xl shadow-2xl rounded-2xl p-4 border max-w-md w-full mx-auto">
            <div className="flex gap-3">
              <Button 
                type="submit"
                disabled={saving || !form.title || !form.content}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                onClick={handleSubmit}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    שמור שינויים
                  </>
                )}
              </Button>
              <Button 
                type="button"
                variant="outline"
                className="flex-1 border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                onClick={() => router.push('/admin/daily-updates')}
              >
                <X className="mr-2 h-4 w-4" />
                ביטול
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Add custom styles for range slider */}
      <style jsx global>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          border: 2px solid hsl(var(--primary));
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          border: 2px solid hsl(var(--primary));
        }
      `}</style>
    </div>
  );
} 