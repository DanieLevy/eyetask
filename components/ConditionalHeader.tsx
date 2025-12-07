'use client';

import { UnifiedHeader } from './unified-header';
import { HeaderProviders } from './unified-header/Providers';

/**
 * ConditionalHeader automatically renders the appropriate header based on the current route
 * This helps avoid duplicate header rendering across the application
 */
export default function ConditionalHeader() {
  // The path information is passed to the header context via HeaderProviders
  // which allows proper dynamic configuration of the header across the app
  return (
    <HeaderProviders>
      <UnifiedHeader />
    </HeaderProviders>
  );
} 