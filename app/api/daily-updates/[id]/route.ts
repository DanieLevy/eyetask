import { NextRequest, NextResponse } from 'next/server';
import { createObjectId } from '@/lib/mongodb';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';

const CACHE_NAMESPACE = 'daily_updates';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Daily update ID is required' },
        { status: 400 }
      );
    }

    const dailyUpdateResult = await db.getDailyUpdateById(id);
    
    if (!dailyUpdateResult) {
      return NextResponse.json(
        { error: 'Daily update not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedDailyUpdate = {
      id: dailyUpdateResult._id?.toString(),
      title: dailyUpdateResult.title,
      content: dailyUpdateResult.content,
      type: dailyUpdateResult.type,
      priority: dailyUpdateResult.priority,
      durationType: dailyUpdateResult.durationType,
      durationValue: dailyUpdateResult.durationValue,
      expiresAt: dailyUpdateResult.expiresAt,
      isActive: dailyUpdateResult.isActive,
      isPinned: dailyUpdateResult.isPinned,
      isHidden: dailyUpdateResult.isHidden,
      targetAudience: dailyUpdateResult.targetAudience,
      projectId: dailyUpdateResult.projectId ? dailyUpdateResult.projectId.toString() : null,
      isGeneral: dailyUpdateResult.isGeneral,
      createdBy: dailyUpdateResult.createdBy ? dailyUpdateResult.createdBy.toString() : null,
      createdAt: dailyUpdateResult.createdAt,
      updatedAt: dailyUpdateResult.updatedAt
    };

    return NextResponse.json(formattedDailyUpdate);
  } catch (error) {
    logger.error('Error fetching daily update', 'DAILY_UPDATE_GET', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to fetch daily update' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin access
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Daily update ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      title, 
      content, 
      type, 
      priority, 
      durationType, 
      durationValue,
      isActive,
      isPinned,
      isHidden,
      targetAudience,
      projectId
    } = body;

    // Validation
    if (title && typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title must be a string' },
        { status: 400 }
      );
    }

    if (content && typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }

    if (type && !['info', 'warning', 'success', 'error', 'announcement'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    if (durationType && !['hours', 'days', 'permanent'].includes(durationType)) {
      return NextResponse.json(
        { error: 'Invalid duration type' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = parseInt(priority, 10);
    if (durationType !== undefined) updateData.durationType = durationType;
    if (durationValue !== undefined) updateData.durationValue = parseInt(durationValue, 10);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (isHidden !== undefined) updateData.isHidden = isHidden;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    
    // Handle project ID
    if (projectId !== undefined) {
      if (projectId === null || projectId === '') {
        updateData.projectId = null;
        updateData.isGeneral = true;
      } else {
        try {
          updateData.projectId = createObjectId(projectId);
          updateData.isGeneral = false;
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid project ID format' },
            { status: 400 }
          );
        }
      }
    }

    // Calculate expiration if duration fields are provided
    if (updateData.durationType || updateData.durationValue) {
      const durType = updateData.durationType || 'permanent';
      const durValue = updateData.durationValue || 0;
      
      if (durType === 'permanent') {
        updateData.expiresAt = null;
      } else {
        const now = new Date();
        const multiplier = durType === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        updateData.expiresAt = new Date(now.getTime() + (durValue * multiplier));
      }
    }

    const success = await db.updateDailyUpdate(id, updateData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Daily update not found or failed to update' },
        { status: 404 }
      );
    }

    // Fetch the updated daily update
    const dailyUpdateResult = await db.getDailyUpdateById(id);
    
    if (!dailyUpdateResult) {
      return NextResponse.json(
        { error: 'Updated daily update not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedDailyUpdate = {
      id: dailyUpdateResult._id?.toString(),
      title: dailyUpdateResult.title,
      content: dailyUpdateResult.content,
      type: dailyUpdateResult.type,
      priority: dailyUpdateResult.priority,
      durationType: dailyUpdateResult.durationType,
      durationValue: dailyUpdateResult.durationValue,
      expiresAt: dailyUpdateResult.expiresAt,
      isActive: dailyUpdateResult.isActive,
      isPinned: dailyUpdateResult.isPinned,
      isHidden: dailyUpdateResult.isHidden,
      targetAudience: dailyUpdateResult.targetAudience,
      projectId: dailyUpdateResult.projectId ? dailyUpdateResult.projectId.toString() : null,
      isGeneral: dailyUpdateResult.isGeneral,
      createdBy: dailyUpdateResult.createdBy ? dailyUpdateResult.createdBy.toString() : null,
      createdAt: dailyUpdateResult.createdAt,
      updatedAt: dailyUpdateResult.updatedAt
    };

    logger.info('Daily update updated successfully', 'DAILY_UPDATE_UPDATE', {
      id,
      updatedFields: Object.keys(updateData)
    });

    return NextResponse.json(formattedDailyUpdate);
  } catch (error) {
    logger.error('Error updating daily update', 'DAILY_UPDATE_UPDATE', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to update daily update' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin access
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Daily update ID is required' },
        { status: 400 }
      );
    }

    const success = await db.deleteDailyUpdate(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Daily update not found' },
        { status: 404 }
      );
    }

    logger.info('Daily update deleted successfully', 'DAILY_UPDATE_DELETE', { id });

    return NextResponse.json({ 
      success: true,
      message: 'Daily update deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting daily update', 'DAILY_UPDATE_DELETE', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to delete daily update' },
      { status: 500 }
    );
  }
} 