import { NextRequest, NextResponse } from 'next/server';
import { feedbackService } from '@/lib/services/feedbackService';
import { AddResponseRequest } from '@/lib/types/feedback';
import { logger } from '@/lib/logger';
import { auth, requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Add response to ticket
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authentication
    const user = auth.extractUserFromRequest(request);
    const authenticatedUser = requireAdmin(user);
    
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

    // Get actual user info from session
    const adminId = authenticatedUser.id;
    const adminName = authenticatedUser.username;

    const success = await feedbackService.addResponse(
      id,
      responseData,
      'admin',
      adminName,
      adminId
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