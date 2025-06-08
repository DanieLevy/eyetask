'use client';

import { useEffect, useState } from 'react';
import { useProjectHealth } from '@/hooks/useSafeDataFetching';
import { logger } from '@/lib/logger';

interface ProjectGuardMonitorProps {
  enableDevWarnings?: boolean;
  showHealthIndicator?: boolean;
}

export default function ProjectGuardMonitor({ 
  enableDevWarnings = process.env.NODE_ENV === 'development',
  showHealthIndicator = process.env.NODE_ENV === 'development'
}: ProjectGuardMonitorProps) {
  const healthReport = useProjectHealth();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (!healthReport || !enableDevWarnings) return;

    const { problematicComponents, totalRequests, totalErrors } = healthReport;

    // Check for concerning patterns
    let concerns: string[] = [];

    if (problematicComponents.length > 0) {
      concerns.push(`${problematicComponents.length} components showing excessive activity`);
    }

    if (totalRequests > 1000) {
      concerns.push(`High request count: ${totalRequests}`);
    }

    if (totalErrors > 10) {
      concerns.push(`High error count: ${totalErrors}`);
    }

    // Show alert if concerns detected
    if (concerns.length > 0) {
      const message = `⚠️ Performance Issues Detected:\n${concerns.join('\n')}`;
      setAlertMessage(message);
      setShowAlert(true);

      // Log detailed information
      logger.warn('Performance concerns detected', 'PROJECT_GUARD_MONITOR', {
        concerns,
        problematicComponents,
        totalRequests,
        totalErrors
      });

      // Auto-hide alert after 10 seconds
      setTimeout(() => setShowAlert(false), 10000);
    }
  }, [healthReport, enableDevWarnings]);

  // In production, don't render anything
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      {/* Development Alert */}
      {showAlert && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-sm">Project Guard Alert</h4>
              <pre className="text-xs mt-1 whitespace-pre-wrap">{alertMessage}</pre>
              <div className="text-xs mt-2 opacity-75">
                Check console for detailed information
              </div>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="ml-2 text-yellow-600 hover:text-yellow-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Health Indicator */}
      {showHealthIndicator && healthReport && (
        <div className="fixed bottom-4 right-4 z-40 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs opacity-75 hover:opacity-100 transition-opacity">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              healthReport.problematicComponents.length === 0 ? 'bg-green-400' : 
              healthReport.problematicComponents.length < 3 ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <span>
              {healthReport.totalComponents} components, {healthReport.totalRequests} requests
            </span>
          </div>
        </div>
      )}
    </>
  );
} 