'use client';

import { useEffect, useState } from 'react';

export default function CSSFailsafe() {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Simple check if Tailwind CSS has loaded
    const timer = setTimeout(() => {
      const testEl = document.createElement('div');
      testEl.className = 'bg-background text-foreground sr-only';
      document.body.appendChild(testEl);

      const styles = window.getComputedStyle(testEl);
      const hasStyles = styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                       styles.backgroundColor !== 'transparent';
      
      document.body.removeChild(testEl);
      
      if (!hasStyles) {
        setShowFallback(true);
        console.warn('Tailwind CSS may not have loaded properly');
      }
    }, 2000); // Check after 2 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!showFallback) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '0.5rem',
      textAlign: 'center',
      fontSize: '0.875rem',
      zIndex: 9999,
      fontFamily: 'Ploni, Arial Hebrew, Arial Unicode MS, sans-serif',
      direction: 'rtl'
    }}>
      ⚠️ בעיה בטעינת העיצוב - אנא רענן את הדף
    </div>
  );
} 