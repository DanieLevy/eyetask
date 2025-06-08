import { mongodb, toObjectId, fromObjectId } from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { activityLogger } from '@/lib/activityLogger';
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
  FeedbackPriority
} from '@/lib/types/feedback';

class FeedbackService {
  
  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const { feedbackTickets } = await mongodb.getCollections();
    
    // Count tickets created this year
    const ticketCount = await feedbackTickets.countDocuments({
      ticketNumber: { $regex: `^FB-${year}-` }
    });
    
    const nextNumber = (ticketCount + 1).toString().padStart(3, '0');
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
      const { feedbackTickets } = await mongodb.getCollections();
      
      const ticketNumber = await this.generateTicketNumber();
      const now = new Date();
      
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

      const ticket: FeedbackTicket = {
        ticketNumber,
        userName: data.userName.trim(),
        userEmail: data.userEmail?.trim(),
        userPhone: data.userPhone?.trim(),
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        priority,
        issueType: data.issueType,
        relatedTo,
        status: 'new',
        tags: [],
        responses: [],
        internalNotes: [],
        createdAt: now,
        updatedAt: now,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        isUrgent: data.isUrgent || false
      };

      const result = await feedbackTickets.insertOne(ticket);
      const ticketId = fromObjectId(result.insertedId);

      // Log activity
      await activityLogger.logActivity({
        userType: 'user',
        action: `יצר פניה חדשה: ${data.title}`,
        category: 'feedback',
        target: {
          id: ticketId,
          type: 'feedback_ticket',
          title: data.title
        },
        details: {
          ticketNumber,
          category: data.category,
          priority,
          userName: data.userName
        },
        severity: 'success',
        isVisible: true
      });

      logger.info('Feedback ticket created', 'FEEDBACK_SERVICE', {
        ticketId,
        ticketNumber,
        category: data.category,
        userName: data.userName
      });

      return ticketId;
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
      const { tasks, subtasks, projects } = await mongodb.getCollections();
      
      switch (type) {
        case 'project':
          const project = await projects.findOne({ _id: toObjectId(id) });
          return project?.name || 'Unknown Project';
        
        case 'task':
          const task = await tasks.findOne({ _id: toObjectId(id) });
          return task?.title || 'Unknown Task';
        
        case 'subtask':
          const subtask = await subtasks.findOne({ _id: toObjectId(id) });
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
      const { feedbackTickets } = await mongodb.getCollections();
      const ticket = await feedbackTickets.findOne({ _id: toObjectId(ticketId) });
      return ticket as FeedbackTicket;
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
      const { feedbackTickets } = await mongodb.getCollections();
      const ticket = await feedbackTickets.findOne({ ticketNumber });
      return ticket as FeedbackTicket;
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
      const { feedbackTickets } = await mongodb.getCollections();
      
      // Build filter query
      const query: any = {};
      
      if (filters?.status?.length) {
        query.status = { $in: filters.status };
      }
      
      if (filters?.category?.length) {
        query.category = { $in: filters.category };
      }
      
      if (filters?.priority?.length) {
        query.priority = { $in: filters.priority };
      }
      
      if (filters?.assignedTo) {
        query.assignedTo = filters.assignedTo;
      }
      
      if (filters?.isUrgent !== undefined) {
        query.isUrgent = filters.isUrgent;
      }
      
      if (filters?.dateRange) {
        query.createdAt = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        };
      }
      
      if (filters?.searchTerm) {
        query.$or = [
          { title: { $regex: filters.searchTerm, $options: 'i' } },
          { description: { $regex: filters.searchTerm, $options: 'i' } },
          { userName: { $regex: filters.searchTerm, $options: 'i' } },
          { ticketNumber: { $regex: filters.searchTerm, $options: 'i' } }
        ];
      }
      
      if (filters?.tags?.length) {
        query.tags = { $in: filters.tags };
      }

      // Get total count
      const total = await feedbackTickets.countDocuments(query);
      
      // Get paginated results
      const skip = (page - 1) * limit;
      const tickets = await feedbackTickets
        .find(query)
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        tickets: tickets as FeedbackTicket[],
        total,
        hasMore: skip + tickets.length < total
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
      const { feedbackTickets } = await mongodb.getCollections();
      
      const updateData: any = {
        ...updates,
        updatedAt: new Date()
      };

      // Handle status changes
      if (updates.status === 'resolved' && !updateData.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      
      if (updates.status === 'closed' && !updateData.closedAt) {
        updateData.closedAt = new Date();
      }

      const result = await feedbackTickets.updateOne(
        { _id: toObjectId(ticketId) },
        { $set: updateData }
      );

      if (result.modifiedCount > 0 && adminId && adminName) {
        // Get ticket for logging
        const ticket = await this.getTicketById(ticketId);
        
        // Log activity
        await activityLogger.logActivity({
          userId: adminId,
          userType: 'admin',
          action: `עדכן פניה: ${ticket?.title || ticketId}`,
          category: 'feedback',
          target: {
            id: ticketId,
            type: 'feedback_ticket',
            title: ticket?.title || 'Unknown Ticket'
          },
          details: {
            ticketNumber: ticket?.ticketNumber,
            updates
          },
          severity: 'info',
          isVisible: true
        });
      }

      return result.modifiedCount > 0;
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
      const { feedbackTickets } = await mongodb.getCollections();
      
      // Get ticket for logging
      const ticket = await this.getTicketById(ticketId);
      
      const result = await feedbackTickets.deleteOne({ _id: toObjectId(ticketId) });

      if (result.deletedCount > 0 && adminId && adminName && ticket) {
        // Log activity
        await activityLogger.logActivity({
          userId: adminId,
          userType: 'admin',
          action: `מחק פניה: ${ticket.title}`,
          category: 'feedback',
          target: {
            id: ticketId,
            type: 'feedback_ticket',
            title: ticket.title
          },
          details: {
            ticketNumber: ticket.ticketNumber,
            reason: 'Admin deletion'
          },
          severity: 'warning',
          isVisible: true
        });
      }

      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Failed to delete ticket', 'FEEDBACK_SERVICE', { ticketId }, error as Error);
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
      const { feedbackTickets } = await mongodb.getCollections();
      
      const response: FeedbackResponse = {
        responseId: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        authorType,
        authorName,
        authorId,
        content: responseData.content.trim(),
        isPublic: responseData.isPublic,
        attachments: responseData.attachments || [],
        createdAt: new Date()
      };

      const result = await feedbackTickets.updateOne(
        { _id: toObjectId(ticketId) },
        { 
          $push: { responses: response } as any,
          $set: { updatedAt: new Date() }
        }
      );

      if (result.modifiedCount > 0 && authorId) {
        // Get ticket for logging
        const ticket = await this.getTicketById(ticketId);
        
        // Log activity
        await activityLogger.logActivity({
          userId: authorId,
          userType: authorType,
          action: `הוסיף תגובה לפניה: ${ticket?.title || ticketId}`,
          category: 'feedback',
          target: {
            id: ticketId,
            type: 'feedback_ticket',
            title: ticket?.title || 'Unknown Ticket'
          },
          details: {
            ticketNumber: ticket?.ticketNumber,
            responseType: authorType,
            isPublic: responseData.isPublic
          },
          severity: 'info',
          isVisible: true
        });
      }

      return result.modifiedCount > 0;
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
      const { feedbackTickets } = await mongodb.getCollections();
      
      const note: FeedbackInternalNote = {
        noteId: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        authorName,
        authorId,
        content: noteData.content.trim(),
        createdAt: new Date()
      };

      const result = await feedbackTickets.updateOne(
        { _id: toObjectId(ticketId) },
        { 
          $push: { internalNotes: note } as any,
          $set: { updatedAt: new Date() }
        }
      );

      return result.modifiedCount > 0;
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
      const { feedbackTickets } = await mongodb.getCollections();
      
      const matchCondition = dateRange ? {
        createdAt: { $gte: dateRange.start, $lte: dateRange.end }
      } : {};

      const [
        totalStats,
        statusStats,
        categoryStats,
        priorityStats,
        resolutionTimes,
        satisfactionScores,
        todayStats
      ] = await Promise.all([
        // Total count
        feedbackTickets.countDocuments(matchCondition),
        
        // By status
        feedbackTickets.aggregate([
          { $match: matchCondition },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray(),
        
        // By category
        feedbackTickets.aggregate([
          { $match: matchCondition },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]).toArray(),
        
        // By priority
        feedbackTickets.aggregate([
          { $match: matchCondition },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]).toArray(),
        
        // Resolution times
        feedbackTickets.aggregate([
          { 
            $match: { 
              ...matchCondition,
              status: { $in: ['resolved', 'closed'] },
              resolvedAt: { $exists: true }
            }
          },
          {
            $project: {
              resolutionTime: {
                $divide: [
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  1000 * 60 * 60 // Convert to hours
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgTime: { $avg: '$resolutionTime' }
            }
          }
        ]).toArray(),
        
        // Customer satisfaction
        feedbackTickets.aggregate([
          { 
            $match: { 
              ...matchCondition,
              customerSatisfaction: { $exists: true }
            }
          },
          {
            $group: {
              _id: null,
              avgSatisfaction: { $avg: '$customerSatisfaction' }
            }
          }
        ]).toArray(),
        
        // Today's stats
        feedbackTickets.aggregate([
          {
            $match: {
              $or: [
                { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                { resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
              ]
            }
          },
          {
            $group: {
              _id: null,
              newToday: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                    1,
                    0
                  ]
                }
              },
              resolvedToday: {
                $sum: {
                  $cond: [
                    { $gte: ['$resolvedAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]).toArray()
      ]);

      // Process results
      const byStatus: Record<FeedbackStatus, number> = {
        new: 0, assigned: 0, in_progress: 0, pending_user: 0,
        resolved: 0, closed: 0, cancelled: 0
      };
      statusStats.forEach(stat => {
        byStatus[stat._id as FeedbackStatus] = stat.count;
      });

      const byCategory: Record<string, number> = {};
      categoryStats.forEach(stat => {
        byCategory[stat._id] = stat.count;
      });

      const byPriority: Record<string, number> = {};
      priorityStats.forEach(stat => {
        byPriority[stat._id] = stat.count;
      });

      // Calculate overdue tickets (older than 72 hours without response)
      const overdueDate = new Date(Date.now() - (72 * 60 * 60 * 1000));
      const overdueCount = await feedbackTickets.countDocuments({
        status: { $in: ['new', 'assigned', 'in_progress'] },
        createdAt: { $lt: overdueDate },
        'responses.0': { $exists: false }
      });

      return {
        total: totalStats,
        byStatus,
        byCategory: byCategory as any,
        byPriority: byPriority as any,
        avgResolutionTime: resolutionTimes[0]?.avgTime || 0,
        customerSatisfactionAvg: satisfactionScores[0]?.avgSatisfaction || 0,
        newToday: todayStats[0]?.newToday || 0,
        resolvedToday: todayStats[0]?.resolvedToday || 0,
        overdueTickets: overdueCount
      };
    } catch (error) {
      logger.error('Failed to get feedback stats', 'FEEDBACK_SERVICE', undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get available subtasks for user selection
   */
  async getAvailableSubtasks(): Promise<Array<{ id: string; title: string; taskTitle: string }>> {
    try {
      const { subtasks, tasks } = await mongodb.getCollections();
      
      const subtaskList = await subtasks.find({}).toArray();
      const result = [];

      for (const subtask of subtaskList) {
        const task = await tasks.findOne({ _id: subtask.taskId });
        if (task && task.isVisible) { // Only include subtasks from visible tasks
          result.push({
            id: fromObjectId(subtask._id!),
            title: subtask.title,
            taskTitle: task.title
          });
        }
      }

      return result;
    } catch (error) {
      logger.error('Failed to get available subtasks', 'FEEDBACK_SERVICE', undefined, error as Error);
      return [];
    }
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService(); 