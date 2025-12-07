'use client';

import { useCallback, useState, useRef } from 'react';
import { useLoading, useActionLoading } from '@/contexts/LoadingContext';

/**
 * Smart loading hook that automatically manages loading states
 * with the global loading system. Provides convenient methods
 * for different types of operations.
 */
export function useSmartLoading() {
  const { startLoading, stopLoading, updateLoading } = useLoading();
  const loadingRef = useRef<Map<string, string>>(new Map());

  // Auto-generate unique loading IDs
  const generateId = useCallback((prefix: string = 'smart-loading') => {
    const id = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return id;
  }, []);

  // Wrapper for async operations with automatic loading management
  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      type?: 'action' | 'data' | 'page' | 'background';
      message?: string;
      id?: string;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<T> => {
    const {
      type = 'action',
      message = 'טוען...',
      id: customId,
      onProgress
    } = options;

    const id = customId || generateId(type);
    loadingRef.current.set(id, type);

    const priority = type === 'page' ? 'high' : type === 'background' ? 'low' : 'medium';

    startLoading(id, type, {
      priority,
      message
    });

    try {
      // If progress callback provided, update loading with progress
      if (onProgress) {
        const progressOperation = async () => {
          const result = await operation();
          onProgress(100);
          return result;
        };
        return await progressOperation();
      }

      return await operation();
    } catch (error) {
      throw error;
    } finally {
      stopLoading(id);
      loadingRef.current.delete(id);
    }
  }, [startLoading, stopLoading, generateId]);

  // Convenience method for button actions
  const withButtonLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    buttonMessage?: string
  ): Promise<T> => {
    return withLoading(operation, {
      type: 'action',
      message: buttonMessage || 'מעבד...'
    });
  }, [withLoading]);

  // Convenience method for data fetching
  const withDataLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    dataMessage?: string
  ): Promise<T> => {
    return withLoading(operation, {
      type: 'data',
      message: dataMessage || 'טוען נתונים...'
    });
  }, [withLoading]);

  // Convenience method for form submissions
  const withFormLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    formMessage?: string
  ): Promise<T> => {
    return withLoading(operation, {
      type: 'action',
      message: formMessage || 'שולח...'
    });
  }, [withLoading]);

  // Progress-aware loading
  const withProgressLoading = useCallback(async <T>(
    operation: (updateProgress: (progress: number) => void) => Promise<T>,
    options: {
      message?: string;
      type?: 'action' | 'data';
    } = {}
  ): Promise<T> => {
    const { message = 'מתבצע...', type = 'action' } = options;
    const id = generateId(`${type}-progress`);
    
    startLoading(id, type, {
      priority: 'medium',
      message
    });

    try {
      const updateProgress = (progress: number) => {
        updateLoading(id, { progress: Math.min(100, Math.max(0, progress)) });
      };

      return await operation(updateProgress);
    } finally {
      stopLoading(id);
    }
  }, [startLoading, stopLoading, updateLoading, generateId]);

  return {
    withLoading,
    withButtonLoading,
    withDataLoading,
    withFormLoading,
    withProgressLoading
  };
}

/**
 * Hook for managing button loading states specifically
 */
export function useButtonLoading() {
  const [loading, setLoading] = useState(false);
  const { withActionLoading } = useActionLoading();

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    if (loading) return Promise.reject(new Error('Operation already in progress'));
    
    setLoading(true);
    try {
      const id = `button-${Date.now()}`;
      return await withActionLoading(id, operation, message);
    } finally {
      setLoading(false);
    }
  }, [loading, withActionLoading]);

  return {
    loading,
    execute
  };
}

/**
 * Hook for managing form submission loading states
 */
export function useFormLoading() {
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { withActionLoading } = useActionLoading();

  const submit = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      message?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      validateFields?: () => Record<string, string>;
    } = {}
  ): Promise<T | null> => {
    const { message = 'שולח טופס...', onSuccess, onError, validateFields } = options;

    // Clear previous errors
    setErrors({});

    // Validate fields if validator provided
    if (validateFields) {
      const fieldErrors = validateFields();
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return null;
      }
    }

    if (submitting) return null;
    
    setSubmitting(true);
    try {
      const id = `form-${Date.now()}`;
      const result = await withActionLoading(id, operation, message);
      onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error as Error;
      onError?.(err);
      setErrors({ general: err.message });
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [submitting, withActionLoading]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    submitting,
    errors,
    submit,
    clearErrors
  };
}

/**
 * Hook for managing multi-step operations with progress
 */
export function useProgressLoading() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const { withLoading } = useSmartLoading();

  const executeSteps = useCallback(async <T>(
    steps: Array<{
      name: string;
      operation: () => Promise<T>;
      weight?: number; // Relative weight for progress calculation
    }>,
    options: {
      message?: string;
      onStepComplete?: (step: string, index: number, total: number) => void;
    } = {}
  ): Promise<T[]> => {
    const { message = 'מתבצע...', onStepComplete } = options;
    
    setProgress(0);
    setCurrentStep('');

    const totalWeight = steps.reduce((sum, step) => sum + (step.weight || 1), 0);
    let completedWeight = 0;

    const results: T[] = [];

    await withLoading(async () => {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setCurrentStep(step.name);
        
        const result = await step.operation();
        results.push(result);
        
        completedWeight += step.weight || 1;
        const newProgress = Math.round((completedWeight / totalWeight) * 100);
        setProgress(newProgress);
        
        onStepComplete?.(step.name, i, steps.length);
      }
      
      return results;
    }, {
      type: 'action',
      message: currentStep || message,
      onProgress: setProgress
    });

    setProgress(100);
    setCurrentStep('הושלם');

    return results;
  }, [withLoading, currentStep]);

  const reset = useCallback(() => {
    setProgress(0);
    setCurrentStep('');
  }, []);

  return {
    progress,
    currentStep,
    executeSteps,
    reset
  };
}

/**
 * Hook for managing retry logic with exponential backoff
 */
export function useRetryLoading() {
  const [attempts, setAttempts] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const { withLoading } = useSmartLoading();

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      backoffMs?: number;
      backoffMultiplier?: number;
      message?: string;
      onRetry?: (attempt: number, error: Error) => void;
    } = {}
  ): Promise<T> => {
    const {
      maxAttempts = 3,
      backoffMs = 1000,
      backoffMultiplier = 2,
      message = 'מנסה שוב...',
      onRetry
    } = options;

    let currentAttempt = 0;
    setAttempts(0);
    setLastError(null);

    while (currentAttempt < maxAttempts) {
      try {
        currentAttempt++;
        setAttempts(currentAttempt);

        const result = await withLoading(operation, {
          message: currentAttempt > 1 ? `${message} (ניסיון ${currentAttempt})` : message
        });

        // Success - reset state
        setAttempts(0);
        setLastError(null);
        return result;

      } catch (error) {
        const err = error as Error;
        setLastError(err);

        if (currentAttempt >= maxAttempts) {
          throw err;
        }

        onRetry?.(currentAttempt, err);

        // Wait before retry with exponential backoff
        const waitTime = backoffMs * Math.pow(backoffMultiplier, currentAttempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError || new Error('Max retry attempts exceeded');
  }, [withLoading, lastError]);

  return {
    attempts,
    lastError,
    executeWithRetry
  };
} 