'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle } from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { useAuth } from '@/components/unified-header/AuthContext';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  
  // Get auth context
  const authContext = useAuth();
  const { user: currentUser, isLoading: authLoading } = authContext || {};

  useEffect(() => {
    // Check if user is already authenticated
    if (!authLoading && currentUser) {
      console.log('User already authenticated, redirecting...');
      router.push('/admin/dashboard');
    } else if (!authLoading) {
      // Auth check complete, no user found
      setChecking(false);
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    // Fallback: Check localStorage for existing authentication
    if (!authContext) {
      const token = localStorage.getItem('adminToken');
      const userData = localStorage.getItem('adminUser');
      
      if (token && userData && userData !== 'undefined' && userData !== 'null') {
        try {
          const parsedUser = JSON.parse(userData);
          if (parsedUser && parsedUser.id && parsedUser.username) {
            // User is already authenticated, redirect immediately
            console.log('Found existing auth in localStorage, redirecting...');
            router.replace('/admin/dashboard');
            return;
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          // Clear invalid data
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
        }
      }
      setChecking(false);
    }
  }, [authContext, router]);

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');

  // Show loader while checking authentication or during login
  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">בודק אימות...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let loginSuccessful = false;

    try {
      console.log('Starting login process...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (data.success) {
        // Handle both direct response and nested data structure
        const token = data.token || data.data?.token;
        const user = data.user || data.data?.user;
        const permissions = data.permissions || data.data?.permissions || {};
        
        if (token && user) {
          console.log('Login successful, calling auth context login...');
          loginSuccessful = true;
          toast.success('התחברת בהצלחה');
          
          if (authContext?.login) {
            // Use the auth context login method which handles redirect
            authContext.login(token, user, permissions);
          } else {
            // Fallback: manual redirect if auth context is not available
            console.warn('Auth context not available, using fallback redirect');
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminUser', JSON.stringify(user));
            if (permissions) {
              localStorage.setItem('userPermissions', JSON.stringify(permissions));
            }
            
            // Redirect based on permissions
            if (permissions?.['access.admin_dashboard']) {
              router.push('/admin/dashboard');
            } else if (permissions?.['access.tasks_management']) {
              router.push('/admin/tasks');
            } else if (permissions?.['access.projects_management']) {
              router.push('/admin/projects');
            } else {
              router.push('/admin/dashboard');
            }
          }
          // Don't set loading to false here, let the redirect happen
          return;
        } else {
          setError('שגיאה בתגובת השרת');
          toast.error('שגיאה בתגובת השרת');
        }
      } else {
        setError(data.error || 'שם משתמש או סיסמה שגויים');
        toast.error(data.error || 'שם משתמש או סיסמה שגויים');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('שגיאה בהתחברות למערכת');
      toast.error('שגיאה בהתחברות למערכת');
    } finally {
      // Only set loading to false if we didn't successfully login
      if (!loginSuccessful) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className={`text-2xl font-bold text-foreground mb-2 ${hebrewHeading.fontClass}`}>כניסת מנהל</h2>
          <p className={`text-sm text-muted-foreground ${mixedBody.fontClass}`}>
            היכנס עם פרטי המנהל שלך לגישה לפאנל הניהול
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
                  שם משתמש
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="username"
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full pr-10 pl-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="הזן שם משתמש"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                  סיסמה
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pr-10 pl-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="הזן סיסמה"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-muted-foreground">
                      <p>© 2025 Mobileye - Driver Tasks</p>
        </div>
      </div>
    </div>
  );
} 