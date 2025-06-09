import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { fromObjectId } from '@/lib/mongodb';
import { updateTaskAmount } from '@/lib/taskUtils';
import { saveFile, deleteFile } from '@/lib/fileStorage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subtasks/[id] - Get a specific subtask by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    const subtaskResult = await db.getSubtaskById(id);
    
    if (!subtaskResult) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }

    // Convert MongoDB result to API format
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

    return NextResponse.json({
      subtask,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching subtask:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtask', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/subtasks/[id] - Update a subtask (admin only)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params;
    const formData = await request.formData();
    
    console.log('[PUT /api/subtasks] Received form data for subtask:', id);

    // 1. Get current subtask to find out which images to delete
    const currentSubtask = await db.getSubtaskById(id);
    if (!currentSubtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }
    const currentImageUrls = currentSubtask.images || [];

    // 2. Process FormData
    const body: { [key: string]: any } = {};
    const existingImagesToKeep = formData.getAll('existingImages[]').map(String);
    const newImages = formData.getAll('newImages') as File[];

    formData.forEach((value, key) => {
        if (!key.endsWith('[]') && key !== 'newImages') {
            if (body[key] === undefined) {
                body[key] = value;
            }
        } else if (key.endsWith('[]') && key !== 'existingImages[]') {
            const cleanKey = key.slice(0, -2);
            if (!body[cleanKey]) {
                body[cleanKey] = [];
            }
            body[cleanKey].push(value);
        }
    });

    // CRITICAL LOG: What is in the body before we add images or touch taskId?
    console.log('[PUT /api/subtasks] Parsed body from form data:', JSON.stringify(body, null, 2));

    // 3. Determine which images to delete
    const imagesToDelete = currentImageUrls.filter(url => !existingImagesToKeep.includes(url));

    // 4. Delete old images from storage
    await Promise.all(imagesToDelete.map(url => deleteFile(url)));

    // 5. Save new images to storage
    const newImageUrls = await Promise.all(newImages.map(file => saveFile(file)));

    // 6. Combine image lists
    body.images = [...existingImagesToKeep, ...newImageUrls];
    
    // CRITICAL: Explicitly remove taskId from the update payload to prevent it from being overwritten.
    // This is a safeguard against any form data issues.
    delete body.taskId;

    // Type conversion for numeric fields
    if (body.amountNeeded) {
        body.amountNeeded = Number(body.amountNeeded);
        if (isNaN(body.amountNeeded)) {
            return NextResponse.json({ error: 'amountNeeded must be a number' }, { status: 400 });
        }
    }
    if (body.priority) {
        body.priority = Number(body.priority);
        if (isNaN(body.priority)) {
            return NextResponse.json({ error: 'priority must be a number' }, { status: 400 });
        }
    }

    console.log('[PUT /api/subtasks] Final update payload for DB:', JSON.stringify(body, null, 2));

    const updated = await db.updateSubtask(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update subtask', success: false },
        { status: 500 }
      );
    }

    // Get the updated subtask to return
    const subtaskResult = await db.getSubtaskById(id);
    if (!subtaskResult) {
      return NextResponse.json(
        { error: 'Subtask not found after update', success: false },
        { status: 404 }
      );
    }

    // Automatically recalculate task amount after updating subtask
    await updateTaskAmount(fromObjectId(subtaskResult.taskId));

    // Convert MongoDB result to API format
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

    return NextResponse.json({
      subtask,
      message: 'Subtask updated successfully',
      success: true,
    });
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to update subtask', success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/[id] - Delete a subtask (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
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

    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    // Get the subtask first to know which task to update
    const subtaskToDelete = await db.getSubtaskById(id);
    if (!subtaskToDelete) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }

    const deleted = await db.deleteSubtask(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }

    // Automatically recalculate task amount after deleting subtask
    await updateTaskAmount(fromObjectId(subtaskToDelete.taskId));
    
    return NextResponse.json({ 
      message: 'Subtask deleted successfully', 
      success: true 
    });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json(
      { error: 'Failed to delete subtask', success: false },
      { status: 500 }
    );
  }
} 