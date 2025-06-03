import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, getVisibleTasks, createTask } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

// GET /api/tasks - Fetch all tasks (admin) or visible tasks (public)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = requireAuth(token);
    
    let tasks;
    
    if (authorized && isAdmin(user)) {
      // Admin can see all tasks
      tasks = await getAllTasks();
    } else {
      // Public users only see visible tasks
      tasks = await getVisibleTasks();
    }
    
    return NextResponse.json({ tasks, success: true });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', success: false },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task (admin only)
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'datacoNumber', 'description', 'project', 'type', 'locations', 'amountNeeded', 'targetCar', 'lidar', 'dayTime', 'priority'];
    
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}`, success: false },
          { status: 400 }
        );
      }
    }
    
    // Create task with default visibility
    const taskData = {
      ...body,
      isVisible: body.isVisible ?? true,
    };
    
    const newTask = await createTask(taskData);
    
    return NextResponse.json({ task: newTask, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task', success: false },
      { status: 500 }
    );
  }
} 