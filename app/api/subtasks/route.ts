import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { fromObjectId } from '@/lib/mongodb';
import { updateTaskAmount } from '@/lib/taskUtils';
import { activityLogger } from '@/lib/activityLogger';
import { saveFile } from '@/lib/fileStorage';
import { logger } from '@/lib/logger';

// GET /api/subtasks - Fetch all subtasks (PUBLIC ACCESS - filtered by visible tasks only)
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated admin
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);
    const isAdmin = authorized && isAdminEnhanced(user);
    
    // Check for taskId query parameter
    const { searchParams } = new URL(request.url);
    const taskIdFilter = searchParams.get('taskId');
    
    let subtasks;
    if (taskIdFilter) {
      // Get subtasks for a specific task
      const subtaskResults = await db.getSubtasksByTask(taskIdFilter);
              subtasks = subtaskResults.map(subtask => ({
        id: fromObjectId(subtask._id!),
        taskId: fromObjectId(subtask.taskId),
        title: subtask.title,
        subtitle: subtask.subtitle,
        images: subtask.images || [],
        datacoNumber: subtask.datacoNumber,
        type: subtask.type,
        amountNeeded: subtask.amountNeeded,
        labels: subtask.labels,
        targetCar: subtask.targetCar,
        weather: subtask.weather,
        scene: subtask.scene,
        dayTime: subtask.dayTime || [],
        createdAt: subtask.createdAt.toISOString(),
        updatedAt: subtask.updatedAt.toISOString()
      }));
    } else {
      // Get all subtasks (we need to implement this or return error)
      return NextResponse.json(
        { error: 'taskId parameter is required', success: false },
        { status: 400 }
      );
    }
    
    // If not admin, filter to only show subtasks from visible tasks
    if (!isAdmin) {
      // Get the task to check if it's visible
      const task = await db.getTaskById(taskIdFilter!);
      if (!task || !task.isVisible) {
        return NextResponse.json({
          subtasks: [],
          total: 0,
          success: true
        });
      }
    }
    
    return NextResponse.json({
      subtasks,
      total: subtasks.length,
      success: true
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtasks', success: false },
      { status: 500 }
    );
  }
}

// POST /api/subtasks - Create new subtask (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);
    
    if (!authorized || !isAdminEnhanced(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }
    
    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const imageUrls: string[] = [];

    // Save uploaded images to Cloudinary and get their URLs
    if (images && images.length > 0) {
      for (const image of images) {
        // Basic validation for the file
        if (image.size === 0) continue;
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(image.type)) {
          logger.warn('Invalid file type in subtask creation', 'SUBTASKS_API', { 
            fileType: image.type,
            fileName: image.name 
          });
          continue; // Skip invalid files
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (image.size > maxSize) {
          logger.warn('File too large in subtask creation', 'SUBTASKS_API', { 
            fileSize: image.size,
            fileName: image.name 
          });
          continue; // Skip large files
        }
        
        // Upload to Cloudinary
        const url = await saveFile(image, {
          folder: 'eyetask/subtasks',
          tags: ['subtask', 'new-subtask', user?.username || 'unknown'],
          context: {
            uploadedBy: user?.username || 'unknown',
            uploadedAt: new Date().toISOString(),
            originalFileName: image.name,
            context: 'subtask-creation'
          }
        });
        imageUrls.push(url);
      }
    }
    
    // Construct subtask data from form fields
    const body: { [key: string]: any } = {};
    formData.forEach((value, key) => {
        if (key.endsWith('[]')) {
            const cleanKey = key.slice(0, -2);
            if (!body[cleanKey]) {
                body[cleanKey] = [];
            }
            body[cleanKey].push(value);
        } else if(key !== 'images') {
            body[key] = value;
        }
    });

    // Add image URLs to the data
    body.images = imageUrls;

    // Manual validation since we're not using a strict JSON body anymore
    const requiredFields = ['taskId', 'title', 'datacoNumber', 'type', 'amountNeeded', 'labels', 'targetCar', 'weather', 'scene'];
    for (const field of requiredFields) {
      if (!body[field] || (Array.isArray(body[field]) && body[field].length === 0)) {
        return NextResponse.json(
          { error: `Missing or empty required field: ${field}`, success: false },
          { status: 400 }
        );
      }
    }
    
    // Type conversion for numeric fields
    body.amountNeeded = Number(body.amountNeeded);
    if (isNaN(body.amountNeeded)) {
        return NextResponse.json({ error: 'amountNeeded must be a number', success: false }, { status: 400 });
    }

    const subtaskData = {
      taskId: body.taskId,
      title: body.title,
      subtitle: body.subtitle || '',
      images: body.images || [],
      datacoNumber: body.datacoNumber,
      type: body.type,
      amountNeeded: body.amountNeeded,
      labels: Array.isArray(body.labels) ? body.labels : [body.labels],
      targetCar: Array.isArray(body.targetCar) ? body.targetCar : [body.targetCar],
      weather: body.weather,
      scene: body.scene,
      dayTime: Array.isArray(body.dayTime) ? body.dayTime : (body.dayTime ? [body.dayTime] : []),
    };

    // Create the subtask
    const subtaskId = await db.createSubtask(subtaskData);
    
    // Log the activity
    await activityLogger.logSubtaskActivity(
      'created',
      subtaskId,
      subtaskData.title,
      subtaskData.taskId,
      user?.id,
      'admin'
    );
    
    // Automatically recalculate task amount
    await updateTaskAmount(fromObjectId(body.taskId));
    
    // Get the created subtask to return
    const subtaskResult = await db.getSubtaskById(subtaskId);
    if (!subtaskResult) {
      return NextResponse.json(
        { error: 'Failed to retrieve created subtask', success: false },
        { status: 500 }
      );
    }

    // Convert to API format
    const subtask = {
      id: fromObjectId(subtaskResult._id!),
      taskId: fromObjectId(subtaskResult.taskId),
      title: subtaskResult.title,
      subtitle: subtaskResult.subtitle,
      images: subtaskResult.images || [],
      datacoNumber: subtaskResult.datacoNumber,
      type: subtaskResult.type,
      amountNeeded: subtaskResult.amountNeeded,
      labels: subtaskResult.labels,
      targetCar: subtaskResult.targetCar,
      weather: subtaskResult.weather,
      scene: subtaskResult.scene,
      dayTime: subtaskResult.dayTime || [],
      createdAt: new Date(subtaskResult.createdAt).toISOString(),
      updatedAt: new Date(subtaskResult.updatedAt).toISOString()
    };
    
    return NextResponse.json({ subtask, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating subtask:', error);
    
    // Handle specific error types
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 409 }
      );
    }
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create subtask', success: false },
      { status: 500 }
    );
  }
} 