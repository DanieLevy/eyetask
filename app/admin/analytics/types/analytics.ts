export interface Activity {
  _id: string;
  timestamp: Date;
  userId: string;
  username: string;
  userRole: string;
  visitorId?: string;
  visitorName?: string;
  action: string;
  category: string;
  target?: {
    id: string;
    type: string;
    name?: string;
  };
  severity: string;
}

export interface User {
  userId: string;
  username: string;
  role: string;
  actionCount: number;
  isVisitor?: boolean;
}

export interface Metrics {
  todayVisitors: number;
  weekVisitors: number;
  totalActions: number;
}

export interface AnalyticsData {
  metrics: Metrics;
  recentActivities: Activity[];
  topUsers: User[];
  lastUpdated: Date;
}

export interface TimeRange {
  value: string;
  label: string;
}

export const TIME_RANGES: TimeRange[] = [
  { value: '1', label: 'היום' },
  { value: '7', label: '7 ימים' },
  { value: '30', label: '30 יום' }
]; 