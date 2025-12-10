/**
 * Navigation Debug Helper
 * Logs navigation attempts and router state for debugging
 */

export function debugNavigation(
  component: string,
  action: string,
  path: string,
  router?: any
) {
  const timestamp = new Date().toISOString();
  
  console.group(`[NAV DEBUG] ${component} - ${action}`);
  console.log('Timestamp:', timestamp);
  console.log('Target Path:', path);
  console.log('Router Object:', router);
  console.log('Router Type:', typeof router);
  console.log('Has push method:', router && typeof router.push === 'function');
  console.log('Has back method:', router && typeof router.back === 'function');
  console.log('Has refresh method:', router && typeof router.refresh === 'function');
  console.log('Window location:', window.location.href);
  console.log('Document ready state:', document.readyState);
  console.groupEnd();
}

export function debugRouterCall(
  component: string,
  method: 'push' | 'replace' | 'refresh' | 'back',
  path?: string
) {
  console.log(`[NAV DEBUG] ${component} - Calling router.${method}(${path || ''})`);
  
  // Check if we're in a client component
  if (typeof window === 'undefined') {
    console.error('[NAV DEBUG] ERROR: Trying to use router on server side!');
    return;
  }
  
  // Log stack trace to see where this was called from
  console.trace('[NAV DEBUG] Call stack');
}

