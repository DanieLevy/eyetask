'use client';

import { Loader2, AlertCircle, RefreshCw, Zap, Clock, CheckCircle2, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLoading, LoadingPriority } from '@/contexts/LoadingContext';
import { useHebrewFont } from '@/hooks/useFont';

// Loading animation variants
type AnimationType = 'spin' | 'pulse' | 'bounce' | 'slide' | 'fade' | 'shimmer';

// Base loading indicator props
interface BaseLoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animation?: AnimationType;
  showText?: boolean;
  text?: string;
  className?: string;
}

// Size mappings
const SIZE_CLASSES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const TEXT_SIZE_CLASSES = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
};

// Basic loading spinner
export const LoadingSpinner: React.FC<BaseLoadingProps> = ({
  size = 'md',
  animation = 'spin',
  showText = false,
  text = 'טוען...',
  className = ''
}) => {
  const hebrewFont = useHebrewFont('body');
  
  const getAnimationClass = () => {
    switch (animation) {
      case 'spin': return 'animate-spin';
      case 'pulse': return 'animate-pulse';
      case 'bounce': return 'animate-bounce';
      default: return 'animate-spin';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`${SIZE_CLASSES[size]} ${getAnimationClass()} text-primary`} />
      {showText && (
        <span className={`${TEXT_SIZE_CLASSES[size]} text-muted-foreground ${hebrewFont.fontClass}`}>
          {text}
        </span>
      )}
    </div>
  );
};

// Progress bar with loading state
export const LoadingProgressBar: React.FC<{
  progress?: number | null;
  message?: string;
  showPercentage?: boolean;
  className?: string;
}> = ({ progress, message, showPercentage = true, className = '' }) => {
  const hebrewFont = useHebrewFont('body');
  const displayProgress = progress ?? 0;
  const isIndeterminate = progress === null || progress === undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      {message && (
        <div className={`text-sm text-muted-foreground ${hebrewFont.fontClass}`}>
          {message}
        </div>
      )}
      <div className="relative w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isIndeterminate 
              ? 'bg-primary/60 animate-pulse' 
              : 'bg-primary'
          }`}
          style={{
            width: isIndeterminate ? '100%' : `${Math.min(100, Math.max(0, displayProgress))}%`,
            backgroundImage: isIndeterminate 
              ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)'
              : undefined,
            backgroundSize: isIndeterminate ? '200% 100%' : undefined,
            animation: isIndeterminate ? 'shimmer 2s infinite linear' : undefined
          }}
        />
      </div>
      {showPercentage && !isIndeterminate && (
        <div className={`text-xs text-muted-foreground text-right ${hebrewFont.fontClass}`}>
          {Math.round(displayProgress)}%
        </div>
      )}
    </div>
  );
};

// Full page loading overlay
export const LoadingOverlay: React.FC<{
  show: boolean;
  message?: string;
  progress?: number | null;
  canCancel?: boolean;
  onCancel?: () => void;
  priority?: LoadingPriority;
  className?: string;
}> = ({ 
  show, 
  message, 
  progress, 
  canCancel = false, 
  onCancel, 
  priority = 'medium',
  className = '' 
}) => {
  const hebrewFont = useHebrewFont('body');
  const [showDelayed, setShowDelayed] = useState(false);

  // Delay showing overlay to prevent flashing on quick operations
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (show) {
      timeout = setTimeout(() => setShowDelayed(true), 150);
    } else {
      setShowDelayed(false);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [show]);

  if (!show || !showDelayed) {
    return null;
  }

  const getPriorityColor = () => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-700';
      case 'high': return 'bg-orange-500/10 text-orange-700';
      case 'medium': return 'bg-blue-500/10 text-blue-700';
      case 'low': return 'bg-gray-500/10 text-gray-700';
      default: return 'bg-blue-500/10 text-blue-700';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div className={`bg-background border border-border rounded-lg p-6 shadow-lg max-w-sm w-full mx-4 ${getPriorityColor()}`}>
        <div className="text-center space-y-4">
          {/* Loading Icon */}
          <div className="flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
          
          {/* Message */}
          {message && (
            <div className={`text-sm font-medium ${hebrewFont.fontClass}`}>
              {message}
            </div>
          )}
          
          {/* Progress Bar */}
          {progress !== undefined && (
            <LoadingProgressBar progress={progress} showPercentage={true} />
          )}
          
          {/* Cancel Button */}
          {canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              ביטול
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Inline loading state for components
export const InlineLoading: React.FC<{
  loading: boolean;
  error?: Error | null;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  errorFallback?: React.ReactNode;
  loadingText?: string;
  minHeight?: string;
  className?: string;
}> = ({ 
  loading, 
  error, 
  children, 
  skeleton, 
  errorFallback, 
  loadingText = 'טוען...', 
  minHeight = 'auto',
  className = '' 
}) => {
  const hebrewFont = useHebrewFont('body');

  if (error && errorFallback) {
    return <div className={className}>{errorFallback}</div>;
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 text-destructive ${className}`} style={{ minHeight }}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <div className={`text-sm ${hebrewFont.fontClass}`}>
            {error.message || 'אירעה שגיאה'}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    if (skeleton) {
      return <div className={className}>{skeleton}</div>;
    }

    return (
      <div className={`flex items-center justify-center p-4 ${className}`} style={{ minHeight }}>
        <LoadingSpinner showText text={loadingText} />
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};

// Button with loading state
export const LoadingButton: React.FC<{
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({
  loading = false,
  disabled = false,
  children,
  loadingText,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const hebrewFont = useHebrewFont('body');
  const isDisabled = disabled || loading;

  const getVariantClasses = () => {
    const base = 'font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2';
    
    switch (variant) {
      case 'primary':
        return `${base} bg-primary text-primary-foreground hover:bg-primary/90 ${isDisabled ? 'opacity-50' : ''}`;
      case 'secondary':
        return `${base} bg-secondary text-secondary-foreground hover:bg-secondary/80 ${isDisabled ? 'opacity-50' : ''}`;
      case 'outline':
        return `${base} border border-input bg-background hover:bg-accent hover:text-accent-foreground ${isDisabled ? 'opacity-50' : ''}`;
      case 'ghost':
        return `${base} hover:bg-accent hover:text-accent-foreground ${isDisabled ? 'opacity-50' : ''}`;
      case 'destructive':
        return `${base} bg-destructive text-destructive-foreground hover:bg-destructive/90 ${isDisabled ? 'opacity-50' : ''}`;
      default:
        return base;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'px-3 py-1.5 text-sm';
      case 'md': return 'px-4 py-2 text-sm';
      case 'lg': return 'px-6 py-3 text-base';
      default: return 'px-4 py-2 text-sm';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${getVariantClasses()} ${getSizeClasses()} ${hebrewFont.fontClass} ${className}`}
    >
      {loading && <LoadingSpinner size={size === 'sm' ? 'xs' : 'sm'} />}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
};

// Global loading indicator that shows based on loading context
export const GlobalLoadingIndicator: React.FC<{
  position?: 'top' | 'bottom' | 'top-right' | 'top-left';
  showProgress?: boolean;
  className?: string;
}> = ({ position = 'top', showProgress = true, className = '' }) => {
  const { isLoading, getCurrentLoadingMessage, getLoadingProgress, getHighestPriorityLoading } = useLoading();
  const hebrewFont = useHebrewFont('body');
  
  const hasActiveLoading = isLoading();
  const message = getCurrentLoadingMessage();
  const progress = getLoadingProgress();
  const highestPriority = getHighestPriorityLoading();

  const [visible, setVisible] = useState(false);

  // Debounce visibility to prevent flashing
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (hasActiveLoading) {
      timeout = setTimeout(() => setVisible(true), 100);
    } else {
      setVisible(false);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [hasActiveLoading]);

  if (!visible || !highestPriority) {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top': return 'top-0 left-0 right-0';
      case 'bottom': return 'bottom-0 left-0 right-0';
      case 'top-right': return 'top-4 right-4';
      case 'top-left': return 'top-4 left-4';
      default: return 'top-0 left-0 right-0';
    }
  };

  const getPriorityIcon = () => {
    switch (highestPriority.priority) {
      case 'critical': return <Zap className="w-4 h-4 text-red-500" />;
      case 'high': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'medium': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'low': return <RefreshCw className="w-4 h-4 text-gray-500 animate-spin" />;
      default: return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div 
      className={`fixed z-40 ${getPositionClasses()} ${className}`}
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      <div className="bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="px-4 py-2 flex items-center gap-3">
          {getPriorityIcon()}
          
          <div className="flex-1 min-w-0">
            {message && (
              <div className={`text-sm font-medium truncate ${hebrewFont.fontClass}`}>
                {message}
              </div>
            )}
            
            {showProgress && progress !== null && (
              <div className="mt-1">
                <LoadingProgressBar 
                  progress={progress} 
                  showPercentage={false}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Status indicator for different states
export const StatusIndicator: React.FC<{
  status: 'loading' | 'success' | 'error' | 'warning';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}> = ({ status, message, size = 'md', showIcon = true, className = '' }) => {
  const hebrewFont = useHebrewFont('body');

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200'
        };
      case 'success':
        return {
          icon: <CheckCircle2 className={`${SIZE_CLASSES[size]} text-green-600`} />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'error':
        return {
          icon: <XCircle className={`${SIZE_CLASSES[size]} text-red-600`} />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200'
        };
      case 'warning':
        return {
          icon: <AlertCircle className={`${SIZE_CLASSES[size]} text-yellow-600`} />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${config.bgColor} ${className}`}>
      {showIcon && config.icon}
      {message && (
        <span className={`${config.color} text-sm font-medium ${hebrewFont.fontClass}`}>
          {message}
        </span>
      )}
    </div>
  );
};

// CSS animations
const LoadingStyles = () => (
  <style jsx global>{`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideDown {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `}</style>
);

export { LoadingStyles }; 