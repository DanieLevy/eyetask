export type MessageType = 'info' | 'warning' | 'success' | 'error' | 'announcement' | 'notification';

/**
 * Get background style that bypasses global CSS conflicts
 * Uses inline styles with proper RGBA gradients for reliable theming
 */
export function getThemeSafeBackgroundStyle(type: MessageType): string {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  switch (type) {
    case 'warning':
      return isDark 
        ? 'linear-gradient(to right, rgba(217, 119, 6, 0.2), rgba(194, 65, 12, 0.2))'
        : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(254, 252, 232, 0.8))';
    
    case 'error':
      return isDark 
        ? 'linear-gradient(to right, rgba(185, 28, 28, 0.2), rgba(190, 18, 60, 0.2))'
        : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.8))';
    
    case 'success':
      return isDark 
        ? 'linear-gradient(to right, rgba(21, 128, 61, 0.2), rgba(22, 101, 52, 0.2))'
        : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(240, 253, 244, 0.8))';
    
    case 'announcement':
    case 'notification':
    case 'info':
      return isDark 
        ? 'linear-gradient(to right, rgba(30, 64, 175, 0.2), rgba(67, 56, 202, 0.2))'
        : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(239, 246, 255, 0.8))';
    
    default:
      return isDark 
        ? 'linear-gradient(to right, rgba(30, 41, 59, 0.3), rgba(55, 65, 81, 0.3))'
        : 'linear-gradient(to right, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.9))';
  }
}

/**
 * Get border and text classes that work properly with dark mode
 * Avoids conflicting patterns that are overridden by global CSS
 */
export function getThemeSafeBorderAndTextClasses(type: MessageType): string {
  switch (type) {
    case 'warning':
      return 'border-amber-300/60 dark:border-amber-600/60 text-amber-800 dark:text-amber-100';
    
    case 'error':
      return 'border-red-300/60 dark:border-red-600/60 text-red-800 dark:text-red-100';
    
    case 'success':
      return 'border-emerald-300/60 dark:border-emerald-600/60 text-emerald-800 dark:text-emerald-100';
    
    case 'announcement':
    case 'notification':
    case 'info':
      return 'border-blue-300/60 dark:border-blue-600/60 text-blue-800 dark:text-blue-100';
    
    default:
      return 'border-slate-300/60 dark:border-slate-600/60 text-slate-800 dark:text-slate-100';
  }
}

/**
 * Get icon color classes for message types
 */
export function getThemeSafeIconClasses(type: MessageType): string {
  switch (type) {
    case 'warning':
      return 'text-amber-600 dark:text-amber-300';
    
    case 'error':
      return 'text-red-600 dark:text-red-300';
    
    case 'success':
      return 'text-emerald-600 dark:text-emerald-300';
    
    case 'announcement':
    case 'notification':
    case 'info':
      return 'text-blue-600 dark:text-blue-300';
    
    default:
      return 'text-slate-600 dark:text-slate-300';
  }
}

/**
 * Complete theme-safe styling object for message components
 */
export function getThemeSafeMessageStyles(type: MessageType) {
  return {
    background: getThemeSafeBackgroundStyle(type),
    borderAndTextClasses: getThemeSafeBorderAndTextClasses(type),
    iconClasses: getThemeSafeIconClasses(type)
  };
}

/**
 * Priority-based color styling (for task priorities)
 */
export function getThemeSafePriorityStyles(priority: number) {
  if (priority >= 1 && priority <= 3) {
    return getThemeSafeMessageStyles('error');
  } else if (priority >= 4 && priority <= 6) {
    return getThemeSafeMessageStyles('warning');
  } else if (priority >= 7 && priority <= 10) {
    return getThemeSafeMessageStyles('success');
  }
  return getThemeSafeMessageStyles('info');
} 