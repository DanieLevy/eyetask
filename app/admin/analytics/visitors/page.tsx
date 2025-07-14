'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Search, Trash2, Edit2, X, Check, ChevronDown, ChevronUp, Filter, User as UserIcon, Calendar, Activity as ActivityIcon, Eye, Clock, Users, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AdminClientLayout from '@/components/AdminClientLayout';
import { useAuth } from '@/components/unified-header/AuthContext';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { Activity } from '../types/analytics';

interface VisitorProfile {
  id?: string;
  visitorId: string;
  name: string;
  firstSeen: string;
  lastSeen: string;
  totalVisits: number;
  totalActions: number;
  metadata?: any;
  deviceInfo?: any;
  isActive: boolean;
}

interface VisitorWithActions extends VisitorProfile {
  actionCount: number;
  recentActions: Activity[];
}

export default function AllVisitorsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  
  // Debug admin status
  useEffect(() => {
    console.log('[AllVisitorsPage] Admin status:', isAdmin);
  }, [isAdmin]);
  
  const [visitors, setVisitors] = useState<VisitorWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null);
  const [editingVisitor, setEditingVisitor] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteVisitorId, setDeleteVisitorId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30');

  // Fetch visitors data
  const fetchVisitorsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch visitors
      const visitorsResponse = await fetch('/api/visitors', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      if (!visitorsResponse.ok) throw new Error('Failed to fetch visitors');
      const visitorsData = await visitorsResponse.json();
      
      // Fetch analytics data for action counts
      const analyticsResponse = await fetch(`/api/analytics?range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      if (!analyticsResponse.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await analyticsResponse.json();
      
      // Combine visitor data with action counts and recent actions
      const visitorsWithActions: VisitorWithActions[] = (visitorsData.profiles || []).map((visitor: VisitorProfile) => {
        const visitorActions = (analyticsData.data?.recentActivities || []).filter(
          (activity: Activity) => activity.visitorId === visitor.visitorId
        );
        
        return {
          ...visitor,
          actionCount: visitorActions.length,
          recentActions: visitorActions.slice(0, 10) // Get last 10 actions
        };
      });
      
      // Sort by action count
      visitorsWithActions.sort((a, b) => b.actionCount - a.actionCount);
      
      setVisitors(visitorsWithActions);
    } catch (error) {
      console.error('Error fetching visitors data:', error);
      toast.error('שגיאה בטעינת נתוני המבקרים');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchVisitorsData();
  }, [fetchVisitorsData]);

  // Handle visitor rename
  const handleRename = async (visitorId: string, newName: string) => {
    try {
      const response = await fetch(`/api/visitors/${visitorId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update visitor');
      }

      toast.success('שם המבקר עודכן בהצלחה');
      setEditingVisitor(null);
      fetchVisitorsData();
    } catch (error) {
      console.error('Error renaming visitor:', error);
      toast.error('שגיאה בעדכון שם המבקר');
    }
  };

  // Handle visitor deletion
  const handleDelete = async (visitorId: string) => {
    try {
      const response = await fetch(`/api/visitors/${visitorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete visitor');
      }

      toast.success('המבקר נמחק בהצלחה');
      setDeleteVisitorId(null);
      fetchVisitorsData();
    } catch (error) {
      console.error('Error deleting visitor:', error);
      toast.error('שגיאה במחיקת המבקר');
    }
  };

  // Handle remove visitor name
  const handleRemoveName = async (visitorId: string) => {
    try {
      const response = await fetch(`/api/visitors/${visitorId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ name: '' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove visitor name');
      }

      toast.success('שם המבקר הוסר בהצלחה');
      fetchVisitorsData();
    } catch (error) {
      console.error('Error removing visitor name:', error);
      toast.error('שגיאה בהסרת שם המבקר');
    }
  };

  // Filter visitors
  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         visitor.visitorId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && visitor.isActive) ||
                         (statusFilter === 'inactive' && !visitor.isActive);
    return matchesSearch && matchesStatus;
  });

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דקות`;
    if (hours < 24) return `לפני ${hours} שעות`;
    return `לפני ${days} ימים`;
  };

  if (loading) {
    return (
      <AdminClientLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
          <Skeleton className="h-10 w-48 mb-6 bg-gradient-to-r from-gray-200 to-gray-300" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </AdminClientLayout>
    );
  }

  // Calculate statistics
  const activeVisitors = visitors.filter(v => v.isActive).length;
  const totalActions = visitors.reduce((sum, v) => sum + v.actionCount, 0);
  const avgActionsPerVisitor = visitors.length > 0 ? Math.round(totalActions / visitors.length) : 0;

  return (
    <AdminClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/admin/analytics')}
                  className="hover:bg-white dark:hover:bg-gray-800"
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזרה
                </Button>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ניהול מבקרים
                  </h1>
                  <p className="text-muted-foreground mt-1">נהל וצפה בפעילות המבקרים באתר</p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 animate-scale-in" style={{ animationDelay: '100ms' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">סך המבקרים</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{visitors.length}</p>
                  </div>
                  <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 animate-scale-in" style={{ animationDelay: '200ms' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">מבקרים פעילים</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">{activeVisitors}</p>
                  </div>
                  <div className="p-3 bg-green-200 dark:bg-green-800 rounded-full">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 animate-scale-in" style={{ animationDelay: '300ms' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">ממוצע פעולות</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{avgActionsPerVisitor}</p>
                  </div>
                  <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-full">
                    <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-0 shadow-lg animate-slide-up">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="חיפוש לפי שם או מזהה..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10 border-gray-200 dark:border-gray-700"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48 border-gray-200 dark:border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל המבקרים</SelectItem>
                      <SelectItem value="active">פעילים</SelectItem>
                      <SelectItem value="inactive">לא פעילים</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full sm:w-32 border-gray-200 dark:border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">היום</SelectItem>
                      <SelectItem value="7">7 ימים</SelectItem>
                      <SelectItem value="30">30 יום</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visitors List */}
          <div className="space-y-4">
            {filteredVisitors.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-muted-foreground">לא נמצאו מבקרים התואמים את החיפוש</p>
                </CardContent>
              </Card>
            ) : (
              filteredVisitors.map((visitor, index) => {
                const isExpanded = expandedVisitor === visitor.visitorId;
                const isEditing = editingVisitor === visitor.visitorId;

                return (
                  <Card 
                    key={visitor.visitorId} 
                    className={cn(
                      "border-0 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl",
                      "animate-slide-up hover:scale-[1.01]"
                    )}
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  >
                    <CardHeader 
                      className={cn(
                        "cursor-pointer transition-all duration-300",
                        isExpanded ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                      onClick={() => setExpandedVisitor(isExpanded ? null : visitor.visitorId)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start lg:items-center gap-4">
                          <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex-shrink-0">
                            <UserIcon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="h-8 w-full max-w-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRename(visitor.visitorId, editingName);
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVisitor(null);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <h3 className="font-semibold text-lg truncate">{visitor.name}</h3>
                                <p className="text-sm text-muted-foreground">מזהה: {visitor.visitorId}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={visitor.isActive ? "default" : "secondary"}
                              className={cn(
                                "px-3 py-1",
                                visitor.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""
                              )}
                            >
                              {visitor.isActive ? 'פעיל' : 'לא פעיל'}
                            </Badge>
                            
                            <Badge variant="outline" className="px-3 py-1">
                              <Eye className="h-3 w-3 ml-1" />
                              {visitor.totalVisits} ביקורים
                            </Badge>
                            
                            <Badge variant="outline" className="px-3 py-1">
                              <ActivityIcon className="h-3 w-3 ml-1" />
                              {visitor.actionCount} פעולות
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {isAdmin && (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingVisitor(visitor.visitorId);
                                    setEditingName(visitor.name);
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                  title="ערוך שם"
                                >
                                  <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveName(visitor.visitorId)}
                                  className="h-8 w-8 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                  title="הסר שם"
                                >
                                  <UserIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteVisitorId(visitor.visitorId)}
                                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                                  title="מחק מבקר"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </div>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/analytics/visitors/${visitor.visitorId}`);
                              }}
                              title="צפה בפרטים מלאים"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="border-t border-gray-200 dark:border-gray-700 pt-6 pb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">ביקור ראשון</p>
                              <p className="font-medium">{formatTimeAgo(visitor.firstSeen)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">ביקור אחרון</p>
                              <p className="font-medium">{formatTimeAgo(visitor.lastSeen)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">סך הפעולות</p>
                              <p className="font-medium">{visitor.totalActions}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-100">פעולות אחרונות</h4>
                          {visitor.recentActions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">אין פעולות לתצוגה</p>
                          ) : (
                            <div className="space-y-3">
                              {visitor.recentActions.map((action) => (
                                <div key={action._id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "mt-0.5",
                                      action.category === 'view' && "border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400",
                                      action.category === 'action' && "border-green-300 text-green-600 dark:border-green-700 dark:text-green-400"
                                    )}
                                  >
                                    {action.category}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{action.action}</p>
                                    {action.target && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {action.target.type}: {action.target.name || action.target.id}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={
                                        action.severity === 'success' ? 'default' :
                                        action.severity === 'warning' ? 'secondary' :
                                        action.severity === 'error' ? 'destructive' :
                                        'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {action.severity}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {formatTimeAgo(action.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <DeleteConfirmationDialog
            open={!!deleteVisitorId}
            onOpenChange={(open) => !open && setDeleteVisitorId(null)}
            onConfirm={() => deleteVisitorId && handleDelete(deleteVisitorId)}
            title="מחיקת מבקר"
            description="האם אתה בטוח שברצונך למחוק את המבקר? פעולה זו תמחק את כל הנתונים הקשורים למבקר ואינה ניתנת לביטול."
          />
        </div>
      </div>
    </AdminClientLayout>
  );
} 