// Analytics type definitions

export interface DailyStats {
  date: string;
  visits: number;
  uniqueVisitors: number;
  actions: number;
  logins?: number;
}

export interface ActivityLogEntry {
  id: string;
  userId?: string;
  username?: string;
  userRole: string;
  action: string;
  category: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  visitorId?: string;
  visitorName?: string;
}

export interface TopUser {
  id: string;
  role: string;
  username: string;
  email: string;
  actionCount: number;
  lastActive?: string;
}

export interface AnalyticsMetrics {
  todayVisitors: number;
  weekVisitors: number;
  totalActions: number;
  activeUsers?: number;
}

export interface AnalyticsData {
  metrics: AnalyticsMetrics;
  recentActivities: ActivityLogEntry[];
  topUsers: TopUser[];
  dailyStats?: Record<string, DailyStats>;
  lastUpdated: Date;
}

export interface VisitorProfile {
  id: string;
  visitorId: string;
  name: string;
  firstSeen: string;
  lastSeen: string;
  totalVisits: number;
  totalActions: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  deviceInfo?: Record<string, unknown>;
}

export interface VisitorSession {
  id: string;
  visitorId: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  pageViews: number;
  actions: number;
  pagesVisited: string[];
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

export interface VisitorActivity {
  profile: VisitorProfile;
  sessions: VisitorSession[];
  activities: ActivityLogEntry[];
}

