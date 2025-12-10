'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { getVisitorInfo, saveVisitorName, VisitorInfo } from '@/lib/visitor-utils';

interface VisitorContextType {
  visitor: VisitorInfo | null;
  isLoading: boolean;
  isRegistering: boolean;
  registerVisitor: (name: string) => Promise<boolean>;
  refreshVisitorInfo: () => void;
  checkAndUpdateFromDatabase: () => Promise<void>;
}

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

export function VisitorProvider({ children }: { children: React.ReactNode }) {
  const [visitor, setVisitor] = useState<VisitorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const FETCH_INTERVAL = 60000; // Check every minute

  // Check if visitor name exists in database
  const checkAndUpdateFromDatabase = useCallback(async () => {
    if (!visitor?.visitorId) return;
    
    // Prevent too frequent fetches
    const now = Date.now();
    if (now - lastFetchRef.current < 10000) { // Minimum 10 seconds between fetches
      return;
    }
    lastFetchRef.current = now;
    
    try {
      const response = await fetch(`/api/visitors?visitorId=${visitor.visitorId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.profile) {
          const dbName = data.profile.name;
          
          // Check if name was removed or changed
          if (!dbName && visitor.isRegistered) {
            // Name was removed from database, clear local storage and show modal
            logger.info('Name removed from database', 'VISITOR_CONTEXT');
            
            localStorage.removeItem('eyetask_visitor_name');
            localStorage.removeItem('eyetask_visitor_registered');
            localStorage.removeItem('eyetask_visitor_modal_shown');
            
            const updatedInfo = getVisitorInfo();
            setVisitor(updatedInfo);
            
          } else if (dbName && dbName !== visitor.name) {
            // Name was changed in database, update local storage
            logger.info('Name updated from database', 'VISITOR_CONTEXT', { dbName });
            
            localStorage.setItem('eyetask_visitor_name', dbName);
            localStorage.setItem('eyetask_visitor_registered', 'true');
            
            const updatedInfo = getVisitorInfo();
            setVisitor(updatedInfo);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking database', 'VISITOR_CONTEXT', undefined, error as Error);
    }
  }, [visitor]);

  // Load visitor info on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadVisitorInfo = async () => {
      try {
        const info = getVisitorInfo();
        
        // Only log once on mount, not on every render
        if (isMounted && !visitor) {
          logger.info('Initialized', 'VISITOR_CONTEXT', { 
            visitorIdPreview: info.visitorId.substring(0, 20) + '...', 
            isRegistered: info.isRegistered 
          });
        }
        
        if (isMounted) {
          setVisitor(info);
        }
        
        // If visitor is registered, check database for updates
        if (isMounted && info.isRegistered && info.visitorId) {
          await checkAndUpdateFromDatabase();
        }
      } catch (error) {
        if (isMounted) {
          console.error('[VisitorContext] Error loading visitor info:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadVisitorInfo();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Set up periodic checks for name updates from database
  useEffect(() => {
    if (!visitor?.isRegistered || !visitor?.visitorId) return;
    
    const interval = setInterval(() => {
      checkAndUpdateFromDatabase();
    }, FETCH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [visitor?.isRegistered, visitor?.visitorId, checkAndUpdateFromDatabase]);

  const refreshVisitorInfo = useCallback(() => {
    const info = getVisitorInfo();
    logger.info('Refreshing visitor info', 'VISITOR_CONTEXT');
    setVisitor(info);
    
    // Check database for updates after refresh
    if (info.isRegistered && info.visitorId) {
      checkAndUpdateFromDatabase();
    }
  }, [checkAndUpdateFromDatabase]);

  const registerVisitor = useCallback(async (name: string): Promise<boolean> => {
    if (!visitor) {
      logger.error('No visitor info available for registration', 'VISITOR_CONTEXT');
      return false;
    }

    setIsRegistering(true);
    
    try {
      logger.info('Starting registration process', 'VISITOR_CONTEXT', { name });
      
      // First, save to database
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitor.visitorId,
          name,
          metadata: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            registeredAt: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save visitor registration');
      }

      const result = await response.json();
      
      if (result.success) {
        // Save to local storage only after successful database save
        saveVisitorName(name);
        
        // Refresh visitor info to get updated state
        const updatedInfo = getVisitorInfo();
        setVisitor(updatedInfo);
        
        logger.info('Registration completed successfully', 'VISITOR_CONTEXT');
        
        return true;
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      logger.error('Registration failed', 'VISITOR_CONTEXT', undefined, error as Error);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [visitor]);

  return (
    <VisitorContext.Provider value={{ 
      visitor, 
      isLoading, 
      isRegistering, 
      registerVisitor, 
      refreshVisitorInfo,
      checkAndUpdateFromDatabase
    }}>
      {children}
    </VisitorContext.Provider>
  );
}

export function useVisitor() {
  const context = useContext(VisitorContext);
  if (!context) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  return context;
} 