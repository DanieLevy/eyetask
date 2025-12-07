'use client';

import { 
  ArrowRight, 
  Save,
  ChevronRight,
  Megaphone
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import ModernCheckbox from '@/components/ModernCheckbox';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';

interface UpdateForm {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  durationType: 'hours' | 'days' | 'permanent';
  durationValue: number;
  isPinned: boolean;
  projectId: string; // NEW: Project assignment
  isGeneral: boolean; // NEW: General vs project-specific
}

interface Project {
  _id: string;
  name: string;
}

export default function NewDailyUpdatePage() {
  const router = useRouter();
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');
  
  const [submitting, setSubmitting] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  const initialForm: UpdateForm = {
    title: '',
    content: '',
    type: 'info',
    priority: 5,
    durationType: 'days',
    durationValue: 1,
    isPinned: false,
    projectId: 'general',
    isGeneral: true
  };
  
  const [form, setForm] = useState<UpdateForm>(initialForm);

  // Fetch projects on component mount
  useEffect(() => {
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
        toast.error('שגיאה בטעינת הפרויקטים');
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  // Handle project selection change
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
    setSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('אנא התחבר מחדש למערכת');
        router.push('/');
        return;
      }

      const submitData = {
        ...form,
        projectId: form.isGeneral ? null : form.projectId,
        targetAudience: form.isGeneral ? ['all'] : [`project:${form.projectId}`]
      };

      const response = await fetch('/api/daily-updates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create daily update');
      }
      
      if (createAnother) {
        // Reset form but keep some preferences
        setForm(prev => ({
          ...initialForm,
          type: prev.type,
          durationType: prev.durationType,
          durationValue: prev.durationValue
        }));
        toast.success('עדכון יומי נוצר בהצלחה! אתה יכול ליצור עדכון נוסף.');
      } else {
        toast.success('עדכון יומי נוצר בהצלחה');
        router.push('/admin/daily-updates');
      }
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשמירת העדכון');
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions = [
    { value: 'info', label: 'מידע', color: 'bg-blue-500' },
    { value: 'warning', label: 'אזהרה', color: 'bg-yellow-500' },
    { value: 'success', label: 'הצלחה', color: 'bg-green-500' },
    { value: 'error', label: 'שגיאה', color: 'bg-red-500' },
    { value: 'announcement', label: 'הודעה', color: 'bg-purple-500' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/daily-updates"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="חזור לעדכונים יומיים"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Megaphone className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>עדכונים יומיים</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>עדכון חדש</span>
                </div>
                <h1 className={`text-lg font-bold text-foreground ${hebrewHeading.fontClass}`}>
                  צור עדכון יומי חדש
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <h2 className={`text-xl font-semibold text-foreground ${hebrewHeading.fontClass}`}>
                עדכון יומי חדש
              </h2>
              <p className="text-sm text-muted-foreground mt-1">צור עדכון יומי חדש לכל המשתמשים</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mixedBody.fontClass}`}>
                  כותרת *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-right"
                  required
                  dir="rtl"
                  placeholder="הזן כותרת לעדכון"
                />
              </div>

              {/* Content */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mixedBody.fontClass}`}>
                  תוכן *
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-right h-24"
                  required
                  dir="rtl"
                  placeholder="הזן את תוכן העדכון"
                />
              </div>

              {/* Project Assignment */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${mixedBody.fontClass}`}>
                  הצגה *
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="general"
                      name="projectAssignment"
                      checked={form.projectId === 'general'}
                      onChange={() => handleProjectChange('general')}
                      className="text-primary"
                    />
                    <label htmlFor="general" className={`text-sm ${mixedBody.fontClass}`}>
                      כללי (דף הבית)
                    </label>
                  </div>
                  
                  {loadingProjects ? (
                    <div className="text-sm text-muted-foreground">טוען פרויקטים...</div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground mb-1">פרויקט ספציפי:</div>
                      {projects.length > 0 ? (
                        projects.map(project => (
                          <div key={project._id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`project-${project._id}`}
                              name="projectAssignment"
                              checked={form.projectId === project._id}
                              onChange={() => handleProjectChange(project._id)}
                              className="text-primary"
                            />
                            <label 
                              htmlFor={`project-${project._id}`} 
                              className={`text-sm ${mixedBody.fontClass}`}
                            >
                              {project.name}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">אין פרויקטים זמינים</div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  עדכונים כלליים יוצגו בדף הבית, עדכונים ספציפיים יוצגו רק בעמוד הפרויקט הנבחר
                </p>
              </div>

              {/* Type */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${mixedBody.fontClass}`}>
                  סוג עדכון *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {typeOptions.map(option => (
                    <label key={option.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={option.value}
                      checked={form.type === option.value}
                      onChange={(e) => setForm({ ...form, type: e.target.value as UpdateForm['type'] })}
                      className="sr-only"
                      />
                      <div className={`
                        flex items-center gap-2 w-full p-2 rounded-lg border transition-all
                        ${form.type === option.value 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                        }
                      `}>
                        <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                        <span className={`text-sm ${mixedBody.fontClass}`}>{option.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${mixedBody.fontClass}`}>
                  עדיפות (1 = גבוהה, 10 = נמוכה)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 5 })}
                  className="w-full border border-border rounded-lg px-3 py-2"
                />
              </div>

              {/* Duration */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${mixedBody.fontClass}`}>
                  משך הצגה
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={form.durationType}
                    onChange={(e) => setForm({ ...form, durationType: e.target.value as 'hours' | 'days' | 'permanent' })}
                    className="w-full border border-border rounded-lg px-3 py-2"
                  >
                    <option value="hours">שעות</option>
                    <option value="days">ימים</option>
                    <option value="permanent">קבוע</option>
                  </select>
                  
                  {form.durationType !== 'permanent' && (
                    <input
                      type="number"
                      min="1"
                      value={form.durationValue}
                      onChange={(e) => setForm({ ...form, durationValue: parseInt(e.target.value) || 1 })}
                      className="w-full border border-border rounded-lg px-3 py-2"
                      placeholder={`מספר ${form.durationType === 'hours' ? 'שעות' : 'ימים'}`}
                    />
                  )}
                </div>
              </div>

              {/* Pinned */}
              <div className="flex items-center gap-2">
                <ModernCheckbox
                  checked={form.isPinned}
                  onChange={(checked) => setForm({ ...form, isPinned: checked })}
                  id="pinned"
                />
                <label htmlFor="pinned" className={`text-sm ${mixedBody.fontClass}`}>
                  הצמד למעלה
                </label>
              </div>

              {/* Create Another Option */}
              <div className="pt-4 border-t border-border">
                <ModernCheckbox
                  checked={createAnother}
                  onChange={(checked) => setCreateAnother(checked)}
                  label="צור עדכון נוסף לאחר השמירה"
                />
                <p className="text-xs text-muted-foreground mt-1">אם מסומן, הטופס יישאר פתוח לאחר יצירת העדכון</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span className={mixedBody.fontClass}>
                    {submitting ? 'שומר...' : 'שמור עדכון'}
                  </span>
                </button>
                <Link
                  href="/admin/daily-updates"
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <span className={mixedBody.fontClass}>ביטול</span>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 