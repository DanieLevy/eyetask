import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface RealtimeNotificationProps {
  message?: string;
  type?: 'success' | 'update' | 'error';
  show?: boolean;
  duration?: number;
}

export function RealtimeNotification({ 
  message = "התקבל עדכון חדש", 
  type = 'update',
  show = false,
  duration = 3000
}: RealtimeNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <RefreshCw className="h-4 w-4 text-primary" />;
    }
  };

  const getBorderAndTextClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-300/60 dark:border-green-600/60 text-green-800 dark:text-green-200';
      case 'error':
        return 'border-red-300/60 dark:border-red-600/60 text-red-800 dark:text-red-200';
      default:
        return 'border-blue-300/60 dark:border-blue-600/60 text-blue-800 dark:text-blue-200';
    }
  };

  const getBackgroundStyle = () => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    switch (type) {
      case 'success':
        return isDark 
          ? 'linear-gradient(to right, rgba(21, 128, 61, 0.2), rgba(22, 101, 52, 0.2))'
          : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(240, 253, 244, 0.8))';
      case 'error':
        return isDark 
          ? 'linear-gradient(to right, rgba(185, 28, 28, 0.2), rgba(190, 18, 60, 0.2))'
          : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.8))';
      default:
        return isDark 
          ? 'linear-gradient(to right, rgba(30, 64, 175, 0.2), rgba(67, 56, 202, 0.2))'
          : 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(239, 246, 255, 0.8))';
    }
  };

  return (
    <div className="fixed top-20 right-4 left-4 md:left-auto md:top-4 md:right-4 z-[9999] animate-in slide-in-from-top-2 duration-300 max-w-md mx-auto md:mx-0">
      <div 
        className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg ${getBorderAndTextClasses()}`}
        style={{ background: getBackgroundStyle() }}
      >
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

// Hook for managing notifications
export function useRealtimeNotification() {
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'update' | 'error';
  }>({ show: false, message: '', type: 'update' });

  const showNotification = (message: string, type: 'success' | 'update' | 'error' = 'update') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  return { notification, showNotification };
} 