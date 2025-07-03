'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface PushNotificationNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}

export default function PushNotificationNameModal({ isOpen, onClose, onConfirm }: PushNotificationNameModalProps) {
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Reset form when reopened
    if (isOpen) {
      setUserName('');
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
    
    if (!userName.trim()) {
      toast.error('אנא הכנס את שמך');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onConfirm(userName.trim());
      onClose();
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('שגיאה בהרשמה להתראות');
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, isSubmitting]);
  
  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      style={{ zIndex: 2147483647 }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">הרשמה להתראות</h2>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            aria-label="סגור"
          >
            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        
        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                אנא הכנס את שמך כדי שנוכל לשלוח לך התראות מותאמות אישית
              </p>
              
              <label htmlFor="push-name" className="block text-sm font-medium text-foreground mb-2">
                שם <span className="text-destructive">*</span>
              </label>
              <input
                id="push-name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="הכנס את שמך"
                dir="rtl"
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !userName.trim()}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    מרשם...
                  </span>
                ) : (
                  'הרשמה'
                )}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-3 border border-input bg-background text-foreground rounded-lg font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render outside normal DOM flow
  return createPortal(modalContent, document.body);
} 