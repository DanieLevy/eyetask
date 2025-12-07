import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { feedbackService } from '@/lib/services/feedbackService';
import { UpdateFeedbackRequest } from '@/lib/types/feedback';

// GET - Get specific ticket by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const user = authService.extractUserFromRequest(request);
    requireAdmin(user);
    
    const { id } = await params;
    const ticket = await feedbackService.getTicketById(id);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket
    });

  } catch (error) {
    const { id } = await params;
    logger.error('Failed to get ticket', 'FEEDBACK_API', { ticketId: id }, error as Error);
    return NextResponse.json(
      { error: 'Failed to retrieve ticket' },
      { status: 500 }
    );
  }
}

// PUT - Update ticket (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const user = authService.extractUserFromRequest(request);
    const authenticatedUser = requireAdmin(user);
    
    const { id } = await params;
    const body = await request.json();
    
    // Validate update data
    const updateData: UpdateFeedbackRequest = {};
    
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.category !== undefined) updateData.category = body.category;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.isUrgent !== undefined) updateData.isUrgent = body.isUrgent;

    // Get actual admin info from session
    const adminId = authenticatedUser.id;
    const adminName = authenticatedUser.username;

    const success = await feedbackService.updateTicket(
      id,
      updateData,
      adminId,
      adminName
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Ticket not found or no changes made' },
        { status: 404 }
      );
    }

    // Return updated ticket
    const updatedTicket = await feedbackService.getTicketById(id);

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket updated successfully'
    });

  } catch (error) {
    const { id } = await params;
    logger.error('Failed to update ticket', 'FEEDBACK_API', { ticketId: id }, error as Error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// DELETE - Delete ticket (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const user = authService.extractUserFromRequest(request);
    const authenticatedUser = requireAdmin(user);
    
    const { id } = await params;
    
    // Get actual admin info from session
    const adminId = authenticatedUser.id;
    const adminName = authenticatedUser.username;

    const success = await feedbackService.deleteTicket(
      id,
      adminId,
      adminName
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket deleted successfully'
    });

  } catch (error) {
    const { id } = await params;
    logger.error('Failed to delete ticket', 'FEEDBACK_API', { ticketId: id }, error as Error);
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    );
  }
} 