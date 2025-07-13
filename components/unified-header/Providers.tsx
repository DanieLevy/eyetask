'use client';

import React from 'react';
import { HeaderProvider } from './HeaderContext';
import { TooltipProvider } from '@/components/ui/tooltip';

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