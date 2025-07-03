'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/LoadingSystem';
import { EmptyState } from '@/components/EmptyState';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PERMISSION_GROUPS } from '@/lib/permissions';

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
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, UserPermission>>({});
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, UserPermission>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'data_manager' as 'admin' | 'data_manager' | 'driver_manager',
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
      setCurrentUser(parsedUser);
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
        return <Shield className="h-3 w-3" />;
      case 'data_manager':
        return <User className="h-3 w-3" />;
      case 'driver_manager':
        return <Car className="h-3 w-3" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner showText text="טוען משתמשים..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ניהול משתמשים</CardTitle>
                <CardDescription>ניהול משתמשים, תפקידים והרשאות</CardDescription>
              </div>
              <Button 
                onClick={() => {
                  resetForm();
                  setShowCreateDialog(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 ml-2" />
                משתמש חדש
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <EmptyState
                icon={<User className="h-12 w-12" />}
                title="אין משתמשים"
                description="לחץ על 'משתמש חדש' כדי להוסיף משתמש ראשון"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם משתמש</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">תפקיד</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">התחברות אחרונה</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : user.role === 'driver_manager' ? 'outline' : 'secondary'}
                            className="gap-1"
                          >
                            {getRoleIcon(user.role)}
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.isActive !== false ? 'default' : 'destructive'}
                            className={`gap-1 ${user.isActive !== false ? 'bg-green-50 text-green-700 hover:bg-green-50' : ''}`}
                          >
                            {user.isActive !== false ? (
                              <><UserCheck className="h-3 w-3" /> פעיל</>
                            ) : (
                              <><UserX className="h-3 w-3" /> לא פעיל</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin 
                            ? new Date(user.lastLogin).toLocaleString('he-IL')
                            : 'טרם התחבר'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                              disabled={user._id === currentUser?.id}
                              title="ערוך משתמש"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPermissionsDialog(user)}
                              disabled={user._id === currentUser?.id}
                              title="נהל הרשאות"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUserId(user._id)}
                              disabled={user._id === currentUser?.id}
                              title="מחק משתמש"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>ניהול הרשאות - {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              התאם אישית את ההרשאות עבור המשתמש. הרשאות ברירת מחדל נקבעות לפי התפקיד.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="flex items-center gap-2 mb-4">
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
          )}

          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="space-y-6">
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