'use client';

import { useEffect } from 'react';
import { useProjectHealth } from '@/hooks/useSafeDataFetching';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

interface ProjectGuardMonitorProps {
  enableDevWarnings?: boolean;
  showHealthIndicator?: boolean;
}

export default function ProjectGuardMonitor({ 
  enableDevWarnings = process.env.NODE_ENV === 'development',
  showHealthIndicator = process.env.NODE_ENV === 'development'
}: ProjectGuardMonitorProps) {
  const healthReport = useProjectHealth();

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
      toast.warning(message, {
        description: 'Check console for detailed information.',
        duration: 10000,
      });

      // Log detailed information
      logger.warn('Performance concerns detected', 'PROJECT_GUARD_MONITOR', {
        concerns,
        problematicComponents,
        totalRequests,
        totalErrors
      });
    }
  }, [healthReport, enableDevWarnings]);

  // In production, don't render anything
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
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