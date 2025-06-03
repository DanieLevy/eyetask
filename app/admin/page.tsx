'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Lock, User, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('adminToken');
    if (token) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Starting login process...', { username: credentials.username });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('🌐 Login response status:', response.status);
      console.log('🌐 Login response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('📦 Login response data:', data);
      console.log('📦 Response data structure:', {
        success: data.success,
        hasToken: !!data.token || !!data.data?.token,
        hasUser: !!data.user || !!data.data?.user,
        tokenValue: data.token || data.data?.token,
        userValue: data.user || data.data?.user
      });

      if (data.success) {
        // Extract token and user from the response - they're nested in data object
        const token = data.data?.token;
        const user = data.data?.user;
        
        console.log('✅ Login successful, storing data...');
        console.log('🔑 Token to store:', token);
        console.log('👤 User to store:', user);
        console.log('👤 User JSON string:', JSON.stringify(user));
        
        // Validate data before storing
        if (!token) {
          console.error('❌ No token in response!');
          setError('שגיאה: לא התקבל טוקן מהשרת');
          return;
        }
        
        if (!user) {
          console.error('❌ No user data in response!');
          setError('שגיאה: לא התקבלו נתוני משתמש מהשרת');
          return;
        }
        
        // Store with additional validation
        try {
          localStorage.setItem('adminToken', token);
          console.log('💾 Token stored. Verification:', localStorage.getItem('adminToken'));
          
          const userJson = JSON.stringify(user);
          localStorage.setItem('adminUser', userJson);
          console.log('💾 User stored. Verification:', localStorage.getItem('adminUser'));
          
          // Double-check what was actually stored
          const storedToken = localStorage.getItem('adminToken');
          const storedUser = localStorage.getItem('adminUser');
          
          console.log('🔍 Final verification:');
          console.log('  Stored token:', storedToken);
          console.log('  Stored user:', storedUser);
          console.log('  Stored user type:', typeof storedUser);
          
          if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
            console.log('🚀 Redirecting to dashboard...');
            router.push('/admin/dashboard');
          } else {
            console.error('❌ Storage verification failed!');
            setError('שגיאה בשמירת נתוני התחברות');
          }
        } catch (storageError) {
          console.error('❌ Error storing to localStorage:', storageError);
          setError('שגיאה בשמירת נתוני התחברות');
        }
      } else {
        console.error('❌ Login failed:', data.error);
        setError(data.error || 'שגיאה בהתחברות');
      }
    } catch (error) {
      console.error('❌ Login request failed:', error);
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Eye className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">EyeTask</h1>
              <p className="text-sm text-muted-foreground">Mobileye</p>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">כניסת מנהל</h2>
          <p className="text-sm text-muted-foreground">
            היכנס עם פרטי המנהל שלך לגישה לפאנל הניהול
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-lg border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                שם משתמש
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full pr-10 pl-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="הכנס שם משתמש"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                סיסמה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full pr-10 pl-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="הכנס סיסמה"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !credentials.username || !credentials.password}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  <span>מתחבר...</span>
                </div>
              ) : (
                'התחבר'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            © 2025 Mobileye - EyeTask. כל הזכויות שמורות.
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-primary hover:underline mt-2"
          >
            חזור לדף הבית
          </button>
        </div>

        {/* Demo Credentials Info */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
          <h3 className="text-sm font-medium text-foreground mb-2">פרטי התחברות לדמו:</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>שם משתמש:</strong> admin</p>
            <p><strong>סיסמה:</strong> admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
} 