'use client';

import { useState, useEffect } from 'react';
import { usePWADetection } from '@/hooks/usePWADetection';

export default function PWATestPage() {
  const [events, setEvents] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const pwaStatus = usePWADetection();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const addEvent = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setEvents(prev => [...prev, `${timestamp}: ${message}`]);
    };

    // Test beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      addEvent('beforeinstallprompt event fired!');
      addEvent(`Event prevented: ${e.defaultPrevented}`);
      
      // Let's see what happens if we don't prevent it
      addEvent('Allowing native install banner to show...');
    };

    const handleAppInstalled = () => {
      addEvent('App installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check initial state
    addEvent('PWA Test page loaded');
    addEvent(`Standalone mode: ${pwaStatus.status.isStandalone}`);
    addEvent(`Can install: ${pwaStatus.status.canInstall}`);
    addEvent(`Platform: ${pwaStatus.status.platform}`);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isClient, pwaStatus.status]);

  if (!isClient) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">PWA Install Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PWA Status */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">PWA Status</h2>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Standalone:</strong> {pwaStatus.status.isStandalone ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Installable:</strong> {pwaStatus.status.isInstallable ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Can Install:</strong> {pwaStatus.status.canInstall ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Platform:</strong> {pwaStatus.status.platform}
              </div>
              <div>
                <strong>Display Mode:</strong> {pwaStatus.status.displayMode}
              </div>
              <div>
                <strong>Should Show Prompt:</strong> {pwaStatus.status.shouldShowInstallPrompt ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Never Show:</strong> {pwaStatus.status.neverShow ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Install Dismissed:</strong> {pwaStatus.status.installDismissed ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
            <div className="space-y-3">
              <button
                onClick={() => pwaStatus.installApp()}
                disabled={!pwaStatus.status.canInstall}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trigger Install
              </button>
              
              <button
                onClick={() => {
                  localStorage.removeItem('eyetask-install-dismissed');
                  localStorage.removeItem('eyetask-never-show-install');
                  setEvents(prev => [...prev, `${new Date().toLocaleTimeString()}: Cleared install flags`]);
                  window.location.reload();
                }}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg"
              >
                Reset Install Flags
              </button>

              <button
                onClick={() => pwaStatus.neverShowAgain()}
                className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-lg"
              >
                Never Show Again
              </button>

              <button
                onClick={() => {
                  // Force trigger beforeinstallprompt check
                  const event = new Event('beforeinstallprompt');
                  window.dispatchEvent(event);
                }}
                className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-lg"
              >
                Test beforeinstallprompt
              </button>
            </div>
          </div>

          {/* Local Storage Info */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Local Storage</h2>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <strong>install-dismissed:</strong><br/>
                {localStorage.getItem('eyetask-install-dismissed') || 'null'}
              </div>
              <div>
                <strong>never-show:</strong><br/>
                {localStorage.getItem('eyetask-never-show-install') || 'null'}
              </div>
              <div>
                <strong>launch-count:</strong><br/>
                {localStorage.getItem('eyetask-launch-count') || 'null'}
              </div>
            </div>
          </div>

          {/* Event Log */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Event Log</h2>
            <div className="max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-muted-foreground">No events yet...</p>
              ) : (
                <div className="space-y-1">
                  {events.map((event, index) => (
                    <div key={index} className="text-xs font-mono p-2 bg-muted rounded">
                      {event}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setEvents([])}
              className="mt-2 px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded"
            >
              Clear Log
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Make sure you're not in standalone mode (not installed)</li>
            <li>Clear install flags if needed using the "Reset Install Flags" button</li>
            <li>Open browser dev tools console to see PWA logs</li>
            <li>Refresh the page - you should see the native install banner if supported</li>
            <li>Watch the event log for beforeinstallprompt events</li>
            <li>If no native banner appears, our custom banner should show after 2 seconds</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 