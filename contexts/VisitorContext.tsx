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
            logger.info('[Visitor] Name removed from database', 'VISITOR_CONTEXT', {
              visitorId: visitor.visitorId,
              previousName: visitor.name
            });
            
            localStorage.removeItem('eyetask_visitor_name');
            localStorage.removeItem('eyetask_visitor_registered');
            localStorage.removeItem('eyetask_visitor_modal_shown');
            
            const updatedInfo = getVisitorInfo();
            setVisitor(updatedInfo);
            
          } else if (dbName && dbName !== visitor.name) {
            // Name was changed in database, update local storage
            logger.info('[Visitor] Name updated from database', 'VISITOR_CONTEXT', {
              visitorId: visitor.visitorId,
              oldName: visitor.name,
              newName: dbName
            });
            
            localStorage.setItem('eyetask_visitor_name', dbName);
            localStorage.setItem('eyetask_visitor_registered', 'true');
            
            const updatedInfo = getVisitorInfo();
            setVisitor(updatedInfo);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking visitor name from database', 'VISITOR_CONTEXT', undefined, error as Error);
    }
  }, [visitor]);

  // Load visitor info on mount
  useEffect(() => {
    const loadVisitorInfo = async () => {
      try {
        const info = getVisitorInfo();
        logger.info('[Visitor] Loading visitor info', 'VISITOR_CONTEXT', {
          visitorId: info.visitorId,
          sessionId: info.sessionId,
          isRegistered: info.isRegistered,
          name: info.name || 'Not registered',
          localStorage: {
            hasVisitorId: !!localStorage.getItem('eyetask_visitor_id'),
            hasName: !!localStorage.getItem('eyetask_visitor_name'),
            registeredFlag: localStorage.getItem('eyetask_visitor_registered')
          }
        });
        setVisitor(info);
        
        // If visitor is registered, check database for updates
        if (info.isRegistered && info.visitorId) {
          await checkAndUpdateFromDatabase();
        }
      } catch (error) {
        logger.error('Error loading visitor info', 'VISITOR_CONTEXT', undefined, error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVisitorInfo();
  }, [checkAndUpdateFromDatabase]);

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
    logger.info('[Visitor] Refreshing visitor info', 'VISITOR_CONTEXT', {
      visitorId: info.visitorId,
      isRegistered: info.isRegistered,
      modalShown: info.modalShown,
      name: info.name
    });
    setVisitor(info);
    
    // Check database for updates after refresh
    if (info.isRegistered && info.visitorId) {
      checkAndUpdateFromDatabase();
    }
  }, [checkAndUpdateFromDatabase]);

  const registerVisitor = useCallback(async (name: string): Promise<boolean> => {
    if (!visitor) {
      logger.error('[Visitor] No visitor info available for registration', 'VISITOR_CONTEXT');
      return false;
    }

    setIsRegistering(true);
    
    try {
      logger.info('[Visitor] Starting registration process', 'VISITOR_CONTEXT', {
        visitorId: visitor.visitorId,
        name
      });
      
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
        
        logger.info('[Visitor] Registration completed successfully', 'VISITOR_CONTEXT', {
          visitorId: visitor.visitorId,
          name,
          isNew: result.isNew
        });
        
        return true;
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      logger.error('[Visitor] Registration failed', 'VISITOR_CONTEXT', {
        visitorId: visitor.visitorId,
        name,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error as Error);
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