'use client';

import { X, Bug } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface PageContext {
  url: string;
  pathname: string;
  title: string;
  pageType: 'task' | 'project' | 'admin' | 'feedback' | 'home' | 'other';
  relatedId?: string;
  relatedTitle?: string;
  userAgent: string;
  timestamp: string;
}

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext: PageContext;
}

export default function BugReportModal({ isOpen, onClose, pageContext }: BugReportModalProps) {
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Reset form when reopened
    if (isOpen) {
      setDescription('');
      setSeverity('medium');
      setIsSubmitting(false);
    }
  }, [isOpen]);
  
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (!mounted) return;
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast.error('יש למלא תיאור הבעיה');
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
          userName: 'Anonymous User', // Default for bug reports
          userEmail: email || undefined,
          title: `Bug: ${pageContext.title}`,
          description: `${description}\n\n--- Technical Details ---\nPage: ${pageContext.url}\nPage Type: ${pageContext.pageType}\nUser Agent: ${pageContext.userAgent}\nTimestamp: ${new Date().toISOString()}${pageContext.relatedId ? `\nRelated ID: ${pageContext.relatedId}` : ''}`,
          category: 'bug_report',
          issueType: 'bug',
          isUrgent: severity === 'high',
          relatedTo: pageContext.relatedId ? {
            type: pageContext.pageType === 'task' ? 'task' : pageContext.pageType === 'project' ? 'project' : 'task',
            id: pageContext.relatedId
          } : undefined
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit bug report');
      }
      
      toast.success('תודה! הדיווח נשלח בהצלחה');
      onClose();
    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast.error('שגיאה בשליחת הדיווח. נסה שוב מאוחר יותר.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 pt-8 sm:pt-4 overflow-y-auto"
      style={{ zIndex: 2147483647 }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-auto my-4 sm:my-0 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Bug className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">דיווח על בעיה</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="סגור"
          >
            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        
        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                דרגת חומרה:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'low', label: 'נמוכה', color: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' },
                  { value: 'medium', label: 'בינונית', color: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300' },
                  { value: 'high', label: 'גבוהה', color: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' }
                ].map(({ value, label, color }) => (
                  <label
                    key={value}
                    className={`
                      relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium
                      ${severity === value 
                        ? color
                        : 'border-border hover:border-muted-foreground bg-background text-foreground'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={value}
                      checked={severity === value}
                      onChange={() => setSeverity(value as 'low' | 'medium' | 'high')}
                      className="sr-only"
                    />
                    {label}
                    {severity === value && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-current opacity-60" />
                    )}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="bug-description" className="block text-sm font-medium text-foreground mb-2">
                תיאור הבעיה: <span className="text-destructive">*</span>
              </label>
              <textarea
                id="bug-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="תאר את הבעיה בפירוט..."
                rows={4}
                dir="rtl"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                ככל שתספק יותר פרטים, כך נוכל לעזור לך טוב יותר
              </p>
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                דוא״ל לתשובה (אופציונלי):
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your@email.com"
                dir="ltr"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    שולח...
                  </span>
                ) : (
                  'שלח דיווח'
                )}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 border border-input bg-background text-foreground rounded-lg font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
          
          {/* Footer Info */}
          <div className="mt-6 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>מידע שיישלח:</strong> תיאור הבעיה, דרגת חומרה, כתובת הדף הנוכחי ({pageContext.pathname}), 
              סוג הדפדפן, ומועד הדיווח.{pageContext.relatedId && ` מזהה קשור: ${pageContext.relatedId}.`}
              {email && ' התשובה תישלח לכתובת המייל שצוינה.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render outside normal DOM flow
  return createPortal(modalContent, document.body);
} 