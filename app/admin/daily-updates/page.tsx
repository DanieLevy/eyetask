'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Bell,
  Pin,
  PinOff,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { usePageRefresh } from '@/hooks/usePageRefresh';

interface DailyUpdate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  duration_type: 'hours' | 'days' | 'permanent';
  duration_value: number | null;
  expires_at: string | null;
  is_active: boolean;
  is_pinned: boolean;
  target_audience: any[];
  created_at: string;
  updated_at: string;
}

interface UpdateForm {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  duration_type: 'hours' | 'days' | 'permanent';
  duration_value: number;
  is_pinned: boolean;
}

const initialForm: UpdateForm = {
  title: '',
  content: '',
  type: 'info',
  priority: 5,
  duration_type: 'hours',
  duration_value: 24,
  is_pinned: false
};

export default function DailyUpdatesAdmin() {
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  
  // Settings state
  const [fallbackMessage, setFallbackMessage] = useState<string>('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  const fetchUpdates = useCallback(async () => {
    try {
      const [updatesResponse, settingsResponse] = await Promise.all([
        fetch('/api/daily-updates', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }),
        fetch('/api/daily-updates/settings/fallback_message', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
      ]);
      
      if (updatesResponse.ok) {
        const data = await updatesResponse.json();
        setUpdates(data.updates || []);
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success && settingsData.value) {
          setFallbackMessage(settingsData.value);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching daily updates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Register refresh function for pull-to-refresh
  usePageRefresh(fetchUpdates);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const openCreateForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setFormVisible(true);
  };

  const openEditForm = (update: DailyUpdate) => {
    setForm({
      title: update.title,
      content: update.content,
      type: update.type,
      priority: update.priority,
      duration_type: update.duration_type,
      duration_value: update.duration_value || 24,
      is_pinned: update.is_pinned
    });
    setEditingId(update.id);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        // Update existing
        const response = await fetch(`/api/daily-updates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        
        if (!response.ok) {
          throw new Error('Failed to update daily update');
        }
      } else {
        // Create new
        const response = await fetch('/api/daily-updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        
        if (!response.ok) {
          throw new Error('Failed to create daily update');
        }
      }
      
      closeForm();
      fetchUpdates();
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      alert('שגיאה בשמירת העדכון');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      const response = await fetch(`/api/daily-updates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !currentPinned })
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle pin');
      }
      
      fetchUpdates();
    } catch (error) {
      console.error('❌ Error toggling pin:', error);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/daily-updates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle active');
      }
      
      fetchUpdates();
    } catch (error) {
      console.error('❌ Error toggling active:', error);
    }
  };

  const deleteUpdate = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק עדכון זה?')) {
      return;
    }

    try {
      const response = await fetch(`/api/daily-updates/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete daily update');
      }
      
      fetchUpdates();
    } catch (error) {
      console.error('❌ Error deleting update:', error);
      alert('שגיאה במחיקת העדכון');
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'announcement':
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 'קבוע';
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'פג תוקף';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ימים`;
    } else if (hours > 0) {
      return `${hours} שעות`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} דקות`;
    }
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSubmitting(true);

    try {
      const response = await fetch('/api/daily-updates/settings/fallback_message', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: fallbackMessage })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update fallback message');
      }
      
      setSettingsVisible(false);
      alert('הודעת ברירת המחדל עודכנה בהצלחה');
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      alert('שגיאה בעדכון הודעת ברירת המחדל');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען עדכונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <h1 className={`text-2xl font-bold text-foreground ${hebrewHeading.fontClass}`}>
                ניהול עדכונים יומיים
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsVisible(true)}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className={mixedBody.fontClass}>הגדרות</span>
              </button>
              <button
                onClick={openCreateForm}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className={mixedBody.fontClass}>עדכון חדש</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Settings Modal */}
        {settingsVisible && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${hebrewHeading.fontClass}`}>
                  הגדרות עדכונים יומיים
                </h2>
                <button
                  onClick={() => setSettingsVisible(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSettings} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${mixedBody.fontClass}`}>
                    הודעת ברירת מחדל
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    הודעה זו תוצג כאשר אין עדכונים יומיים פעילים
                  </p>
                  <input
                    type="text"
                    value={fallbackMessage}
                    onChange={(e) => setFallbackMessage(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-right"
                    required
                    dir="rtl"
                    placeholder="המשך יום טוב"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={settingsSubmitting}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {settingsSubmitting ? 'שומר...' : 'שמור הגדרות'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsVisible(false)}
                    disabled={settingsSubmitting}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {formVisible && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${hebrewHeading.fontClass}`}>
                  {editingId ? 'עריכת עדכון' : 'עדכון חדש'}
                </h2>
                <button
                  onClick={closeForm}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  />
                </div>

                {/* Type and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${mixedBody.fontClass}`}>
                      סוג
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      className="w-full border border-border rounded-lg px-3 py-2"
                    >
                      <option value="info">מידע</option>
                      <option value="announcement">הודעה</option>
                      <option value="warning">אזהרה</option>
                      <option value="success">הצלחה</option>
                      <option value="error">שגיאה</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${mixedBody.fontClass}`}>
                      עדיפות (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                      className="w-full border border-border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${mixedBody.fontClass}`}>
                      סוג משך
                    </label>
                    <select
                      value={form.duration_type}
                      onChange={(e) => setForm({ ...form, duration_type: e.target.value as any })}
                      className="w-full border border-border rounded-lg px-3 py-2"
                    >
                      <option value="hours">שעות</option>
                      <option value="days">ימים</option>
                      <option value="permanent">קבוע</option>
                    </select>
                  </div>

                  {form.duration_type !== 'permanent' && (
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${mixedBody.fontClass}`}>
                        {form.duration_type === 'hours' ? 'מספר שעות' : 'מספר ימים'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.duration_value}
                        onChange={(e) => setForm({ ...form, duration_value: parseInt(e.target.value) })}
                        className="w-full border border-border rounded-lg px-3 py-2"
                      />
                    </div>
                  )}
                </div>

                {/* Pin checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={form.is_pinned}
                    onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                    className="w-4 h-4"
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
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span className={mixedBody.fontClass}>
                      {submitting ? 'שומר...' : 'שמור'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="bg-muted text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <span className={mixedBody.fontClass}>ביטול</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Updates List */}
        <div className="space-y-4">
          {updates.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">אין עדכונים יומיים</h3>
              <p className="text-muted-foreground mb-4">צור את העדכון היומי הראשון</p>
              <button
                onClick={openCreateForm}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                צור עדכון חדש
              </button>
            </div>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getUpdateIcon(update.type)}
                      <h3 className={`text-lg font-semibold ${hebrewHeading.fontClass}`}>
                        {update.title}
                      </h3>
                      {update.is_pinned && (
                        <Pin className="h-4 w-4 text-orange-500" />
                      )}
                      {!update.is_active && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                          לא פעיל
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-muted-foreground mb-3 ${mixedBody.fontClass}`}>
                      {update.content}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        נותר: {formatTimeRemaining(update.expires_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        עדיפות: {update.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePin(update.id, update.is_pinned)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title={update.is_pinned ? 'בטל הצמדה' : 'הצמד'}
                    >
                      {update.is_pinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => toggleActive(update.id, update.is_active)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title={update.is_active ? 'הסתר' : 'הצג'}
                    >
                      {update.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => openEditForm(update)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="ערוך"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => deleteUpdate(update.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="מחק"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
} 