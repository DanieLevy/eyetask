'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserData } from './types';

interface AuthContextType {
  user: UserData | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (token: string, userData: UserData) => void;
  logout: () => void;
  verifyAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  verifyAuth: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();
  
  // Function to verify token validity with the server
  const verifyToken = async (token: string): Promise<UserData | null> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.success && data.user ? data.user : null;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  };
  
  // Function to load user from localStorage with verification
  const loadUserFromStorage = async () => {
    setIsLoading(true);
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      const adminUser = localStorage.getItem('adminUser');
      
      if (adminToken && adminUser && adminUser !== 'undefined' && adminUser !== 'null') {
        try {
          const parsedUser = JSON.parse(adminUser);
          
          // Set local state immediately for better UX
          setUser(parsedUser);
          setIsAdmin(true);
          
          // Verify token with server in background
          const verifiedUser = await verifyToken(adminToken);
          
          if (verifiedUser) {
            // Token is valid, update with verified data
            setUser(verifiedUser);
            setIsAdmin(true);
            
            // Update localStorage with fresh data if needed
            if (JSON.stringify(verifiedUser) !== adminUser) {
              localStorage.setItem('adminUser', JSON.stringify(verifiedUser));
            }
            
            // Set global flags for backward compatibility
            if (typeof window !== 'undefined') {
              window.__eyetask_user = verifiedUser;
              window.__eyetask_isAdmin = true;
            }
          } else {
            // Token is invalid, clear auth
            console.warn('Invalid token detected, logging out');
            handleLogout();
          }
        } catch (error) {
          console.error('Error parsing/verifying user data:', error);
          handleLogout();
        }
      } else {
        // No stored auth data
        setUser(null);
        setIsAdmin(false);
        
        // Clear any global flags
        if (typeof window !== 'undefined') {
          window.__eyetask_user = null;
          window.__eyetask_isAdmin = false;
        }
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clean logout handler
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    // Update state
    setUser(null);
    setIsAdmin(false);
    
    // Clear global flags for backward compatibility
    if (typeof window !== 'undefined') {
      window.__eyetask_user = null;
      window.__eyetask_isAdmin = false;
    }
  };
  
  // Initialize auth state and listen for changes
  useEffect(() => {
    // Load initial auth state
    loadUserFromStorage();
    
    // Listen for storage events (logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adminToken' || e.key === 'adminUser') {
        loadUserFromStorage();
      }
    };
    
    // Listen for pathname changes to verify auth on navigation
    const handleRouteChange = () => {
      // Only verify auth on admin routes
      if (pathname?.startsWith('/admin') && pathname !== '/admin') {
        verifyAuth();
      }
    };
    
    // Add event listeners
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Verify auth on pathname change
  useEffect(() => {
    if (pathname?.startsWith('/admin') && pathname !== '/admin') {
      verifyAuth();
    }
  }, [pathname]);
  
  // Login function
  const login = (token: string, userData: UserData) => {
    try {
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(userData));
      
      setUser(userData);
      setIsAdmin(true);
      
      // Set global flags for backward compatibility
      if (typeof window !== 'undefined') {
        window.__eyetask_user = userData;
        window.__eyetask_isAdmin = true;
      }
    } catch (error) {
      console.error('Error during login:', error);
    }
  };
  
  // Logout function
  const logout = () => {
    // First, call the logout API endpoint
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
      }
    }).then(() => {
      // Then handle client-side logout
      handleLogout();
      
      // Redirect to login page if on admin page
      if (pathname?.startsWith('/admin') && pathname !== '/admin') {
        router.push('/admin');
      }
    }).catch(error => {
      console.error('Error during logout API call:', error);
      // Still handle client-side logout
      handleLogout();
    });
  };
  
  // Public verification function
  const verifyAuth = async (): Promise<boolean> => {
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) {
      handleLogout();
      return false;
    }
    
    const verifiedUser = await verifyToken(adminToken);
    
    if (verifiedUser) {
      // Update with verified data
      setUser(verifiedUser);
      setIsAdmin(true);
      
      // Update localStorage
      localStorage.setItem('adminUser', JSON.stringify(verifiedUser));
      
      // Set global flags
      if (typeof window !== 'undefined') {
        window.__eyetask_user = verifiedUser;
        window.__eyetask_isAdmin = true;
      }
      
      return true;
    } else {
      handleLogout();
      return false;
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, login, logout, verifyAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext; 