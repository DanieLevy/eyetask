'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { InputField, TextareaField, SelectField, CheckboxField } from '@/components/FormComponents';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

const hebrewHeading = {
  fontClass: 'font-heading',
};

const mixedBody = {
  fontClass: 'font-body',
};

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

export default function EditDailyUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [update, setUpdate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
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
    // Check authentication
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }

    async function fetchProjects() {
      try {
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
    }

    async function fetchUpdate() {
      setLoading(true);
      try {
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
        setUpdate(data.update);

        // Set form data from update
        const expireDate = data.update.expiresAt ? new Date(data.update.expiresAt) : null;
        const createdDate = new Date(data.update.createdAt);
        const diffHours = expireDate ? 
          Math.round((expireDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60)) : 0;
        const diffDays = diffHours / 24;

        let durationType: 'hours' | 'days' | 'permanent' = 'days';
        let durationValue = 1;

        if (!expireDate) {
          durationType = 'permanent';
        } else if (diffHours < 24) {
          durationType = 'hours';
          durationValue = diffHours;
        } else {
          durationType = 'days';
          durationValue = Math.round(diffDays);
        }

        setForm({
          title: data.update.title,
          content: data.update.content,
          type: data.update.type || 'info',
          priority: data.update.priority || 5,
          durationType,
          durationValue,
          isPinned: data.update.isPinned || false,
          projectId: data.update.projectId || 'general',
          isGeneral: data.update.isGeneral !== false
        });

      } catch (error) {
        console.error('Error fetching update:', error);
        toast.error('שגיאה בטעינת העדכון');
      } finally {
        setLoading(false);
      }
    }

    fetchUpdate();
    fetchProjects();
  }, [id, router]);

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
    setSaving(true);

    try {
      const token = localStorage.getItem('adminToken');
      
      // Calculate expiration date
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
        title: form.title,
        content: form.content,
        type: form.type,
        priority: form.priority,
        isPinned: form.isPinned,
        projectId: form.projectId === 'general' ? null : form.projectId,
        isGeneral: form.isGeneral,
        expiresAt
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
        throw new Error('Failed to update daily update');
      }

      toast.success('העדכון היומי נשמר בהצלחה');
      router.push('/admin/daily-updates');
    } catch (error) {
      console.error('Error updating daily update:', error);
      toast.error('שגיאה בשמירת העדכון');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const createdAtDate = update ? new Date(update.createdAt) : new Date();
  const timeAgo = formatDistanceToNow(createdAtDate, { addSuffix: true, locale: he });

  return (
    <div className="min-h-screen bg-background pb-8" dir="rtl">
      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold mb-1 ${hebrewHeading.fontClass}`}>
                  עריכת עדכון יומי
                </h1>
                <p className="text-sm text-muted-foreground">
                  {update?.title} • נוצר {timeAgo}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <InputField
                label="כותרת"
                htmlFor="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="הזן כותרת לעדכון"
                dir="rtl"
              />

              <TextareaField
                label="תוכן"
                htmlFor="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={5}
                required
                placeholder="הזן את תוכן העדכון"
                dir="rtl"
              />

              {/* Project Assignment */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${mixedBody.fontClass}`}>
                  הצגה *
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="edit-general"
                      name="editProjectAssignment"
                      checked={form.projectId === 'general'}
                      onChange={() => handleProjectChange('general')}
                      className="text-primary"
                    />
                    <label htmlFor="edit-general" className={`text-sm ${mixedBody.fontClass}`}>
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
                              id={`edit-project-${project._id}`}
                              name="editProjectAssignment"
                              checked={form.projectId === project._id}
                              onChange={() => handleProjectChange(project._id)}
                              className="text-primary"
                            />
                            <label 
                              htmlFor={`edit-project-${project._id}`} 
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

              <SelectField
                label="סוג העדכון"
                htmlFor="type"
                value={form.type}
                onChange={(value) => setForm({ ...form, type: value as any })}
                options={[
                  { value: 'info', label: 'מידע' },
                  { value: 'warning', label: 'אזהרה' },
                  { value: 'success', label: 'הצלחה' },
                  { value: 'error', label: 'שגיאה' },
                  { value: 'announcement', label: 'הכרזה' }
                ]}
              />

              <InputField
                label="עדיפות (1 = גבוהה, 10 = נמוכה)"
                htmlFor="priority"
                type="number"
                min={1}
                max={10}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 5 })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                  label="משך הצגה"
                  htmlFor="durationType"
                  value={form.durationType}
                  onChange={(value) => setForm({ ...form, durationType: value as any })}
                  options={[
                    { value: 'hours', label: 'שעות' },
                    { value: 'days', label: 'ימים' },
                    { value: 'permanent', label: 'קבוע' }
                  ]}
                />
                
                {form.durationType !== 'permanent' && (
                  <InputField
                    label={`מספר ${form.durationType === 'hours' ? 'שעות' : 'ימים'}`}
                    htmlFor="durationValue"
                    type="number"
                    min={1}
                    value={form.durationValue}
                    onChange={(e) => setForm({ ...form, durationValue: parseInt(e.target.value) || 1 })}
                    placeholder={`הזן מספר ${form.durationType === 'hours' ? 'שעות' : 'ימים'}`}
                  />
                )}
              </div>
              
              <CheckboxField
                id="isPinned"
                label="נעוץ בראש הרשימה"
                checked={form.isPinned}
                onCheckedChange={(checked) => setForm({ ...form, isPinned: checked })}
              />

              <div className="pt-6 flex gap-4 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/admin/daily-updates')}
                  disabled={saving}
                >
                  ביטול
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  שמור עדכון
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 