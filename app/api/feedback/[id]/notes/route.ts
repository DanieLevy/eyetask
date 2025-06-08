import { NextRequest, NextResponse } from 'next/server';
import { feedbackService } from '@/lib/services/feedbackService';
import { AddInternalNoteRequest } from '@/lib/types/feedback';
import { logger } from '@/lib/logger';

// POST - Add internal note to ticket (Admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add admin authentication check here
    // For now, we'll proceed without auth for development
    
    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: 'Note content is required', field: 'content' },
        { status: 400 }
      );
    }

    const noteData: AddInternalNoteRequest = {
      content: body.content.trim()
    };

    // TODO: Get actual admin info from session
    const authorName = 'Admin User';
    const authorId = 'admin-temp-id';

    const success = await feedbackService.addInternalNote(
      id,
      noteData,
      authorName,
      authorId
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Return updated ticket with notes
    const updatedTicket = await feedbackService.getTicketById(id);

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Internal note added successfully'
    });

  } catch (error) {
    const { id } = await params;
    logger.error('Failed to add internal note', 'FEEDBACK_API', { ticketId: id }, error as Error);
    return NextResponse.json(
      { error: 'Failed to add internal note' },
      { status: 500 }
    );
  }
} 