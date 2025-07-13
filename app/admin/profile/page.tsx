'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminClientLayout from '@/components/AdminClientLayout';
import { useAuth } from '@/components/unified-header/AuthContext';
import { toast } from 'sonner';
import { User, Mail, Lock, Save, Loader2, Shield, AlertCircle } from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';

export default function ProfilePage() {
  const { user, refreshPermissions } = useAuth();
  const router = useRouter();
  const hebrewHeading = useHebrewFont('heading');
  const mixedBody = useMixedFont('body');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'שם משתמש הוא שדה חובה';
    } else if (formData.username.length < 3) {
      newErrors.username = 'שם המשתמש חייב להכיל לפחות 3 תווים';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'אימייל הוא שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'כתובת אימייל לא חוקית';
    }
    
    if (showPasswordChange) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'נדרשת הסיסמה הנוכחית';
      }
      
      if (!formData.newPassword) {
        newErrors.newPassword = 'נדרשת סיסמה חדשה';
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'הסיסמה חייבת להכיל לפחות 6 תווים';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'הסיסמאות אינן תואמות';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin');
        return;
      }
      
      const updateData: any = {
        username: formData.username,
        email: formData.email
      };
      
      if (showPasswordChange && formData.currentPassword && formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.password = formData.newPassword;
      }
      
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('הפרופיל עודכן בהצלחה');
        
        // Refresh permissions and user data
        await refreshPermissions();
        
        // Reset form
        setIsEditing(false);
        setShowPasswordChange(false);
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        toast.error(data.error || 'שגיאה בעדכון הפרופיל');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('שגיאה בעדכון הפרופיל');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowPasswordChange(false);
    setErrors({});
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      admin: 'מנהל מערכת',
      data_manager: 'מנהל נתונים',
      driver_manager: 'מנהל נהגים'
    };
    return roleNames[role] || role;
  };

  return (
    <AdminClientLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className={`text-3xl font-bold text-gray-900 dark:text-white mb-8 ${hebrewHeading.fontClass}`}>
            הפרופיל שלי
          </h1>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-semibold text-gray-900 dark:text-white ${hebrewHeading.fontClass}`}>
                      {user?.username}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="w-4 h-4 text-gray-500" />
                      <span className={`text-sm text-gray-600 dark:text-gray-400 ${mixedBody.fontClass}`}>
                        {getRoleName(user?.role || '')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    ערוך פרופיל
                  </button>
                )}
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Username Field */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${mixedBody.fontClass}`}>
                  <User className="w-4 h-4" />
                  שם משתמש
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                    isEditing 
                      ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700' 
                      : 'border-transparent bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed'
                  } ${errors.username ? 'border-red-500' : ''}`}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.username}
                  </p>
                )}
              </div>
              
              {/* Email Field */}
              <div>
                <label className={`flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${mixedBody.fontClass}`}>
                  <Mail className="w-4 h-4" />
                  כתובת אימייל
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                    isEditing 
                      ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700' 
                      : 'border-transparent bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed'
                  } ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>
              
              {/* Password Change Section */}
              {isEditing && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
                  >
                    <Lock className="w-4 h-4" />
                    <span className={mixedBody.fontClass}>
                      {showPasswordChange ? 'ביטול שינוי סיסמה' : 'שנה סיסמה'}
                    </span>
                  </button>
                  
                  {showPasswordChange && (
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${mixedBody.fontClass}`}>
                          סיסמה נוכחית
                        </label>
                        <input
                          type="password"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 ${
                            errors.currentPassword ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.currentPassword && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.currentPassword}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${mixedBody.fontClass}`}>
                          סיסמה חדשה
                        </label>
                        <input
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 ${
                            errors.newPassword ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.newPassword && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.newPassword}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ${mixedBody.fontClass}`}>
                          אימות סיסמה חדשה
                        </label>
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 ${
                            errors.confirmPassword ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.confirmPassword && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'שומר...' : 'שמור שינויים'}</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ביטול
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </AdminClientLayout>
  );
} 