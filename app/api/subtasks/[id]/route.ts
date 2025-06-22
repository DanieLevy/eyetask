import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';

import { updateTaskAmount } from '@/lib/taskUtils';
import { saveFile, deleteFile } from '@/lib/fileStorage';
import { logger } from '@/lib/logger';

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
      id: subtaskResult._id!.toString(),
      taskId: subtaskResult.taskId.toString(),
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

    // 3. Determine which images to delete and delete them from Cloudinary
    const imagesToDelete = currentImageUrls.filter(url => !existingImagesToKeep.includes(url));
    
    if (imagesToDelete.length > 0) {
      logger.info('Deleting old images from Cloudinary', 'SUBTASKS_API', {
        subtaskId: id,
        imagesToDelete: imagesToDelete.length
      });

      // Delete old images from Cloudinary (don't await to avoid blocking)
      imagesToDelete.forEach(async (imageUrl) => {
        try {
          await deleteFile(imageUrl);
        } catch (error) {
          logger.warn('Failed to delete old image from Cloudinary', 'SUBTASKS_API', {
            imageUrl,
            error: (error as Error).message
          });
        }
      });
    }

    // 4. Upload new images to Cloudinary
    const newImageUrls: string[] = [];
    if (newImages && newImages.length > 0) {
        for (const image of newImages) {
            if (image.size === 0) continue;

            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!validTypes.includes(image.type)) {
              logger.warn('Invalid file type in subtask update', 'SUBTASKS_API', { 
                fileType: image.type,
                fileName: image.name 
              });
              continue; // Skip invalid files
            }

            // Validate file size (10MB limit)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (image.size > maxSize) {
              logger.warn('File too large in subtask update', 'SUBTASKS_API', { 
                fileSize: image.size,
                fileName: image.name 
              });
              continue; // Skip large files
            }

            // Upload to Cloudinary
            const url = await saveFile(image, {
              folder: 'eyetask/subtasks',
              tags: ['subtask', 'subtask-update', user?.username || 'unknown'],
              context: {
                uploadedBy: user?.username || 'unknown',
                uploadedAt: new Date().toISOString(),
                originalFileName: image.name,
                context: 'subtask-update',
                subtaskId: id
              }
            });
            newImageUrls.push(url);
        }
    }

    // 5. Combine existing images (that we're keeping) with new uploaded images
    const finalImages = [...existingImagesToKeep, ...newImageUrls];
    body.images = finalImages;
    
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
    await updateTaskAmount(subtaskResult.taskId.toString());

    // Convert MongoDB result to API format
    const subtask = {
      id: subtaskResult._id!.toString(),
      taskId: subtaskResult.taskId.toString(),
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
    // Get the subtask first to know which task to update and clean up images
    const subtaskToDelete = await db.getSubtaskById(id);
    if (!subtaskToDelete) {
      return NextResponse.json(
        { error: 'Subtask not found', success: false },
        { status: 404 }
      );
    }

    // Delete all subtask images from Cloudinary before deleting the subtask
    if (subtaskToDelete.images && subtaskToDelete.images.length > 0) {
      logger.info('Deleting subtask images before subtask deletion', 'SUBTASK_DELETE', {
        subtaskId: id,
        imageCount: subtaskToDelete.images.length,
        images: subtaskToDelete.images
      });

      for (const imageUrl of subtaskToDelete.images) {
        try {
          await deleteFile(imageUrl);
          logger.info('Successfully deleted subtask image during subtask deletion', 'SUBTASK_DELETE', {
            subtaskId: id,
            imageUrl: imageUrl
          });
        } catch (error) {
          logger.error('Failed to delete subtask image during subtask deletion', 'SUBTASK_DELETE', {
            subtaskId: id,
            imageUrl: imageUrl
          }, error as Error);
          // Continue with other deletions even if one fails
        }
      }
    }

    const deleted = await db.deleteSubtask(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Subtask not found or not deleted', success: false },
        { status: 404 }
      );
    }

    // Automatically recalculate task amount after deleting subtask
    await updateTaskAmount(subtaskToDelete.taskId.toString());
    
    logger.info('Subtask and all associated images deleted successfully', 'SUBTASK_DELETE', {
      subtaskId: id,
      imageCount: subtaskToDelete.images?.length || 0,
      taskId: subtaskToDelete.taskId.toString()
    });
    
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