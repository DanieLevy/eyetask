'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';
import { usePWADetection } from '@/hooks/usePWADetection';
import { useHebrewFont } from '@/hooks/useFont';
import Image from 'next/image';

export default function SmartAppBanner() {
  const {
    status,
    dismissInstallPrompt,
    neverShowAgain,
    installApp
  } = usePWADetection();

  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const hebrewFont = useHebrewFont('body');

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Show banner conditions
    const shouldShow = !status.isStandalone && 
                      !status.isInstalled && 
                      !status.installDismissed && 
                      !status.neverShow &&
                      status.canInstall;

    setShowBanner(shouldShow);
  }, [status, isClient]);

  // Don't render on server to prevent hydration mismatch
  if (!isClient || !showBanner) return null;

  const handleInstall = async () => {
    if (status.platform === 'ios') {
      setShowIOSInstructions(true);
    } else {
      try {
        await installApp();
      } catch (error) {
        console.error('Install failed:', error);
      }
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setShowBanner(false);
  };

  return (
    <>
      {/* Ultra Clean Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden shadow-sm">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="DC Drivers"
                  width={48}
                  height={48}
                />
              </div>
              <div>
                <h3 className={`text-sm font-semibold text-foreground ${hebrewFont.fontClass}`}>
                  DC Drivers
                </h3>
                <p className={`text-xs text-muted-foreground ${hebrewFont.fontClass}`}>
                  התקן את האפליקציה למסך הבית
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg"
              >
                התקן
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
                aria-label="סגור"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simple iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card/98 backdrop-blur-sm rounded-xl shadow-xl max-w-sm w-full border border-border">
            {/* Simple Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Image 
                  src="/icons/icon-128x128.png" 
                  alt="DC Drivers"
                  width={24}
                  height={24}
                  className="rounded-lg"
                />
                <h3 className={`text-sm font-semibold text-card-foreground ${hebrewFont.fontClass}`}>
                  התקנת DC Drivers
                </h3>
              </div>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 text-muted-foreground hover:text-card-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simple Instructions */}
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Share className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-sm font-medium text-card-foreground ${hebrewFont.fontClass}`}>
                        לחץ על כפתור השיתוף
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-sm font-medium text-card-foreground ${hebrewFont.fontClass}`}>
                        בחר "הוסף למסך הבית"
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium text-card-foreground ${hebrewFont.fontClass}`}>
                      לחץ "הוסף" לאישור
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className={`
                    w-full py-2 text-sm font-medium text-card-foreground bg-muted/50 rounded-lg
                    hover:bg-muted transition-colors duration-200
                    ${hebrewFont.fontClass}
                  `}
                >
                  הבנתי
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Ultra-minimal banner for specific pages
export function MiniAppBanner() {
  const {
    status,
    installApp
  } = usePWADetection();

  const [isClient, setIsClient] = useState(false);
  const hebrewFont = useHebrewFont('body');

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || status.isStandalone || status.isInstalled || status.installDismissed) {
    return null;
  }

  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Image 
          src="/icons/icon-128x128.png" 
          alt="DC Drivers"
          width={24}
          height={24}
          className="rounded-lg"
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-card-foreground ${hebrewFont.fontClass}`}>
            התקן את DC Drivers למסך הבית
          </p>
        </div>
        <button
          onClick={installApp}
          className={`
            px-3 py-1 text-sm font-medium text-primary-foreground bg-primary rounded-md
            hover:bg-primary/90 transition-colors duration-200
            ${hebrewFont.fontClass}
          `}
        >
          התקן
        </button>
      </div>
    </div>
  );
} 