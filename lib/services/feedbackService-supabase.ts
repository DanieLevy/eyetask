import { getSupabaseClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { 
  FeedbackTicket, 
  FeedbackResponse, 
  FeedbackInternalNote,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  AddResponseRequest,
  AddInternalNoteRequest,
  FeedbackFilterOptions,
  FeedbackStats,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackCategory
} from '@/lib/types/feedback';

class FeedbackServiceSupabase {
  private client;
  
  constructor() {
    // Use service role client to bypass RLS
    this.client = getSupabaseClient(true);
    
    if (!this.client) {
      logger.error('Failed to initialize Supabase service client', 'FEEDBACK_SERVICE', {
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE
      });
      throw new Error('Supabase service client not available');
    }
    
    logger.info('FeedbackService initialized', 'FEEDBACK_SERVICE', {
      clientType: 'service_role',
      hasClient: !!this.client
    });
  }

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    // Count tickets created this year
    const { count } = await this.client
      .from('feedback_tickets')
      .select('ticket_number', { count: 'exact', head: true })
      .like('ticket_number', `FB-${year}-%`);
    
    const nextNumber = ((count || 0) + 1).toString().padStart(3, '0');
    return `FB-${year}-${nextNumber}`;
  }

  /**
   * Create a new feedback ticket
   */
  async createTicket(
    data: CreateFeedbackRequest, 
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<string> {
    try {
      const ticketNumber = await this.generateTicketNumber();
      const now = new Date().toISOString();
      
      // Map frontend categories to database enum values
      const mapCategoryToDb = (category: string): string => {
        const categoryMap: Record<string, string> = {
          'general_support': 'other',
          'technical_issue': 'bug',
          'feature_request': 'feature_request',
          'bug_report': 'bug',
          'task_related': 'other',
          'subtask_related': 'other',
          'project_related': 'other',
          'account_help': 'other',
          'feedback': 'other',
          'complaint': 'other',
          'suggestion': 'improvement'
        };
        return categoryMap[category] || 'other';
      };
      
      // Determine initial priority based on category and urgency
      let priority: FeedbackPriority = 'normal';
      if (data.isUrgent) {
        priority = 'urgent';
      } else if (data.category === 'bug_report' || data.category === 'technical_issue') {
        priority = 'high';
      } else if (data.category === 'feature_request' || data.category === 'suggestion') {
        priority = 'low';
      }

      // Get related item title if specified
      let relatedTo = undefined;
      if (data.relatedTo) {
        const relatedTitle = await this.getRelatedItemTitle(data.relatedTo.type, data.relatedTo.id);
        relatedTo = {
          ...data.relatedTo,
          title: relatedTitle
        };
      }

      const { data: ticket, error } = await this.client
        .from('feedback_tickets')
        .insert({
          ticket_number: ticketNumber,
          user_name: data.userName.trim(),
          user_email: data.userEmail?.trim() || null,
          user_phone: data.userPhone?.trim() || null,
          title: data.title.trim(),
          description: data.description.trim(),
          category: mapCategoryToDb(data.category), // Use mapped value
          priority,
          issue_type: data.issueType || null,
          related_to: relatedTo || null,
          status: 'new',
          tags: [],
          user_agent: metadata?.userAgent || null,
          ip_address: metadata?.ipAddress || null,
          is_urgent: data.isUrgent || false
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create feedback ticket', 'FEEDBACK_SERVICE', undefined, error);
        throw error;
      }

      logger.info('Feedback ticket created', 'FEEDBACK_SERVICE', {
        ticketId: ticket.id,
        ticketNumber,
        category: data.category,
        userName: data.userName
      });

      return ticket.id;
    } catch (error) {
      logger.error('Failed to create feedback ticket', 'FEEDBACK_SERVICE', undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get related item title (task, subtask, project)
   */
  private async getRelatedItemTitle(type: string, id: string): Promise<string> {
    try {
      switch (type) {
        case 'project':
          const { data: project } = await this.client
            .from('projects')
            .select('name')
            .eq('id', id)
            .single();
          return project?.name || 'Unknown Project';
        
        case 'task':
          const { data: task } = await this.client
            .from('tasks')
            .select('title')
            .eq('id', id)
            .single();
          return task?.title || 'Unknown Task';
        
        case 'subtask':
          const { data: subtask } = await this.client
            .from('subtasks')
            .select('title')
            .eq('id', id)
            .single();
          return subtask?.title || 'Unknown Subtask';
        
        default:
          return 'Unknown Item';
      }
    } catch (error) {
      logger.error('Failed to get related item title', 'FEEDBACK_SERVICE', { type, id }, error as Error);
      return 'Unknown Item';
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string): Promise<FeedbackTicket | null> {
    try {
      const { data: ticket, error } = await this.client
        .from('feedback_tickets')
        .select('*, feedback_responses(*), feedback_internal_notes(*)')
        .eq('id', ticketId)
        .single();

      if (error) {
        logger.error('Failed to get ticket by ID', 'FEEDBACK_SERVICE', { ticketId }, error);
        return null;
      }

      return this.mapTicketFromDb(ticket);
    } catch (error) {
      logger.error('Failed to get ticket by ID', 'FEEDBACK_SERVICE', { ticketId }, error as Error);
      return null;
    }
  }

  /**
   * Get ticket by ticket number
   */
  async getTicketByNumber(ticketNumber: string): Promise<FeedbackTicket | null> {
    try {
      const { data: ticket, error } = await this.client
        .from('feedback_tickets')
        .select('*, feedback_responses(*), feedback_internal_notes(*)')
        .eq('ticket_number', ticketNumber)
        .single();

      if (error) {
        logger.error('Failed to get ticket by number', 'FEEDBACK_SERVICE', { ticketNumber }, error);
        return null;
      }

      return this.mapTicketFromDb(ticket);
    } catch (error) {
      logger.error('Failed to get ticket by number', 'FEEDBACK_SERVICE', { ticketNumber }, error as Error);
      return null;
    }
  }

  /**
   * Get all tickets with filtering and pagination
   */
  async getTickets(
    filters?: FeedbackFilterOptions,
    page: number = 1,
    limit: number = 20
  ): Promise<{ tickets: FeedbackTicket[]; total: number; hasMore: boolean }> {
    try {
      let query = this.client
        .from('feedback_tickets')
        .select('*, feedback_responses(*), feedback_internal_notes(*)', { count: 'exact' });
      
      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters?.category?.length) {
        query = query.in('category', filters.category);
      }
      
      if (filters?.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      
      if (filters?.isUrgent !== undefined) {
        query = query.eq('is_urgent', filters.isUrgent);
      }
      
      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }
      
      if (filters?.searchTerm) {
        query = query.or(
          `title.ilike.%${filters.searchTerm}%,` +
          `description.ilike.%${filters.searchTerm}%,` +
          `user_name.ilike.%${filters.searchTerm}%,` +
          `ticket_number.ilike.%${filters.searchTerm}%`
        );
      }
      
      if (filters?.tags?.length) {
        query = query.contains('tags', filters.tags);
      }

      // Pagination
      const skip = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(skip, skip + limit - 1);

      const { data: tickets, error, count } = await query;

      if (error) {
        logger.error('Failed to get tickets', 'FEEDBACK_SERVICE', { filters, page, limit }, error);
        throw error;
      }

      return {
        tickets: tickets?.map(t => this.mapTicketFromDb(t)) || [],
        total: count || 0,
        hasMore: skip + (tickets?.length || 0) < (count || 0)
      };
    } catch (error) {
      logger.error('Failed to get tickets', 'FEEDBACK_SERVICE', { filters, page, limit }, error as Error);
      throw error;
    }
  }

  /**
   * Update ticket
   */
  async updateTicket(
    ticketId: string, 
    updates: UpdateFeedbackRequest,
    adminId?: string,
    adminName?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Map fields to database columns
      if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
      if (updates.isUrgent !== undefined) updateData.is_urgent = updates.isUrgent;

      // Handle status changes
      if (updates.status === 'resolved' && !updateData.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }
      
      if (updates.status === 'closed' && !updateData.closed_at) {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await this.client
        .from('feedback_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        logger.error('Failed to update ticket', 'FEEDBACK_SERVICE', { ticketId, updates }, error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to update ticket', 'FEEDBACK_SERVICE', { ticketId, updates }, error as Error);
      throw error;
    }
  }

  /**
   * Delete ticket
   */
  async deleteTicket(ticketId: string, adminId?: string, adminName?: string): Promise<boolean> {
    try {
      logger.info('Attempting to delete ticket', 'FEEDBACK_SERVICE', { 
        ticketId, 
        adminId, 
        adminName,
        hasServiceRole: !!this.client
      });

      // First check if ticket exists
      const { data: existingTicket, error: checkError } = await this.client
        .from('feedback_tickets')
        .select('id')
        .eq('id', ticketId)
        .single();

      if (checkError || !existingTicket) {
        logger.warn('Ticket not found for deletion', 'FEEDBACK_SERVICE', { 
          ticketId, 
          error: checkError?.message 
        });
        return false;
      }

      // Delete the ticket (cascades to responses and notes)
      const { error } = await this.client
        .from('feedback_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) {
        logger.error('Failed to delete ticket', 'FEEDBACK_SERVICE', { 
          ticketId, 
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details
        });
        throw new Error(`Delete failed: ${error.message}`);
      }

      logger.info('Ticket deleted successfully', 'FEEDBACK_SERVICE', { 
        ticketId, 
        deletedBy: adminName 
      });
      return true;
    } catch (error) {
      logger.error('Failed to delete ticket', 'FEEDBACK_SERVICE', { 
        ticketId, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Add response to ticket
   */
  async addResponse(
    ticketId: string,
    responseData: AddResponseRequest,
    authorType: 'admin' | 'user',
    authorName: string,
    authorId?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('feedback_responses')
        .insert({
          ticket_id: ticketId,
          author_type: authorType,
          author_name: authorName,
          author_id: authorId || null,
          content: responseData.content.trim(),
          is_public: responseData.isPublic,
          attachments: responseData.attachments || []
        });

      if (error) {
        logger.error('Failed to add response', 'FEEDBACK_SERVICE', { ticketId, authorType }, error);
        return false;
      }

      // Update ticket's updated_at
      await this.client
        .from('feedback_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      return true;
    } catch (error) {
      logger.error('Failed to add response', 'FEEDBACK_SERVICE', { ticketId, authorType }, error as Error);
      throw error;
    }
  }

  /**
   * Add internal note to ticket
   */
  async addInternalNote(
    ticketId: string,
    noteData: AddInternalNoteRequest,
    authorName: string,
    authorId: string
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('feedback_internal_notes')
        .insert({
          ticket_id: ticketId,
          author_name: authorName,
          author_id: authorId,
          content: noteData.content.trim()
        });

      if (error) {
        logger.error('Failed to add internal note', 'FEEDBACK_SERVICE', { ticketId }, error);
        return false;
      }

      // Update ticket's updated_at
      await this.client
        .from('feedback_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      return true;
    } catch (error) {
      logger.error('Failed to add internal note', 'FEEDBACK_SERVICE', { ticketId }, error as Error);
      throw error;
    }
  }

  /**
   * Get feedback statistics
   */
  async getStats(dateRange?: { start: Date; end: Date }): Promise<FeedbackStats> {
    try {
      let baseQuery = this.client.from('feedback_tickets').select('*');
      
      if (dateRange) {
        baseQuery = baseQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: tickets, error } = await baseQuery;

      if (error) {
        logger.error('Failed to get stats', 'FEEDBACK_SERVICE', { dateRange }, error);
        throw error;
      }

      const stats: FeedbackStats = {
        total: tickets?.length || 0,
        byStatus: {
          new: 0,
          assigned: 0,
          in_progress: 0,
          pending_user: 0,
          resolved: 0,
          closed: 0,
          cancelled: 0
        },
        byCategory: {
          general_support: 0,
          technical_issue: 0,
          feature_request: 0,
          bug_report: 0,
          task_related: 0,
          subtask_related: 0,
          project_related: 0,
          account_help: 0,
          feedback: 0,
          complaint: 0,
          suggestion: 0
        },
        byPriority: {
          urgent: 0,
          high: 0,
          normal: 0,
          low: 0,
          critical: 0
        },
        avgResolutionTime: 0,
        avgResponseTime: 0,
        unassignedCount: 0,
        overdueCount: 0
      };

      let totalResolutionTime = 0;
      let resolvedCount = 0;

      tickets?.forEach(ticket => {
        // By status
        if (ticket.status in stats.byStatus) {
          stats.byStatus[ticket.status as FeedbackStatus]++;
        }

        // By category - map database values back to frontend values
        const mapCategoryFromDb = (dbCategory: string): FeedbackCategory => {
          const reverseMap: Record<string, FeedbackCategory> = {
            'other': 'general_support',
            'bug': 'bug_report',
            'feature_request': 'feature_request',
            'improvement': 'suggestion'
          };
          
          // If it's a known frontend category that was stored before mapping, use it
          if (dbCategory in stats.byCategory) {
            return dbCategory as FeedbackCategory;
          }
          
          // Otherwise map from database value
          return reverseMap[dbCategory] || 'general_support';
        };
        
        const frontendCategory = mapCategoryFromDb(ticket.category);
        if (frontendCategory in stats.byCategory) {
          stats.byCategory[frontendCategory]++;
        }

        // By priority
        if (ticket.priority in stats.byPriority) {
          stats.byPriority[ticket.priority as FeedbackPriority]++;
        }

        // Unassigned
        if (!ticket.assigned_to) {
          stats.unassignedCount!++;
        }

        // Resolution time
        if (ticket.resolved_at && ticket.created_at) {
          const resolutionTime = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      });

      // Calculate average resolution time in hours
      if (resolvedCount > 0) {
        stats.avgResolutionTime = Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60));
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get stats', 'FEEDBACK_SERVICE', { dateRange }, error as Error);
      throw error;
    }
  }

  /**
   * Get available subtasks for dropdown
   */
  async getAvailableSubtasks(): Promise<Array<{ id: string; title: string; taskTitle: string }>> {
    try {
      const { data: subtasks, error } = await this.client
        .from('subtasks')
        .select('id, title, task_id, tasks(title)')
        .eq('is_visible', true)
        .order('title');

      if (error) {
        logger.error('Failed to get available subtasks', 'FEEDBACK_SERVICE', undefined, error);
        return [];
      }

      return subtasks?.map(s => ({
        id: s.id,
        title: s.title,
        taskTitle: (s.tasks as any)?.title || 'Unknown Task'
      })) || [];
    } catch (error) {
      logger.error('Failed to get available subtasks', 'FEEDBACK_SERVICE', undefined, error as Error);
      return [];
    }
  }

  /**
   * Map database category to frontend category
   */
  private mapCategoryFromDb(dbCategory: string): FeedbackCategory {
    const reverseMap: Record<string, FeedbackCategory> = {
      'other': 'general_support',
      'bug': 'bug_report', 
      'feature_request': 'feature_request',
      'improvement': 'suggestion'
    };
    
    // Check if it's already a valid frontend category (for backward compatibility)
    const validCategories: FeedbackCategory[] = [
      'general_support', 'technical_issue', 'feature_request', 'bug_report',
      'task_related', 'subtask_related', 'project_related', 'account_help',
      'feedback', 'complaint', 'suggestion'
    ];
    
    if (validCategories.includes(dbCategory as FeedbackCategory)) {
      return dbCategory as FeedbackCategory;
    }
    
    return reverseMap[dbCategory] || 'general_support';
  }

  /**
   * Map database ticket to FeedbackTicket interface
   */
  private mapTicketFromDb(dbTicket: any): FeedbackTicket {
    return {
      _id: dbTicket.id,
      ticketNumber: dbTicket.ticket_number,
      userName: dbTicket.user_name,
      userEmail: dbTicket.user_email,
      userPhone: dbTicket.user_phone,
      title: dbTicket.title,
      description: dbTicket.description,
      category: this.mapCategoryFromDb(dbTicket.category), // Map back to frontend value
      priority: dbTicket.priority,
      issueType: dbTicket.issue_type,
      relatedTo: dbTicket.related_to,
      status: dbTicket.status,
      tags: dbTicket.tags || [],
      responses: dbTicket.feedback_responses?.map((r: any) => ({
        responseId: r.id,
        authorType: r.author_type,
        authorName: r.author_name,
        authorId: r.author_id,
        content: r.content,
        isPublic: r.is_public,
        attachments: r.attachments || [],
        createdAt: new Date(r.created_at)
      })) || [],
      internalNotes: dbTicket.feedback_internal_notes?.map((n: any) => ({
        noteId: n.id,
        authorName: n.author_name,
        authorId: n.author_id,
        content: n.content,
        createdAt: new Date(n.created_at)
      })) || [],
      assignedTo: dbTicket.assigned_to,
      resolvedAt: dbTicket.resolved_at ? new Date(dbTicket.resolved_at) : undefined,
      closedAt: dbTicket.closed_at ? new Date(dbTicket.closed_at) : undefined,
      createdAt: new Date(dbTicket.created_at),
      updatedAt: new Date(dbTicket.updated_at),
      userAgent: dbTicket.user_agent,
      ipAddress: dbTicket.ip_address,
      isUrgent: dbTicket.is_urgent
    };
  }
}

// Export singleton instance
export const feedbackService = new FeedbackServiceSupabase(); 
