'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getVisitorInfo, saveVisitorName, getDeviceInfo, VisitorInfo } from '@/lib/visitor-utils';
import { logger } from '@/lib/logger';

interface VisitorContextType {
  visitor: VisitorInfo | null;
  isLoading: boolean;
  isRegistering: boolean;
  registerVisitor: (name: string) => Promise<boolean>;
  refreshVisitorInfo: () => void;
}

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

export function VisitorProvider({ children }: { children: React.ReactNode }) {
  const [visitor, setVisitor] = useState<VisitorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Load visitor info on mount
  useEffect(() => {
    const loadVisitorInfo = () => {
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
      } catch (error) {
        logger.error('Error loading visitor info', 'VISITOR_CONTEXT', undefined, error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVisitorInfo();
  }, []);

  const refreshVisitorInfo = useCallback(() => {
    const info = getVisitorInfo();
    logger.info('[Visitor] Refreshing visitor info', 'VISITOR_CONTEXT', {
      visitorId: info.visitorId,
      isRegistered: info.isRegistered,
      modalShown: info.modalShown,
      name: info.name
    });
    setVisitor(info);
  }, []);

  const registerVisitor = useCallback(async (name: string): Promise<boolean> => {
    if (!visitor || isRegistering) return false;

    setIsRegistering(true);

    try {
      const deviceInfo = getDeviceInfo();
      
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visitorId: visitor.visitorId,
          name,
          metadata: {
            ...deviceInfo,
            registeredAt: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register visitor');
      }

      const result = await response.json();
      
      if (result.success) {
        // Save name locally
        saveVisitorName(name);
        
        // Refresh visitor info
        refreshVisitorInfo();
        
        logger.info('Visitor registered successfully', 'VISITOR_CONTEXT', {
          visitorId: visitor.visitorId,
          name,
          isNew: result.isNew
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error registering visitor', 'VISITOR_CONTEXT', undefined, error as Error);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [visitor, isRegistering, refreshVisitorInfo]);

  return (
    <VisitorContext.Provider 
      value={{ 
        visitor, 
        isLoading, 
        isRegistering,
        registerVisitor,
        refreshVisitorInfo
      }}
    >
      {children}
    </VisitorContext.Provider>
  );
}

export function useVisitor() {
  const context = useContext(VisitorContext);
  
  if (context === undefined) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  
  return context;
} 