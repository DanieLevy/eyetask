import { NextRequest, NextResponse } from 'next/server';
import { feedbackService } from '@/lib/services/feedbackService';
import { AddResponseRequest } from '@/lib/types/feedback';
import { logger } from '@/lib/logger';

// POST - Add response to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check here
    // For now, we'll proceed without auth for development
    
    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: 'Response content is required', field: 'content' },
        { status: 400 }
      );
    }

    if (body.isPublic === undefined) {
      return NextResponse.json(
        { error: 'Response visibility must be specified', field: 'isPublic' },
        { status: 400 }
      );
    }

    const responseData: AddResponseRequest = {
      content: body.content.trim(),
      isPublic: body.isPublic,
      attachments: body.attachments || []
    };

    // TODO: Get actual user info from session
    // For now, assume admin user
    const authorType = 'admin';
    const authorName = 'Admin User';
    const authorId = 'admin-temp-id';

    const success = await feedbackService.addResponse(
      id,
      responseData,
      authorType,
      authorName,
      authorId
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Return updated ticket with responses
    const updatedTicket = await feedbackService.getTicketById(id);

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Response added successfully'
    });

  } catch (error) {
    const { id } = await params;
    logger.error('Failed to add response', 'FEEDBACK_API', { ticketId: id }, error as Error);
    return NextResponse.json(
      { error: 'Failed to add response' },
      { status: 500 }
    );
  }
} 