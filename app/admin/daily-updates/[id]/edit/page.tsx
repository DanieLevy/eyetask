'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Save,
  ChevronRight,
  Megaphone
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import ModernCheckbox from '@/components/ModernCheckbox';
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
  created_at: string;
  updated_at: string;
}

interface UpdateForm {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  durationType: 'hours' | 'days' | 'permanent';
  durationValue: number;
  isPinned: boolean;
}

export default function EditDailyUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const updateId = params.id as string;
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');
  
  const [update, setUpdate] = useState<DailyUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState<UpdateForm>({
    title: '',
    content: '',
    type: 'info',
    priority: 5,
    durationType: 'days',
    durationValue: 1,
    isPinned: false
  });

  useEffect(() => {
    fetchUpdate();
  }, [updateId]);

  const fetchUpdate = async () => {
    try {
      const response = await fetch(`/api/daily-updates/${updateId}`);
      const result = await response.json();
      
      if (result.success) {
        const updateData = result.update;
        setUpdate(updateData);
        setForm({
          title: updateData.title,
          content: updateData.content,
          type: updateData.type,
          priority: updateData.priority,
          durationType: updateData.duration_type,
          durationValue: updateData.duration_value || 24,
          isPinned: updateData.is_pinned
        });
      } else {
        toast.error('שגיאה בטעינת העדכון');
        router.push('/admin/daily-updates');
      }
    } catch (error) {
      console.error('Error fetching update:', error);
      toast.error('שגיאה בטעינת העדכון');
      router.push('/admin/daily-updates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/daily-updates/${updateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update daily update');
      }
      
      router.push('/admin/daily-updates');
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      toast.error('שגיאה בעדכון העדכון');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען עדכון...</p>
        </div>
      </div>
    );
  }

  if (!update) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">עדכון לא נמצא</h3>
          <Link 
            href="/admin/daily-updates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            חזור לעדכונים יומיים
          </Link>
        </div>
      </div>
    );
  }

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
                  <span>עריכת עדכון</span>
                </div>
                <h1 className={`text-lg font-bold text-foreground ${hebrewHeading.fontClass}`}>
                  ערוך עדכון יומי
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
                ערוך עדכון יומי
              </h2>
              <p className="text-sm text-muted-foreground mt-1">ערוך את העדכון "{update.title}"</p>
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
                        onChange={(e) => setForm({ ...form, type: e.target.value as any })}
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

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span className={mixedBody.fontClass}>
                    {submitting ? 'שומר שינויים...' : 'שמור שינויים'}
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