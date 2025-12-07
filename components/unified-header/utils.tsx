import { LucideIcon, Folder, BarChart2, MessageSquare, LogOut, User, Home, Settings, HelpCircle } from 'lucide-react';
import { ReactNode } from 'react';
import React from 'react';

/**
 * Safely renders a Lucide icon or React element
 * This helps avoid the "Objects are not valid as a React child" error
 */
export const renderIcon = (
  icon: LucideIcon | ReactNode | undefined | null, 
  size: 'sm' | 'md' | 'lg' = 'sm'
): ReactNode => {
  if (!icon) return null;
  
  // Direct size classes instead of template literals
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };
  
  // If icon is a Lucide icon component (function)
  if (typeof icon === 'function') {
    const Icon = icon;
    return <Icon className={sizeClass[size]} />;
  }
  
  // If icon is already a React element, clone it with the right size if it has className prop
  if (React.isValidElement(icon)) {
    try {
      // TypeScript needs help here - we'll create a new props object
      const originalProps = (icon as React.ReactElement).props || {};
      const newProps: Record<string, unknown> = {};
      
      // Only add className if it's safe to do so - check if it's an object first
      if (originalProps && typeof originalProps === 'object' && 
          ('className' in originalProps || typeof icon.type !== 'string')) {
        newProps.className = sizeClass[size];
      }
      
      return React.cloneElement(icon as React.ReactElement, newProps);
    } catch (e) {
      // If cloning fails, return the original element
      console.warn('Failed to clone icon element:', e);
      return icon;
    }
  }
  
  // For anything else, just return it directly (but this shouldn't normally happen)
  return null;
};

/**
 * Maps common navigation item IDs to their respective icons
 * Returns consistent React elements to avoid render problems
 */
export const getIconForItem = (id: string): React.ReactElement | null => {
  const idLower = (id || '').toLowerCase();
  
  switch (idLower) {
    // Main navigation
    case 'home':
      return <Home className="h-4 w-4" />;
    case 'dashboard':
      return <BarChart2 className="h-4 w-4" />;
    case 'projects':
    case 'tasks':
      return <Folder className="h-4 w-4" />;
    case 'feedback':
      return <MessageSquare className="h-4 w-4" />;
    case 'settings':
      return <Settings className="h-4 w-4" />;
    case 'help':
      return <HelpCircle className="h-4 w-4" />;
    
    // Account related
    case 'profile':
      return <User className="h-4 w-4" />;
    case 'logout':
    case 'signout':
      return <LogOut className="h-4 w-4" />;
    default:
      return null;
  }
}; 