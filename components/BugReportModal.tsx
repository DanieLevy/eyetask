'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Bug, Send, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext?: {
    url: string;
    pathname: string;
    title: string;
    pageType: 'task' | 'project' | 'admin' | 'feedback' | 'home' | 'other';
    relatedId?: string;
    relatedTitle?: string;
  };
}

export default function BugReportModal({ isOpen, onClose, pageContext }: BugReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    title: '',
    description: '',
    isUrgent: false
  });

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-fill form when pageContext changes
  useEffect(() => {
    if (pageContext) {
      let autoTitle = '';
      let autoDescription = `דיווח בעיה בעמוד: ${pageContext.url}\n\nתיאור הבעיה:\n`;

      if (pageContext.pageType === 'task' || pageContext.pageType === 'project') {
        autoTitle = `בעיה ב${pageContext.pageType === 'task' ? 'משימה' : 'פרויקט'}: ${pageContext.relatedTitle || 'לא ידוע'}`;
      } else if (pageContext.pageType === 'admin') {
        autoTitle = `בעיה בפאנל ניהול`;
      } else {
        autoTitle = `בעיה בעמוד: ${pageContext.title}`;
      }

      setFormData(prev => ({
        ...prev,
        title: autoTitle,
        description: autoDescription
      }));
    }
  }, [pageContext]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userName.trim() || !formData.title.trim() || !formData.description.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: formData.userName.trim(),
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: getCategory(),
          issueType: 'bug',
          isUrgent: formData.isUrgent,
          relatedTo: getRelatedTo()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success message briefly then close
        alert(`דיווח נשלח בהצלחה!\nמספר הטיקט: ${result.ticketNumber}`);
        
        // Reset form and close modal
        setFormData({
          userName: '',
          title: '',
          description: '',
          isUrgent: false
        });
        onClose();
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      alert('שגיאה בשליחת הדיווח. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategory = () => {
    if (!pageContext) return 'general_support';
    
    switch (pageContext.pageType) {
      case 'task': return 'task_related';
      case 'project': return 'project_related';
      case 'admin': return 'technical_issue';
      default: return 'general_support';
    }
  };

  const getRelatedTo = () => {
    if (!pageContext || !pageContext.relatedId) return undefined;
    
    return {
      type: pageContext.pageType === 'task' ? 'task' : 
            pageContext.pageType === 'project' ? 'project' : undefined,
      id: pageContext.relatedId,
      title: pageContext.relatedTitle
    };
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold">דיווח בעיה מהיר</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              שם מלא <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.userName}
              onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
              className="w-full p-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="הכנס את שמך המלא"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">
              כותרת הבעיה <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="תיאור קצר של הבעיה"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              תיאור הבעיה <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="פרט את הבעיה שאתה חווה..."
              rows={4}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Urgent checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="urgent"
              checked={formData.isUrgent}
              onChange={(e) => setFormData(prev => ({ ...prev, isUrgent: e.target.checked }))}
              className="rounded border border-border"
              disabled={isSubmitting}
            />
            <label htmlFor="urgent" className="text-sm flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              בעיה דחופה
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
              disabled={isSubmitting}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.userName.trim() || !formData.title.trim() || !formData.description.trim()}
              className="flex-1 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  שלח דיווח
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 