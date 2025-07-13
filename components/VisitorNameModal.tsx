'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { User, X, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VisitorNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<boolean>;
  isSubmitting: boolean;
}

export function VisitorNameModal({ isOpen, onClose, onSubmit, isSubmitting }: VisitorNameModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const hebrewFont = useHebrewFont('heading');
  const mixedFont = useMixedFont('body');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError('השם חייב להכיל לפחות 2 תווים');
      return;
    }

    if (trimmedName.length > 50) {
      setError('השם לא יכול להכיל יותר מ-50 תווים');
      return;
    }

    const success = await onSubmit(trimmedName);
    if (!success) {
      setError('לא הצלחנו לשמור את השם שלך. אנא נסה שוב.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90vw] max-w-md"
          >
            <div className="bg-background rounded-lg shadow-2xl border border-border/50 p-6">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
              
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-50 animate-pulse" />
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3">
                    <User className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Title */}
              <h2 className={cn("text-center text-2xl font-bold mb-2", hebrewFont.fontClass)}>
                ברוך הבא! 👋
              </h2>
              
              {/* Description */}
              <p className={cn("text-center text-muted-foreground mb-6 text-sm", mixedFont.fontClass)}>
                אנא הכנס את שמך כדי שנוכל להתאים את החוויה שלך
              </p>
              
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="visitor-name" className={hebrewFont.fontClass}>
                    השם שלך
                  </Label>
                  <Input
                    id="visitor-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="לדוגמה: יוסי כהן"
                    className={cn("text-right", mixedFont.fontClass)}
                    dir="rtl"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive" className="text-sm">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Privacy notice */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <p className={mixedFont.fontClass}>
                    המידע שלך נשמר באופן מאובטח ומשמש רק לשיפור החוויה שלך באתר
                  </p>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-3 pt-2" dir="rtl">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'שומר...' : 'המשך'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    אולי אחר כך
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 