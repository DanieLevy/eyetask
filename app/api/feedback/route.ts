import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { feedbackService } from '@/lib/services/feedbackService';
import { CreateFeedbackRequest, FeedbackFilterOptions, FeedbackTicket } from '@/lib/types/feedback';
import { logger } from '@/lib/logger';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { requireAdmin } from '@/lib/auth-utils';
import { v4 as uuidv4 } from 'uuid';

// POST - Create new feedback ticket (Public endpoint - no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headersList = await headers();
    
    // Validate required fields
    if (!body.userName?.trim()) {
      return NextResponse.json(
        { error: 'Full name is required', field: 'userName' },
        { status: 400 }
      );
    }
    
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required', field: 'title' },
        { status: 400 }
      );
    }
    
    if (!body.description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required', field: 'description' },
        { status: 400 }
      );
    }
    
    if (!body.category) {
      return NextResponse.json(
        { error: 'Category is required', field: 'category' },
        { status: 400 }
      );
    }
    
    if (!body.issueType) {
      return NextResponse.json(
        { error: 'Issue type is required', field: 'issueType' },
        { status: 400 }
      );
    }

    // Prepare request data
    const feedbackData: CreateFeedbackRequest = {
      userName: body.userName.trim(),
      userEmail: body.userEmail?.trim(),
      userPhone: body.userPhone?.trim(),
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category,
      issueType: body.issueType,
      relatedTo: body.relatedTo,
      isUrgent: body.isUrgent || false
    };

    // Get metadata
    const userAgent = headersList.get('user-agent') || undefined;
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || 
                     headersList.get('x-real-ip') || 
                     'unknown';

    // Create ticket
    const ticketId = await feedbackService.createTicket(feedbackData, {
      userAgent,
      ipAddress
    });

    // Get created ticket for response
    const ticket = await feedbackService.getTicketById(ticketId);

    return NextResponse.json({
      success: true,
      ticketId: ticketId,
      ticketNumber: ticket?.ticketNumber,
      message: 'Your feedback has been submitted successfully. You will receive a response soon.'
    });

  } catch (error) {
    logger.error('Failed to create feedback ticket', 'FEEDBACK_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again.' },
      { status: 500 }
    );
  }
}

// GET - Get tickets with filtering (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const user = authService.extractUserFromRequest(request);
    requireAdmin(user);
    
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Parse filters
    const filters: FeedbackFilterOptions = {};
    
    const status = searchParams.get('status');
    if (status) {
      filters.status = status.split(',') as any;
    }
    
    const category = searchParams.get('category');
    if (category) {
      filters.category = category.split(',') as any;
    }
    
    const priority = searchParams.get('priority');
    if (priority) {
      filters.priority = priority.split(',') as any;
    }
    
    const assignedTo = searchParams.get('assignedTo');
    if (assignedTo) {
      filters.assignedTo = assignedTo;
    }
    
    const searchTerm = searchParams.get('search');
    if (searchTerm) {
      filters.searchTerm = searchTerm;
    }
    
    const isUrgent = searchParams.get('urgent');
    if (isUrgent) {
      filters.isUrgent = isUrgent === 'true';
    }
    
    const tags = searchParams.get('tags');
    if (tags) {
      filters.tags = tags.split(',');
    }
    
    // Date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const result = await feedbackService.getTickets(filters, page, limit);

    return NextResponse.json({
      success: true,
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    });

  } catch (error) {
    logger.error('Failed to get feedback tickets', 'FEEDBACK_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to retrieve tickets' },
      { status: 500 }
    );
  }
} 