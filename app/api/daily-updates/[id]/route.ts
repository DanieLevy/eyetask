import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { fromObjectId, toObjectId } from '@/lib/mongodb';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';

const CACHE_NAMESPACE = 'daily_updates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if ID is valid
    if (!id || id === 'undefined') {
      logger.error('Invalid daily update ID', 'DAILY_UPDATES_API', { id });
      return NextResponse.json({ error: 'Invalid daily update ID' }, { status: 400 });
    }

    // Get daily update by ID
    const dailyUpdateResult = await db.getDailyUpdateById(id);

    if (!dailyUpdateResult) {
      logger.warn('Daily update not found', 'DAILY_UPDATES_API', { id });
      return NextResponse.json({ error: 'Daily update not found' }, { status: 404 });
    }

    // Convert to API format
    const update = {
      id: fromObjectId(dailyUpdateResult._id!),
      title: dailyUpdateResult.title,
      content: dailyUpdateResult.content,
      type: dailyUpdateResult.type,
      priority: dailyUpdateResult.priority,
      duration_type: dailyUpdateResult.durationType,
      duration_value: dailyUpdateResult.durationValue,
      expiresAt: dailyUpdateResult.expiresAt?.toISOString(),
      is_active: dailyUpdateResult.isActive,
      is_pinned: dailyUpdateResult.isPinned,
      targetAudience: dailyUpdateResult.targetAudience,
      projectId: dailyUpdateResult.projectId ? fromObjectId(dailyUpdateResult.projectId) : null,
      isGeneral: dailyUpdateResult.isGeneral,
      createdBy: dailyUpdateResult.createdBy ? fromObjectId(dailyUpdateResult.createdBy) : null,
      created_at: dailyUpdateResult.createdAt.toISOString(),
      updated_at: dailyUpdateResult.updatedAt.toISOString()
    };

    logger.info('Daily update fetched', 'DAILY_UPDATES_API', { id });
    return NextResponse.json({ 
      success: true, 
      update 
    });
  } catch (error) {
    logger.error('Unexpected error in daily update GET', 'DAILY_UPDATES_API', undefined, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if ID is valid
    if (!id || id === 'undefined') {
      logger.error('Invalid daily update ID', 'DAILY_UPDATES_API', { id });
      return NextResponse.json({ error: 'Invalid daily update ID' }, { status: 400 });
    }
    
    const body = await request.json();
    
    const { 
      title, 
      content, 
      type,
      priority,
      durationType,
      durationValue,
      isPinned,
      isActive,
      isHidden,
      targetAudience,
      projectId,
      isGeneral
    } = body;

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (type !== undefined) {
      const validTypes = ['info', 'warning', 'success', 'error', 'announcement'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ 
          error: 'Invalid type. Must be one of: ' + validTypes.join(', ') 
        }, { status: 400 });
      }
      updateData.type = type;
    }
    if (priority !== undefined) {
      if (priority < 1 || priority > 10) {
        return NextResponse.json({ 
          error: 'Priority must be between 1 and 10' 
        }, { status: 400 });
      }
      updateData.priority = priority;
    }
    if (durationType !== undefined) {
      const validDurationTypes = ['hours', 'days', 'permanent'];
      if (!validDurationTypes.includes(durationType)) {
        return NextResponse.json({ 
          error: 'Invalid durationType. Must be one of: ' + validDurationTypes.join(', ') 
        }, { status: 400 });
      }
      updateData.durationType = durationType;
    }
    if (durationValue !== undefined) {
      updateData.durationValue = durationType === 'permanent' ? null : durationValue;
    }
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isHidden !== undefined) updateData.isHidden = isHidden;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    
    // Handle project assignment updates
    if (projectId !== undefined) {
      if (projectId && projectId !== 'general') {
        // Verify project exists
        const project = await db.getProjectById(projectId);
        if (!project) {
          return NextResponse.json({ 
            error: 'Project not found' 
          }, { status: 400 });
        }
        updateData.projectId = toObjectId(projectId);
        updateData.isGeneral = false;
      } else {
        // Set as general update
        updateData.projectId = null;
        updateData.isGeneral = true;
      }
    }
    
    if (isGeneral !== undefined) {
      updateData.isGeneral = isGeneral;
      if (isGeneral) {
        updateData.projectId = null; // Clear project association for general updates
      }
    }

    // Update the daily update
    const updated = await db.updateDailyUpdate(id, updateData);

    if (!updated) {
      logger.error('Failed to update daily update', 'DAILY_UPDATES_API', { id });
      return NextResponse.json({ error: 'Failed to update daily update' }, { status: 500 });
    }

    // Invalidate caches to ensure consistency
    // Get the original update to know which caches to invalidate
    const originalUpdate = await db.getDailyUpdateById(id);
    
    // Invalidate admin cache (gets all updates)
    cache.delete('daily_updates_admin_all', { namespace: CACHE_NAMESPACE });
    
    // Invalidate general public cache
    cache.delete('daily_updates_public_general', { namespace: CACHE_NAMESPACE });
    
    // Invalidate project-specific public caches if relevant
    if (originalUpdate?.projectId) {
      cache.delete(`daily_updates_public_${originalUpdate.projectId.toString()}`, { namespace: CACHE_NAMESPACE });
    }
    
    // If project was changed, also invalidate new project cache
    if (updateData.projectId && updateData.projectId.toString() !== originalUpdate?.projectId?.toString()) {
      cache.delete(`daily_updates_public_${updateData.projectId.toString()}`, { namespace: CACHE_NAMESPACE });
    }

    // Get the updated daily update
    const dailyUpdateResult = await db.getDailyUpdateById(id);
    if (!dailyUpdateResult) {
      logger.error('Daily update not found after update', 'DAILY_UPDATES_API', { id });
      return NextResponse.json({ error: 'Daily update not found after update' }, { status: 404 });
    }

    // Convert to API format
    const update = {
      id: fromObjectId(dailyUpdateResult._id!),
      title: dailyUpdateResult.title,
      content: dailyUpdateResult.content,
      type: dailyUpdateResult.type,
      priority: dailyUpdateResult.priority,
      duration_type: dailyUpdateResult.durationType,
      duration_value: dailyUpdateResult.durationValue,
      expiresAt: dailyUpdateResult.expiresAt?.toISOString(),
      is_active: dailyUpdateResult.isActive,
      is_pinned: dailyUpdateResult.isPinned,
      is_hidden: dailyUpdateResult.isHidden || false,
      targetAudience: dailyUpdateResult.targetAudience,
      projectId: dailyUpdateResult.projectId ? fromObjectId(dailyUpdateResult.projectId) : null,
      isGeneral: dailyUpdateResult.isGeneral,
      createdBy: dailyUpdateResult.createdBy ? fromObjectId(dailyUpdateResult.createdBy) : null,
      created_at: dailyUpdateResult.createdAt.toISOString(),
      updated_at: dailyUpdateResult.updatedAt.toISOString()
    };

    logger.info('Daily update updated', 'DAILY_UPDATES_API', { id });
    return NextResponse.json({ 
      success: true, 
      update
    });
  } catch (error) {
    logger.error('Unexpected error in daily update PUT', 'DAILY_UPDATES_API', undefined, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - admin required for deleting updates
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);

    const { id } = await params;
    
    // Check if ID is valid
    if (!id || id === 'undefined') {
      logger.error('Invalid daily update ID', 'DAILY_UPDATES_API', { id });
      return NextResponse.json({ error: 'Invalid daily update ID' }, { status: 400 });
    }

    // Get the update details before deletion for cache invalidation
    const updateToDelete = await db.getDailyUpdateById(id);
    
    // Delete the daily update
    const deleted = await db.deleteDailyUpdate(id);

    if (!deleted) {
      logger.warn('Daily update not found or failed to delete', 'DAILY_UPDATES_API', { id });
      return NextResponse.json({ error: 'Daily update not found or failed to delete' }, { status: 404 });
    }

    // Invalidate relevant caches
    cache.delete('daily_updates_admin_all', { namespace: CACHE_NAMESPACE }); // Admin cache
    cache.delete('daily_updates_public_general', { namespace: CACHE_NAMESPACE }); // General public cache
    
    if (updateToDelete?.projectId) {
      cache.delete(`daily_updates_public_${updateToDelete.projectId.toString()}`, { namespace: CACHE_NAMESPACE });
    }

    logger.info('Daily update deleted', 'DAILY_UPDATES_API', { id, userId: user?.id });
    return NextResponse.json({ 
      success: true, 
      message: 'Daily update deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Unexpected error in daily update DELETE', 'DAILY_UPDATES_API', undefined, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 