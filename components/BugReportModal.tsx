'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
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
      // Prepare the bug report data
      const reportData = {
        description,
        email: email || undefined,
        severity,
        pageContext,
        timestamp: new Date().toISOString()
      };
      
      // Submit to API endpoint
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'bug',
          subject: `Bug: ${pageContext.title}`,
          description: JSON.stringify(reportData, null, 2),
          email: email || undefined,
          priority: severity === 'high' ? 'urgent' : severity === 'medium' ? 'normal' : 'low',
          sourceUrl: pageContext.url,
          metadata: {
            userAgent: pageContext.userAgent,
            pageType: pageContext.pageType,
            relatedId: pageContext.relatedId,
          }
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
  
  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card relative max-w-md w-full rounded-lg shadow-lg p-6 mx-auto">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-accent"
          aria-label="סגור"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-4 text-right">דיווח על בעיה</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block mb-1 font-medium">דרגת חומרה:</label>
            <div className="flex gap-4 justify-end">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="severity"
                  value="low"
                  checked={severity === 'low'}
                  onChange={() => setSeverity('low')}
                  className="ml-1.5"
                />
                <span>נמוכה</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="severity"
                  value="medium"
                  checked={severity === 'medium'}
                  onChange={() => setSeverity('medium')}
                  className="ml-1.5"
                />
                <span>בינונית</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="severity"
                  value="high"
                  checked={severity === 'high'}
                  onChange={() => setSeverity('high')}
                  className="ml-1.5"
                />
                <span>גבוהה</span>
              </label>
            </div>
          </div>
          
          <div>
            <label htmlFor="bug-description" className="block mb-1 font-medium">תיאור הבעיה:</label>
            <textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-md bg-background min-h-[100px] text-right"
              placeholder="תאר את הבעיה בפירוט..."
              dir="rtl"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">דוא״ל לתשובה (אופציונלי):</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-md bg-background text-right"
              placeholder="your@email.com"
              dir="ltr"
            />
          </div>
          
          <div className="border-t pt-4 flex justify-between">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 bg-primary text-primary-foreground rounded-md ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
              }`}
            >
              {isSubmitting ? 'שולח...' : 'שלח דיווח'}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
            >
              ביטול
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-xs text-muted-foreground text-right">
          <p>
            מידע טכני שיישלח: סוג הדף, כתובת URL, דפדפן, מועד הדיווח.
            {pageContext.relatedId && ` מזהה קשור: ${pageContext.relatedId}.`}
          </p>
        </div>
      </div>
    </div>
  );
} 