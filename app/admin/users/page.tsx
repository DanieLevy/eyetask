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
  Car
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'data_manager' | 'driver_manager';
  isActive?: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
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
              <CardTitle>ניהול משתמשים</CardTitle>
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
                            {user.role === 'admin' ? (
                              <><Shield className="h-3 w-3" /> מנהל</>
                            ) : user.role === 'data_manager' ? (
                              <><User className="h-3 w-3" /> מנהל נתונים</>
                            ) : (
                              <><Car className="h-3 w-3" /> מנהל נהגים</>
                            )}
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
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUserId(user._id)}
                              disabled={user._id === currentUser?.id}
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
              עדכן את פרטי המשתמש
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
              <Label htmlFor="edit-password">סיסמה חדשה (אופציונלי)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="השאר ריק אם לא רוצה לשנות"
              />
            </div>
            {formData.password && (
              <div className="grid gap-2">
                <Label htmlFor="edit-confirmPassword">אימות סיסמה</Label>
                <Input
                  id="edit-confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-role">תפקיד</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                disabled={selectedUser?._id === currentUser?.id}
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
              onClick={() => {
                setShowEditDialog(false);
                setSelectedUser(null);
              }}
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

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        onConfirm={() => deleteUserId && handleDeleteUser(deleteUserId)}
        title="מחיקת משתמש"
        description="האם אתה בטוח שברצונך למחוק משתמש זה? פעולה זו אינה ניתנת לביטול."
        confirmText="מחק משתמש"
        loading={operationLoading}
      />
    </div>
  );
} 