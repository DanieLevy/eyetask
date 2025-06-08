import { ObjectId } from 'mongodb';

export interface FeedbackTicket {
  _id?: ObjectId;
  ticketNumber: string; // Auto-generated unique identifier (e.g., "FB-2024-001")
  
  // User Information
  userName: string;
  userEmail?: string; // Optional contact info
  userPhone?: string; // Optional contact info
  
  // Ticket Content
  title: string;
  description: string;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  issueType: FeedbackIssueType;
  
  // Related Content (if applicable)
  relatedTo?: {
    type: 'project' | 'task' | 'subtask';
    id: string;
    title: string;
  };
  
  // Status & Management
  status: FeedbackStatus;
  assignedTo?: string; // Admin user ID
  tags: string[];
  
  // Responses & Communication
  responses: FeedbackResponse[];
  internalNotes: FeedbackInternalNote[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // Metadata
  userAgent?: string;
  ipAddress?: string;
  browserInfo?: string;
  isUrgent: boolean;
  customerSatisfaction?: number; // 1-5 rating after resolution
}

export interface FeedbackResponse {
  _id?: ObjectId;
  responseId: string;
  authorType: 'admin' | 'user';
  authorName: string;
  authorId?: string; // Admin ID if admin response
  content: string;
  isPublic: boolean; // Whether user can see this response
  attachments?: string[];
  createdAt: Date;
  editedAt?: Date;
}

export interface FeedbackInternalNote {
  _id?: ObjectId;
  noteId: string;
  authorName: string;
  authorId: string; // Admin ID
  content: string;
  createdAt: Date;
  editedAt?: Date;
}

export type FeedbackCategory = 
  | 'general_support'
  | 'technical_issue'
  | 'feature_request'
  | 'bug_report'
  | 'task_related'
  | 'subtask_related'
  | 'project_related'
  | 'account_help'
  | 'feedback'
  | 'complaint'
  | 'suggestion';

export type FeedbackIssueType =
  | 'question'
  | 'problem'
  | 'request'
  | 'bug'
  | 'improvement'
  | 'complaint'
  | 'compliment'
  | 'other';

export type FeedbackPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'critical';

export type FeedbackStatus = 
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'pending_user'
  | 'resolved'
  | 'closed'
  | 'cancelled';

// API Request/Response Types
export interface CreateFeedbackRequest {
  userName: string;
  userEmail?: string;
  userPhone?: string;
  title: string;
  description: string;
  category: FeedbackCategory;
  issueType: FeedbackIssueType;
  relatedTo?: {
    type: 'project' | 'task' | 'subtask';
    id: string;
  };
  isUrgent?: boolean;
}

export interface UpdateFeedbackRequest {
  title?: string;
  description?: string;
  category?: FeedbackCategory;
  priority?: FeedbackPriority;
  status?: FeedbackStatus;
  assignedTo?: string;
  tags?: string[];
  isUrgent?: boolean;
}

export interface AddResponseRequest {
  content: string;
  isPublic: boolean;
  attachments?: string[];
}

export interface AddInternalNoteRequest {
  content: string;
}

export interface FeedbackFilterOptions {
  status?: FeedbackStatus[];
  category?: FeedbackCategory[];
  priority?: FeedbackPriority[];
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
  tags?: string[];
  isUrgent?: boolean;
}

export interface FeedbackStats {
  total: number;
  byStatus: Record<FeedbackStatus, number>;
  byCategory: Record<FeedbackCategory, number>;
  byPriority: Record<FeedbackPriority, number>;
  avgResolutionTime: number; // in hours
  customerSatisfactionAvg: number;
  newToday: number;
  resolvedToday: number;
  overdueTickets: number;
}

// Helper type for frontend display
export interface FeedbackDisplayItem extends Omit<FeedbackTicket, '_id'> {
  id: string;
  timeSinceCreated: string;
  timeSinceUpdated: string;
  isOverdue: boolean;
  relatedItemTitle?: string;
} 