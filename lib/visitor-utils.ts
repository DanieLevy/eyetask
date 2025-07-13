import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

const VISITOR_ID_KEY = 'eyetask_visitor_id';
const VISITOR_NAME_KEY = 'eyetask_visitor_name';
const VISITOR_SESSION_KEY = 'eyetask_visitor_session';
const VISITOR_REGISTERED_KEY = 'eyetask_visitor_registered';
const VISITOR_COOKIE_NAME = 'eyetask_visitor';

export interface VisitorInfo {
  visitorId: string;
  sessionId: string;
  name?: string;
  isRegistered: boolean;
}

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set cookie with expiration
 */
function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof window === 'undefined') return;
  
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

/**
 * Get or create a unique visitor ID
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';
  
  // First check localStorage
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  
  // If not in localStorage, check cookie
  if (!visitorId) {
    const cookieData = getCookie(VISITOR_COOKIE_NAME);
    if (cookieData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookieData));
        if (parsed.visitorId) {
          visitorId = parsed.visitorId;
          // Restore to localStorage
          localStorage.setItem(VISITOR_ID_KEY, parsed.visitorId);
          if (parsed.name) {
            localStorage.setItem(VISITOR_NAME_KEY, parsed.name);
            localStorage.setItem(VISITOR_REGISTERED_KEY, 'true');
          }
          logger.info('[Visitor] Restored visitor from cookie', 'VISITOR_UTILS', {
            visitorId,
            hasName: !!parsed.name
          });
        }
      } catch (e) {
        // Invalid cookie data
      }
    }
  }
  
  // If still no visitor ID, create new one
  if (!visitorId) {
    visitorId = `visitor_${uuidv4()}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
    // Also save to cookie
    setCookie(VISITOR_COOKIE_NAME, JSON.stringify({ visitorId }));
    logger.info('[Visitor] New visitor ID created', 'VISITOR_UTILS', {
      visitorId,
      createdAt: new Date().toISOString()
    });
  } else {
    logger.info('[Visitor] Existing visitor ID found', 'VISITOR_UTILS', {
      visitorId
    });
  }
  
  return visitorId;
}

/**
 * Get or create a session ID for the current visit
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem(VISITOR_SESSION_KEY);
  
  if (!sessionId) {
    sessionId = `session_${uuidv4()}`;
    sessionStorage.setItem(VISITOR_SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Get visitor info from localStorage and cookies
 */
export function getVisitorInfo(): VisitorInfo {
  if (typeof window === 'undefined') {
    return {
      visitorId: '',
      sessionId: '',
      isRegistered: false
    };
  }
  
  const visitorId = getOrCreateVisitorId();
  const name = localStorage.getItem(VISITOR_NAME_KEY) || undefined;
  const isRegistered = localStorage.getItem(VISITOR_REGISTERED_KEY) === 'true';
  
  // If not registered in localStorage, check cookie
  if (!isRegistered && !name) {
    const cookieData = getCookie(VISITOR_COOKIE_NAME);
    if (cookieData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookieData));
        if (parsed.name) {
          // Restore registration from cookie
          localStorage.setItem(VISITOR_NAME_KEY, parsed.name);
          localStorage.setItem(VISITOR_REGISTERED_KEY, 'true');
          return {
            visitorId,
            sessionId: getOrCreateSessionId(),
            name: parsed.name,
            isRegistered: true
          };
        }
      } catch (e) {
        // Invalid cookie data
      }
    }
  }
  
  return {
    visitorId,
    sessionId: getOrCreateSessionId(),
    name,
    isRegistered
  };
}

/**
 * Save visitor name after registration
 */
export function saveVisitorName(name: string): void {
  if (typeof window === 'undefined') return;
  
  const visitorId = getOrCreateVisitorId();
  
  // Save to localStorage
  localStorage.setItem(VISITOR_NAME_KEY, name);
  localStorage.setItem(VISITOR_REGISTERED_KEY, 'true');
  
  // Also save to cookie for persistence
  setCookie(VISITOR_COOKIE_NAME, JSON.stringify({ 
    visitorId, 
    name,
    registeredAt: new Date().toISOString()
  }));
  
  logger.info('[Visitor] Visitor name saved to storage and cookie', 'VISITOR_UTILS', {
    visitorId,
    name
  });
}

/**
 * Clear visitor data (for testing or privacy)
 */
export function clearVisitorData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(VISITOR_ID_KEY);
  localStorage.removeItem(VISITOR_NAME_KEY);
  localStorage.removeItem(VISITOR_REGISTERED_KEY);
  sessionStorage.removeItem(VISITOR_SESSION_KEY);
  
  // Also clear cookie
  document.cookie = `${VISITOR_COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

/**
 * Check if visitor has already registered
 */
export function isVisitorRegistered(): boolean {
  if (typeof window === 'undefined') return false;
  
  return localStorage.getItem(VISITOR_REGISTERED_KEY) === 'true';
}

/**
 * Get device information for analytics
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') return {};
  
  const userAgent = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  
  // Simple browser detection
  let browser = 'Unknown';
  if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browser = 'Safari';
  } else if (userAgent.indexOf('Chrome') > -1) {
    browser = 'Chrome';
  } else if (userAgent.indexOf('Edge') > -1) {
    browser = 'Edge';
  }
  
  // Simple OS detection
  let os = 'Unknown';
  if (userAgent.indexOf('Windows') > -1) {
    os = 'Windows';
  } else if (userAgent.indexOf('Mac') > -1) {
    os = 'macOS';
  } else if (userAgent.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (userAgent.indexOf('Android') > -1) {
    os = 'Android';
  } else if (userAgent.indexOf('iOS') > -1 || userAgent.indexOf('iPhone') > -1) {
    os = 'iOS';
  }
  
  return {
    userAgent,
    browser,
    os,
    isMobile,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    devicePixelRatio: window.devicePixelRatio
  };
}

/**
 * Track page view for visitor
 */
export async function trackPageView(page: string): Promise<void> {
  const visitor = getVisitorInfo();
  
  if (!visitor.visitorId || !visitor.isRegistered) {
    logger.warn('[Visitor] Cannot track page view - visitor not registered', 'VISITOR_UTILS', {
      visitorId: visitor.visitorId,
      isRegistered: visitor.isRegistered,
      page
    });
    return;
  }
  
  try {
    logger.info('[Visitor] Tracking page view', 'VISITOR_UTILS', {
      visitorId: visitor.visitorId,
      sessionId: visitor.sessionId,
      page,
      timestamp: new Date().toISOString()
    });
    
    await fetch(`/api/visitors/${visitor.visitorId}/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: `צפה בדף: ${page}`,
        category: 'view',
        metadata: {
          page,
          sessionId: visitor.sessionId,
          timestamp: new Date().toISOString()
        }
      })
    });
    
    logger.info('[Visitor] Page view tracked successfully', 'VISITOR_UTILS', {
      visitorId: visitor.visitorId,
      page
    });
  } catch (error) {
    logger.error('[Visitor] Failed to track page view', 'VISITOR_UTILS', {
      visitorId: visitor.visitorId,
      page,
      error: (error as Error).message
    });
    console.error('Failed to track page view:', error);
  }
}

/**
 * Track custom action for visitor
 */
export async function trackAction(action: string, category: string = 'action', metadata?: any): Promise<void> {
  const visitor = getVisitorInfo();
  
  if (!visitor.visitorId || !visitor.isRegistered) {
    logger.warn('[Visitor] Cannot track action - visitor not registered', 'VISITOR_UTILS', {
      visitorId: visitor.visitorId,
      isRegistered: visitor.isRegistered,
      action,
      category
    });
    return;
  }
  
  try {
    logger.info('[Visitor] Tracking action', 'VISITOR_UTILS', {
      visitorId: visitor.visitorId,
      sessionId: visitor.sessionId,
      action,
      category,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    await fetch(`/api/visitors/${visitor.visitorId}/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        category,
        metadata: {
          ...metadata,
          sessionId: visitor.sessionId,
          timestamp: new Date().toISOString()
        }
      })
    });
    
    logger.info('[Visitor] Action tracked successfully', 'VISITOR_UTILS', {
      visitorId: visitor.visitorId,
      action,
      category
    });
  } catch (error) {
    logger.error('[Visitor] Failed to track action', 'VISITOR_UTILS', {
      visitorId: visitor.visitorId,
      action,
      category,
      error: (error as Error).message
    });
    console.error('Failed to track action:', error);
  }
} 