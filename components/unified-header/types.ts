import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export type HeaderVariant = 'default' | 'admin' | 'project' | 'task' | 'minimal';

export interface HeaderAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link";
  disabled?: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  isActive?: boolean;
  isExternal?: boolean;
}

export interface UserData {
  username: string;
  id: string;
  role?: 'admin' | 'user' | 'data_manager' | 'driver_manager';
}

export interface UnifiedHeaderProps {
  // Context properties
  variant?: HeaderVariant;
  
  // Content properties  
  title?: string;
  subtitle?: string;
  
  // Navigation properties
  backHref?: string;
  backLabel?: string;
  navigationItems?: NavigationItem[];
  
  // Feature flags
  showLogo?: boolean;
  showSearch?: boolean;
  showUserMenu?: boolean;
  showThemeToggle?: boolean;
  showBackButton?: boolean;
  
  // Dynamic content
  actions?: HeaderAction[] | ReactNode;
  
  // Meta properties
  className?: string;
  
  // Event handlers
  onRefresh?: () => void;
  
  // State indicators
  isLoading?: boolean;
}

export interface MobileMenuProps {
  items: NavigationItem[];
  actions?: HeaderAction[];
  showSearch?: boolean;
  showThemeToggle?: boolean;
  showDebugIcon?: boolean;
}

export interface HeaderLogoProps {
  condensed?: boolean;
  className?: string;
}

export interface HeaderActionsProps {
  actions: HeaderAction[];
  className?: string;
}

export interface HeaderUserMenuProps {
  user?: UserData | null;
  className?: string;
  onLogout?: () => void;
}

export interface HeaderSearchProps {
  className?: string;
  variant?: "default" | "mobile-full-width";
}

export interface HeaderNavigationProps {
  items: NavigationItem[];
  className?: string;
} 