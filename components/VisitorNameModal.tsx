'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { HeaderLogo } from '@/components/unified-header/HeaderLogo';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';

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

  // Additional guard to prevent modal from showing if already shown
  useEffect(() => {
    if (isOpen) {
      const modalShown = localStorage.getItem('eyetask_visitor_modal_shown') === 'true';
      if (modalShown) {
        logger.warn('[VisitorNameModal] Modal already shown, closing immediately', 'VISITOR_MODAL');
        onClose();
      }
    }
  }, [isOpen, onClose]);

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
          {/* Backdrop - no close on click since input is mandatory */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90vw] max-w-sm"
          >
            <div className="bg-background rounded-xl shadow-2xl border border-border/50 p-8">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <HeaderLogo condensed />
              </div>
              
              {/* Title */}
              <h2 className={cn("text-center text-2xl font-bold mb-3", hebrewFont.fontClass)}>
                ברוך הבא! 👋
              </h2>
              
              {/* Description */}
              <p className={cn("text-center text-muted-foreground mb-8 text-sm", mixedFont.fontClass)}>
                אנא הכנס את שמך כדי להמשיך
              </p>
              
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="visitor-name" className={cn("text-sm", hebrewFont.fontClass)}>
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
                
                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? 'שומר...' : 'המשך'}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 