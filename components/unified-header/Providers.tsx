'use client';

import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HeaderProvider } from './HeaderContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export const HeaderProviders: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <HeaderProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </HeaderProvider>
  );
};

export default HeaderProviders; 