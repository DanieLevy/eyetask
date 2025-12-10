/**
 * Navigation Debug Helper
 * Logs navigation attempts and router state for debugging
 */

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function debugNavigation(
  component: string,
  action: string,
  path: string,
  router?: AppRouterInstance
) {
  const timestamp = new Date().toISOString();
  
  console.info(`[NAV DEBUG] ${component} - ${action}`);
  console.info('Timestamp:', timestamp);
  console.info('Target Path:', path);
  console.info('Router Object:', router);
  console.info('Router Type:', typeof router);
  console.info('Has push method:', router && typeof router.push === 'function');
  console.info('Has back method:', router && typeof router.back === 'function');
  console.info('Has refresh method:', router && typeof router.refresh === 'function');
  console.info('Window location:', window.location.href);
  console.info('Document ready state:', document.readyState);
}

export function debugRouterCall(
  component: string,
  method: 'push' | 'replace' | 'refresh' | 'back',
  path?: string
) {
  console.info(`[NAV DEBUG] ${component} - Calling router.${method}(${path || ''})`);
  
  // Check if we're in a client component
  if (typeof window === 'undefined') {
    console.error('[NAV DEBUG] ERROR: Trying to use router on server side!');
    return;
  }
  
  // Log stack trace to see where this was called from
  console.info('[NAV DEBUG] Call stack', new Error().stack);
}

