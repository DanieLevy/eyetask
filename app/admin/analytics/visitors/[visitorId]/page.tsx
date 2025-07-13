'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  ArrowRight,
  User,
  Activity,
  Clock,
  Calendar,
  Eye,
  MousePointerClick,
  Target,
  ChevronRight,
  LogIn,
  ExternalLink,
  FileText,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import AdminPageWrapper from '@/components/AdminPageWrapper';

interface VisitorActivity {
  id: string;
  timestamp: string;
  action: string;
  category: string;
  target?: {
    id: string;
    type: string;
    name?: string;
  };
  metadata?: any;
}

interface VisitorSession {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  pageViews: number;
  actions: number;
  pagesVisited: string[];
}

interface VisitorProfile {
  id: string;
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

interface VisitorData {
  visitor: VisitorProfile;
  activities: VisitorActivity[];
  sessions: VisitorSession[];
  stats: {
    totalActions: number;
    totalVisits: number;
    totalSessions: number;
    averageSessionDuration: number;
  };
}

function VisitorProfileContent({ params }: { params: Promise<{ visitorId: string }> }) {
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string>('');
  const router = useRouter();
  const hebrewFont = useHebrewFont('heading');
  const mixedFont = useMixedFont('body');

  useEffect(() => {
    async function loadParams() {
      const { visitorId: id } = await params;
      setVisitorId(id);
    }
    loadParams();
  }, [params]);

  useEffect(() => {
    if (visitorId) {
      fetchVisitorData();
    }
  }, [visitorId]);

  const fetchVisitorData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin');
        return;
      }

      const response = await fetch(`/api/visitors/${visitorId}/activity`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch visitor data');
      }

      const result = await response.json();
      if (result.success) {
        setVisitorData(result);
      } else {
        throw new Error(result.error || 'Failed to load visitor data');
      }
    } catch (error) {
      logger.error('Error fetching visitor data', 'VISITOR_PROFILE', undefined, error as Error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'view': return <Eye className="h-3 w-3" />;
      case 'project': return <Target className="h-3 w-3" />;
      case 'action': return <MousePointerClick className="h-3 w-3" />;
      case 'system': return <Shield className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'view': return 'from-blue-500 to-blue-600';
      case 'project': return 'from-purple-500 to-purple-600';
      case 'action': return 'from-green-500 to-green-600';
      case 'system': return 'from-gray-500 to-gray-600';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'לא ידוע';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours} שעות ${minutes} דקות`;
    } else if (minutes > 0) {
      return `${minutes} דקות ${secs} שניות`;
    } else {
      return `${secs} שניות`;
    }
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: he });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !visitorData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-500">שגיאה בטעינת נתוני המבקר</p>
        <Button onClick={() => router.push('/admin/analytics')}>
          חזרה לניתוח נתונים
        </Button>
      </div>
    );
  }

  const { visitor, activities, sessions, stats } = visitorData;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/analytics')}
          className="gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className={cn("text-sm text-muted-foreground", mixedFont)}>פרופיל מבקר</span>
      </div>

      {/* Visitor Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {visitor.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className={cn("text-2xl", hebrewFont)}>{visitor.name}</CardTitle>
                <CardDescription>מזהה: {visitor.visitorId}</CardDescription>
              </div>
            </div>
            <Badge variant={visitor.isActive ? "default" : "secondary"}>
              {visitor.isActive ? 'פעיל' : 'לא פעיל'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{stats.totalVisits}</p>
              <p className="text-sm text-muted-foreground">ביקורים</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{stats.totalActions}</p>
              <p className="text-sm text-muted-foreground">פעולות</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
              <p className="text-sm text-muted-foreground">הפעלות</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{formatDuration(Math.round(stats.averageSessionDuration))}</p>
              <p className="text-sm text-muted-foreground">זמן ממוצע</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">נרשם:</span>
              <span className={mixedFont.fontClass}>{formatDateTime(visitor.firstSeen)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">ביקור אחרון:</span>
              <span className={mixedFont.fontClass}>{formatDateTime(visitor.lastSeen)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activities">
            <Activity className="h-4 w-4 mr-2" />
            פעילות
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <LogIn className="h-4 w-4 mr-2" />
            הפעלות
          </TabsTrigger>
        </TabsList>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">היסטוריית פעילות</CardTitle>
              <CardDescription>כל הפעולות שביצע המבקר במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn(
                        "p-2 rounded-md bg-gradient-to-br text-white",
                        getCategoryColor(activity.category)
                      )}>
                        {getCategoryIcon(activity.category)}
                      </div>
                      <div className="flex-1">
                        <p className={cn("font-medium", mixedFont)}>{activity.action}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{formatDateTime(activity.timestamp)}</span>
                          {activity.target && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {activity.target.name || activity.target.id}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  אין פעילות מתועדת עבור מבקר זה
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">היסטוריית הפעלות</CardTitle>
              <CardDescription>כל ההפעלות של המבקר במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn("font-medium", mixedFont)}>
                          {formatDateTime(session.startedAt)}
                        </span>
                        <Badge variant="secondary">
                          {formatDuration(session.durationSeconds || 0)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">דפים:</span>
                          <span>{session.pageViews}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">פעולות:</span>
                          <span>{session.actions}</span>
                        </div>
                      </div>
                      {session.pagesVisited.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">דפים שנצפו:</p>
                          <div className="flex flex-wrap gap-1">
                            {session.pagesVisited.map((page, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {page}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  אין הפעלות מתועדות עבור מבקר זה
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function VisitorProfilePage({ params }: { params: Promise<{ visitorId: string }> }) {
  return (
    <AdminPageWrapper>
      <VisitorProfileContent params={params} />
    </AdminPageWrapper>
  );
} 