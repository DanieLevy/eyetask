'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHebrewFont } from '@/hooks/useFont';
import { useMixedFont } from '@/hooks/useFont';
import { useAuth } from '@/components/unified-header/AuthContext';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  UserCheck, 
  UserX,
  Shield,
  User,
  Car,
  Key,
  Settings,
  AlertCircle,
  Mail,
  Calendar,
  Clock,
  MoreVertical,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/LoadingSystem';
import { EmptyState } from '@/components/EmptyState';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PERMISSION_GROUPS } from '@/lib/permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'data_manager' | 'driver_manager';
  isActive?: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface UserPermission {
  key: string;
  value: boolean;
  description: string;
  source: 'role' | 'user';
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, UserPermission>>({});
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, UserPermission>>({});
  const router = useRouter();
  const { user: currentUser, refreshPermissions } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'driver_manager' as 'admin' | 'data_manager' | 'driver_manager',
    isActive: true
  });

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    if (!token || !userData) {
      router.push('/admin');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin') {
        toast.error('Only admins can access user management');
        router.push('/admin/dashboard');
        return;
      }
      // setCurrentUser(parsedUser); // This line is removed as per new_code
    } catch (error) {
      router.push('/admin');
      return;
    }

    // Track page visit
    const trackVisit = async () => {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            page: 'admin_users',
            action: 'page_view'
          })
        });
      } catch (error) {
        console.error('Failed to track visit:', error);
      }
    };

    trackVisit();
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/users/${userId}/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();
      if (data.success) {
        setUserPermissions(data.permissions);
        setOriginalPermissions(JSON.parse(JSON.stringify(data.permissions)));
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // Only send changed permissions
      const changedPermissions: Record<string, boolean> = {};
      Object.entries(userPermissions).forEach(([key, perm]) => {
        if (originalPermissions[key]?.value !== perm.value) {
          changedPermissions[key] = perm.value;
        }
      });

      if (Object.keys(changedPermissions).length === 0) {
        toast.info('לא בוצעו שינויים בהרשאות');
        setShowPermissionsDialog(false);
        return;
      }

      const response = await fetch(`/api/users/${selectedUser._id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions: changedPermissions })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('הרשאות עודכנו בהצלחה');
        setShowPermissionsDialog(false);
        setSelectedUser(null);
        
        // If updating current user's permissions, refresh them in auth context
        if (currentUser && selectedUser._id === currentUser.id) {
          console.log('Updated current user permissions, refreshing auth context...');
          await refreshPermissions();
        }
      } else {
        toast.error(data.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setOperationLoading(false);
    }
  };

  const togglePermission = (key: string) => {
    setUserPermissions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: !prev[key].value,
        source: 'user' // Mark as user override
      }
    }));
  };

  const openPermissionsDialog = async (user: User) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
    await fetchUserPermissions(user._id);
  };

  const handleCreateUser = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          isActive: formData.isActive
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('User created successfully');
        setShowCreateDialog(false);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const updates: any = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive
      };

      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setOperationLoading(false);
          return;
        }
        updates.password = formData.password;
      }

      const response = await fetch(`/api/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('User updated successfully');
        setShowEditDialog(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setOperationLoading(false);
      setDeleteUserId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'data_manager',
      isActive: true
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      isActive: user.isActive ?? true
    });
    setShowEditDialog(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'data_manager':
        return <User className="h-4 w-4" />;
      case 'driver_manager':
        return <Car className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'מנהל';
      case 'data_manager':
        return 'מנהל נתונים';
      case 'driver_manager':
        return 'מנהל נהגים';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'data_manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'driver_manager':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoadingSpinner showText text="טוען משתמשים..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header Section */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">ניהול משתמשים</h1>
                <p className="text-sm text-muted-foreground">ניהול משתמשים, תפקידים והרשאות</p>
              </div>
              <Button 
                onClick={() => {
                  resetForm();
                  setShowCreateDialog(true);
                }}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">משתמש חדש</span>
                <span className="sm:hidden">חדש</span>
              </Button>
            </div>
            
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי שם או אימייל..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="סנן לפי תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התפקידים</SelectItem>
                  <SelectItem value="admin">מנהלים</SelectItem>
                  <SelectItem value="data_manager">מנהלי נתונים</SelectItem>
                  <SelectItem value="driver_manager">מנהלי נהגים</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={<User className="h-12 w-12" />}
            title={searchQuery || roleFilter !== 'all' ? "לא נמצאו משתמשים" : "אין משתמשים"}
            description={searchQuery || roleFilter !== 'all' ? "נסה לשנות את החיפוש או הסינון" : "לחץ על 'משתמש חדש' כדי להוסיף משתמש ראשון"}
          />
        ) : (
          <div className="grid gap-4 md:gap-6">
            {/* User Cards - Mobile First Design */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => (
                <Card 
                  key={user._id} 
                  className="overflow-hidden hover:shadow-lg transition-all duration-200 border-border/50"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          {user.username}
                          {user._id === currentUser?.id && (
                            <Badge variant="secondary" className="text-xs">אתה</Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                      
                      {/* Action Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            disabled={user._id === currentUser?.id}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Pencil className="h-4 w-4 ml-2" />
                            ערוך פרטים
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPermissionsDialog(user)}>
                            <Key className="h-4 w-4 ml-2" />
                            נהל הרשאות
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeleteUserId(user._id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            מחק משתמש
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Role and Status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge 
                        variant="outline"
                        className={`gap-1 border ${getRoleColor(user.role)}`}
                      >
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </Badge>
                      
                      <Badge 
                        variant={user.isActive !== false ? 'default' : 'destructive'}
                        className={`gap-1 ${
                          user.isActive !== false 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100' 
                            : ''
                        }`}
                      >
                        {user.isActive !== false ? (
                          <><UserCheck className="h-3 w-3" /> פעיל</>
                        ) : (
                          <><UserX className="h-3 w-3" /> לא פעיל</>
                        )}
                      </Badge>
                    </div>
                    
                    {/* Meta Information */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>נוצר: {new Date(user.createdAt).toLocaleDateString('he-IL')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          התחברות אחרונה: {
                            user.lastLogin 
                              ? new Date(user.lastLogin).toLocaleDateString('he-IL')
                              : 'טרם התחבר'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>יצירת משתמש חדש</DialogTitle>
            <DialogDescription>
              הזן את פרטי המשתמש החדש
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">שם משתמש</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="username123"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">אימות סיסמה</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">תפקיד</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">מנהל</SelectItem>
                  <SelectItem value="data_manager">מנהל נתונים</SelectItem>
                  <SelectItem value="driver_manager">מנהל נהגים</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive" className="mr-2">משתמש פעיל</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={operationLoading}
            >
              ביטול
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={operationLoading}
            >
              {operationLoading ? 'יוצר...' : 'צור משתמש'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>עריכת משתמש</DialogTitle>
            <DialogDescription>
              ערוך את פרטי המשתמש
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-username">שם משתמש</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">אימייל</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">סיסמה חדשה (השאר ריק אם לא רוצה לשנות)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-confirmPassword">אימות סיסמה חדשה</Label>
              <Input
                id="edit-confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">תפקיד</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">מנהל</SelectItem>
                  <SelectItem value="data_manager">מנהל נתונים</SelectItem>
                  <SelectItem value="driver_manager">מנהל נהגים</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="edit-isActive" className="mr-2">משתמש פעיל</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              disabled={operationLoading}
            >
              ביטול
            </Button>
            <Button 
              onClick={handleUpdateUser}
              disabled={operationLoading}
            >
              {operationLoading ? 'מעדכן...' : 'עדכן משתמש'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog - Improved for Mobile */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>ניהול הרשאות - {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              התאם אישית את ההרשאות עבור המשתמש. הרשאות ברירת מחדל נקבעות לפי התפקיד.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  {getRoleIcon(selectedUser.role)}
                  {getRoleLabel(selectedUser.role)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  הרשאות המסומנות ב-
                  <Badge variant="secondary" className="mx-1 text-xs">תפקיד</Badge>
                  הן ברירת המחדל לתפקיד זה
                </span>
              </div>
            </div>
          )}

          <ScrollArea className="h-[400px] w-full px-6">
            <div className="space-y-6 pb-6">
              {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                <div key={groupName}>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {groupName}
                  </h3>
                  <div className="space-y-2 mr-6">
                    {permissions.map(({ key, label }) => {
                      const permission = userPermissions[key];
                      if (!permission) return null;
                      
                      return (
                        <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={key}
                              checked={permission.value}
                              onCheckedChange={() => togglePermission(key)}
                            />
                            <Label 
                              htmlFor={key} 
                              className="cursor-pointer flex items-center gap-2"
                            >
                              {label}
                              {permission.source === 'role' && (
                                <Badge variant="secondary" className="text-xs">תפקיד</Badge>
                              )}
                              {permission.source === 'user' && (
                                <Badge variant="default" className="text-xs">מותאם</Badge>
                              )}
                            </Label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-6 pt-4 space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                שינויים בהרשאות ייכנסו לתוקף בהתחברות הבאה של המשתמש
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowPermissionsDialog(false)}
                disabled={operationLoading}
              >
                ביטול
              </Button>
              <Button 
                onClick={handleUpdatePermissions}
                disabled={operationLoading}
              >
                {operationLoading ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        onConfirm={() => deleteUserId && handleDeleteUser(deleteUserId)}
        title="מחיקת משתמש"
        description="האם אתה בטוח שברצונך למחוק משתמש זה? פעולה זו אינה ניתנת לביטול."
        loading={operationLoading}
      />
    </div>
  );
} 