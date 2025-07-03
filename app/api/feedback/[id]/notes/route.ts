import { NextRequest, NextResponse } from 'next/server';
import { feedbackService } from '@/lib/services/feedbackService';
import { AddInternalNoteRequest } from '@/lib/types/feedback';
import { logger } from '@/lib/logger';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { requireAdmin } from '@/lib/auth-utils';


interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Add internal note to ticket (Admin only)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check admin authentication
    const user = authService.extractUserFromRequest(request);
    const authenticatedUser = requireAdmin(user);
    
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

    // Get actual admin info from session
    const adminId = authenticatedUser.id;
    const adminName = authenticatedUser.username;

    const noteId = await feedbackService.addInternalNote(
      id,
      noteData,
      adminName,
      adminId
    );

    if (!noteId) {
      return NextResponse.json(
        { error: 'Failed to add note' },
        { status: 500 }
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

// PATCH - Update internal notes for a feedback ticket (Admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authentication
    const user = authService.extractUserFromRequest(request);
    const authenticatedUser = requireAdmin(user);
    
    const { id } = await params;
    const body = await request.json();
    
    // Validate request
    if (body.notes === undefined) {
      return NextResponse.json(
        { error: 'Notes field is required' },
        { status: 400 }
      );
    }
    
    // Get actual admin info from session
    const adminId = authenticatedUser.id;
    const adminName = authenticatedUser.username;

    const noteData: AddInternalNoteRequest = {
      content: body.notes
    };

    const noteId = await feedbackService.addInternalNote(
      id,
      noteData,
      adminName,
      adminId
    );

    if (!noteId) {
      return NextResponse.json(
        { error: 'Failed to add note' },
        { status: 500 }
      );
    }

    // Return updated ticket with notes
    const updatedTicket = await feedbackService.getTicketById(id);

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Internal notes updated successfully'
    });

  } catch (error) {
    const { id } = await params;
    logger.error('Failed to update internal notes', 'FEEDBACK_API', { ticketId: id }, error as Error);
    return NextResponse.json(
      { error: 'Failed to update internal notes' },
      { status: 500 }
    );
  }
} 