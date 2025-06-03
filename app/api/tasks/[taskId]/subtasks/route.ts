import { NextRequest, NextResponse } from 'next/server';
import { getSubtasksByTaskId, createSubtask, getTaskById } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

// GET /api/tasks/[id]/subtasks - Fetch subtasks for a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if task exists and is visible (or user is admin)
    const task = await getTaskById(params.id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = requireAuth(token);
    
    if (!task.isVisible && (!authorized || !isAdmin(user))) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }
    
    const subtasks = await getSubtasksByTaskId(params.id);
    
    return NextResponse.json({ subtasks, success: true });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtasks', success: false },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/subtasks - Create new subtask (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = requireAuth(token);
    
    if (!authorized || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }
    
    // Check if parent task exists
    const task = await getTaskById(params.id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Parent task not found', success: false },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'datacoNumber', 'type', 'amountNeeded', 'labels', 'weather', 'scene'];
    
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}`, success: false },
          { status: 400 }
        );
      }
    }
    
    // Create subtask with taskId
    const subtaskData = {
      ...body,
      taskId: params.id,
    };
    
    const newSubtask = await createSubtask(subtaskData);
    
    return NextResponse.json({ subtask: newSubtask, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to create subtask', success: false },
      { status: 500 }
    );
  }
} 