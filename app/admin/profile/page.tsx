'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Key, Save, CheckCircle, XCircle, Bell, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/LoadingSystem';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'data_manager' | 'driver_manager';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [profileData, setProfileData] = useState({
    username: '',
    email: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Push notifications
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    showIOSInstallPrompt
  } = usePushNotifications();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const userData = localStorage.getItem('adminUser');
      
      if (!token || !userData) {
        router.push('/admin');
        return;
      }

      const parsedUser = JSON.parse(userData);
      
      // Fetch full user details from API
      const response = await fetch(`/api/users/${parsedUser.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setProfileData({
          username: data.user.username,
          email: data.user.email
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    if (!profileData.username || !profileData.email) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: profileData.username,
          email: profileData.email,
          updateOwnProfile: true // Flag to indicate user is updating their own profile
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('הפרופיל עודכן בהצלחה');
        
        // Update local storage with new user data
        const currentUserData = JSON.parse(localStorage.getItem('adminUser') || '{}');
        localStorage.setItem('adminUser', JSON.stringify({
          ...currentUserData,
          username: profileData.username,
          email: profileData.email
        }));
        
        fetchUserProfile();
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          password: passwordData.newPassword,
          updateOwnProfile: true
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('הסיסמה שונתה בהצלחה');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'מנהל מערכת';
      case 'data_manager':
        return 'מנהל נתונים';
      case 'driver_manager':
        return 'מנהל נהגים';
      default:
        return role;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'גישה מלאה לכל חלקי המערכת';
      case 'data_manager':
        return 'ניהול פרויקטים, משימות ותת-משימות';
      case 'driver_manager':
        return 'ניהול עדכונים יומיים בלבד';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner showText text="טוען פרופיל..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">הפרופיל שלי</h1>

        <div className="grid gap-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>פרטי משתמש</CardTitle>
              <CardDescription>מידע כללי על החשבון שלך</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">תפקיד</Label>
                  <div className="mt-1">
                    <Badge variant="default" className="text-sm">
                      {getRoleName(user.role)}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getRoleDescription(user.role)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">סטטוס</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={user.isActive ? "default" : "destructive"}
                      className={`gap-1 ${user.isActive ? 'bg-green-50 text-green-700 hover:bg-green-50' : ''}`}
                    >
                      {user.isActive ? (
                        <><CheckCircle className="h-3 w-3" /> פעיל</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> לא פעיל</>
                      )}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">תאריך הצטרפות</Label>
                  <p className="text-sm mt-1">
                    {new Date(user.createdAt).toLocaleDateString('he-IL')}
                  </p>
                </div>
                
                {user.lastLogin && (
                  <div>
                    <Label className="text-muted-foreground">התחברות אחרונה</Label>
                    <p className="text-sm mt-1">
                      {new Date(user.lastLogin).toLocaleString('he-IL')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>עריכת פרופיל</CardTitle>
              <CardDescription>עדכן את פרטי החשבון שלך</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">
                    <User className="inline h-4 w-4 ml-1" />
                    שם משתמש
                  </Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    placeholder="הכנס שם משתמש"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    <Mail className="inline h-4 w-4 ml-1" />
                    כתובת אימייל
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={saving || (profileData.username === user.username && profileData.email === user.email)}
                >
                  {saving ? (
                    <>טוען...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-2" />
                      שמור שינויים
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <CardTitle>שינוי סיסמה</CardTitle>
              <CardDescription>עדכן את סיסמת החשבון שלך</CardDescription>
            </CardHeader>
            <CardContent>
              {!showPasswordForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full sm:w-auto"
                >
                  <Key className="h-4 w-4 ml-2" />
                  שנה סיסמה
                </Button>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      הסיסמה חייבת להכיל לפחות 6 תווים
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="currentPassword">סיסמה נוכחית</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        placeholder="הכנס סיסמה נוכחית"
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="grid gap-2">
                      <Label htmlFor="newPassword">סיסמה חדשה</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="הכנס סיסמה חדשה"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">אימות סיסמה חדשה</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="הכנס שוב את הסיסמה החדשה"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      disabled={saving}
                    >
                      ביטול
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    >
                      {saving ? 'משנה...' : 'שנה סיסמה'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Push Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                התראות Push
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSupported ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    הדפדפן שלך אינו תומך בהתראות Push
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">קבל התראות</p>
                      <p className="text-sm text-muted-foreground">
                        קבל התראות על משימות חדשות, עדכונים ועוד
                      </p>
                    </div>
                    <Button
                      variant={isSubscribed ? "destructive" : "default"}
                      size="sm"
                      onClick={async () => {
                        if (isSubscribed) {
                          await unsubscribe();
                        } else {
                          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                          const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                             (window.navigator as any).standalone === true;
                          
                          if (isIOS && !isStandalone) {
                            showIOSInstallPrompt();
                          } else {
                            await subscribe();
                          }
                        }
                      }}
                      disabled={pushLoading}
                    >
                      {pushLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : isSubscribed ? (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          בטל התראות
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-1" />
                          הפעל התראות
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {permission === 'denied' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ההתראות חסומות בדפדפן. יש לאפשר התראות בהגדרות הדפדפן
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {isSubscribed && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>התראות פעילות</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 