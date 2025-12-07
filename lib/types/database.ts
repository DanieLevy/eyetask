// Database Row Types (extends Supabase generated types)

export interface DatabaseRow {
  id: string;
  created_at: string;
  updated_at: string;
  mongodb_id?: string | null;
}

export interface AppUser extends DatabaseRow {
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'data_manager' | 'driver_manager';
  is_active: boolean;
  last_login?: string | null;
  created_by?: string | null;
  last_modified_by?: string | null;
  last_modified_at?: string | null;
  permission_overrides?: Record<string, boolean>;
  hide_from_analytics?: boolean;
}

export interface Project extends DatabaseRow {
  name: string;
  description?: string | null;
  is_active: boolean;
  color?: string | null;
  priority: number;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  notes?: string | null;
  image?: string | null;
}

export interface Task extends DatabaseRow {
  project_id: string;
  title: string;
  subtitle?: string | null;
  images?: string[] | null;
  dataco_number: string;
  description: Record<string, unknown>;
  type?: string[] | null;
  locations?: string[] | null;
  amount_needed?: number | null;
  target_car?: string[] | null;
  lidar: boolean;
  day_time?: string[] | null;
  priority: number;
  is_visible: boolean;
}

export interface Subtask extends DatabaseRow {
  task_id: string;
  title: string;
  subtitle?: string | null;
  images?: string[] | null;
  dataco_number: string;
  type: 'events' | 'hours' | 'loops';
  amount_needed?: number | null;
  labels?: string[] | null;
  target_car?: string[] | null;
  weather?: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed' | null;
  scene?: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed' | null;
  day_time?: string[] | null;
  is_visible: boolean;
}

export interface DailyUpdate extends DatabaseRow {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  duration_type?: 'hours' | 'days' | 'permanent' | null;
  duration_value?: number | null;
  expires_at?: string | null;
  is_active: boolean;
  is_pinned: boolean;
  is_hidden: boolean;
  target_audience?: string[] | null;
  project_id?: string | null;
  is_general: boolean;
  created_by?: string | null;
}

export interface FeedbackTicket extends DatabaseRow {
  ticket_number: string;
  user_name: string;
  user_email?: string | null;
  user_phone?: string | null;
  title: string;
  description: string;
  category: 'bug' | 'feature_request' | 'improvement' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  issue_type?: string | null;
  related_to?: Record<string, unknown> | null;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string | null;
  tags?: string[] | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  browser_info?: string | null;
  is_urgent: boolean;
  customer_satisfaction?: number | null;
}

export interface PushNotification extends DatabaseRow {
  title: string;
  body: string;
  icon?: string | null;
  badge?: string | null;
  image?: string | null;
  url?: string | null;
  tag?: string | null;
  require_interaction: boolean;
  target_roles?: string[] | null;
  target_users?: string[] | null;
  sent_by?: string | null;
  sent_at: string;
  delivery_stats: {
    sent: number;
    delivered: number;
    clicked: number;
    failed: number;
  };
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

