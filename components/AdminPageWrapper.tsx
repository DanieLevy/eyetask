'use client';

import { usePathname } from 'next/navigation';
import AdminClientLayout from './AdminClientLayout';

export default function AdminPageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't wrap the login page
  if (pathname === '/admin') {
    return <>{children}</>;
  }
  
  // Wrap all other admin pages
  return <AdminClientLayout>{children}</AdminClientLayout>;
} 