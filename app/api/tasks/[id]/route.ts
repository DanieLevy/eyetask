import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { fromObjectId } from '@/lib/mongodb';
import { deleteFile } from '@/lib/fileStorage';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Get a specific task by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID', success: false },
        { status: 400 }
      );
    }
    
    const taskResult = await db.getTaskById(id);
    
    if (!taskResult) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }

    // Check authentication and visibility
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);

    // If task is hidden and user is not admin, return 404
    if (!taskResult.isVisible && (!authorized || !isAdminEnhanced(user))) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }

    // Convert MongoDB result to API format
    const task = {
      id: fromObjectId(taskResult._id!),
      title: taskResult.title,
      subtitle: taskResult.subtitle,
      images: taskResult.images || [],
      datacoNumber: taskResult.datacoNumber,
      description: taskResult.description,
      projectId: fromObjectId(taskResult.projectId),
      type: taskResult.type,
      locations: taskResult.locations,
      amountNeeded: taskResult.amountNeeded,
      targetCar: taskResult.targetCar,
      lidar: taskResult.lidar,
      dayTime: taskResult.dayTime,
      priority: taskResult.priority,
      isVisible: taskResult.isVisible,
      createdAt: taskResult.createdAt.toISOString(),
      updatedAt: taskResult.updatedAt.toISOString()
    };

    // Track page view
    await db.incrementPageView(`tasks.${id}`);

    return NextResponse.json({
      task,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a task (admin only)
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

    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    const body = await request.json();
    
    // Get the current task to compare images
    const currentTask = await db.getTaskById(id);
    if (!currentTask) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }

    // Handle image deletion if images have been removed
    if (body.images && currentTask.images) {
      const currentImages = currentTask.images || [];
      const newImages = body.images || [];
      
      // Find images that were removed
      const removedImages = currentImages.filter(img => !newImages.includes(img));
      
      // Delete removed images from Cloudinary
      if (removedImages.length > 0) {
        logger.info('Deleting removed task images', 'TASK_UPDATE', {
          taskId: id,
          removedCount: removedImages.length,
          removedImages: removedImages
        });

        for (const imageUrl of removedImages) {
          try {
            await deleteFile(imageUrl);
            logger.info('Successfully deleted task image', 'TASK_UPDATE', {
              taskId: id,
              imageUrl: imageUrl
            });
          } catch (error) {
            logger.error('Failed to delete task image', 'TASK_UPDATE', {
              taskId: id,
              imageUrl: imageUrl
            }, error as Error);
            // Continue with other deletions even if one fails
          }
        }
      }
    }

    const updated = await db.updateTask(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Task not found or not updated', success: false },
        { status: 404 }
      );
    }
    
    // Get the updated task to return
    const taskResult = await db.getTaskById(id);
    if (!taskResult) {
      return NextResponse.json(
        { error: 'Task not found after update', success: false },
        { status: 404 }
      );
    }

    // Convert MongoDB result to API format
    const task = {
      id: fromObjectId(taskResult._id!),
      title: taskResult.title,
      subtitle: taskResult.subtitle,
      images: taskResult.images || [],
      datacoNumber: taskResult.datacoNumber,
      description: taskResult.description,
      projectId: fromObjectId(taskResult.projectId),
      type: taskResult.type,
      locations: taskResult.locations,
      amountNeeded: taskResult.amountNeeded,
      targetCar: taskResult.targetCar,
      lidar: taskResult.lidar,
      dayTime: taskResult.dayTime,
      priority: taskResult.priority,
      isVisible: taskResult.isVisible,
      createdAt: taskResult.createdAt.toISOString(),
      updatedAt: taskResult.updatedAt.toISOString()
    };
    
    logger.info('Task updated successfully', 'TASK_UPDATE', {
      taskId: id,
      imageCount: task.images.length
    });
    
    return NextResponse.json({ task, success: true });
  } catch (error) {
    // Get id from params for error logging
    const { id: errorTaskId } = await params;
    logger.error('Error updating task', 'TASK_UPDATE', { taskId: errorTaskId }, error as Error);
    return NextResponse.json(
      { error: 'Failed to update task', success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task (admin only)
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
    
    // Get the task first to clean up its images
    const taskToDelete = await db.getTaskById(id);
    if (!taskToDelete) {
      return NextResponse.json(
        { error: 'Task not found', success: false },
        { status: 404 }
      );
    }

    // Delete all task images from Cloudinary before deleting the task
    if (taskToDelete.images && taskToDelete.images.length > 0) {
      logger.info('Deleting task images before task deletion', 'TASK_DELETE', {
        taskId: id,
        imageCount: taskToDelete.images.length,
        images: taskToDelete.images
      });

      for (const imageUrl of taskToDelete.images) {
        try {
          await deleteFile(imageUrl);
          logger.info('Successfully deleted task image during task deletion', 'TASK_DELETE', {
            taskId: id,
            imageUrl: imageUrl
          });
        } catch (error) {
          logger.error('Failed to delete task image during task deletion', 'TASK_DELETE', {
            taskId: id,
            imageUrl: imageUrl
          }, error as Error);
          // Continue with other deletions even if one fails
        }
      }
    }

    // Also need to get and delete all subtask images
    const subtasks = await db.getSubtasksByTask(id);
    if (subtasks && subtasks.length > 0) {
      logger.info('Deleting subtask images before task deletion', 'TASK_DELETE', {
        taskId: id,
        subtaskCount: subtasks.length
      });

      for (const subtask of subtasks) {
        if (subtask.images && subtask.images.length > 0) {
          for (const imageUrl of subtask.images) {
            try {
              await deleteFile(imageUrl);
              logger.info('Successfully deleted subtask image during task deletion', 'TASK_DELETE', {
                taskId: id,
                subtaskId: fromObjectId(subtask._id!),
                imageUrl: imageUrl
              });
            } catch (error) {
              logger.error('Failed to delete subtask image during task deletion', 'TASK_DELETE', {
                taskId: id,
                subtaskId: fromObjectId(subtask._id!),
                imageUrl: imageUrl
              }, error as Error);
              // Continue with other deletions even if one fails
            }
          }
        }
      }
    }

    const deleted = await db.deleteTask(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Task not found or not deleted', success: false },
        { status: 404 }
      );
    }
    
    logger.info('Task and all associated images deleted successfully', 'TASK_DELETE', {
      taskId: id,
      taskImageCount: taskToDelete.images?.length || 0,
      subtaskCount: subtasks?.length || 0
    });
    
    return NextResponse.json({ 
      message: 'Task deleted successfully', 
      success: true 
    });
  } catch (error) {
    // Get id from params for error logging
    const { id: errorTaskId } = await params;
    logger.error('Error deleting task', 'TASK_DELETE', { taskId: errorTaskId }, error as Error);
    return NextResponse.json(
      { error: 'Failed to delete task', success: false },
      { status: 500 }
    );
  }
} 