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

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
      default:
        return 'bg-primary/10 border-primary/20 text-primary';
    }
  };

  return (
    <div className="fixed top-20 right-4 left-4 md:left-auto md:top-4 md:right-4 z-[9999] animate-in slide-in-from-top-2 duration-300 max-w-md mx-auto md:mx-0">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg ${getBgColor()}`}>
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