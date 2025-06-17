'use client';

import React from 'react';
import { AuthProvider } from './AuthContext';
import { HeaderProvider } from './HeaderContext';
import { TooltipProvider } from '@/components/ui/tooltip';

interface ProvidersProps {
  children: React.ReactNode;
}

export const HeaderProviders: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <HeaderProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </HeaderProvider>
    </AuthProvider>
  );
};

export default HeaderProviders; 