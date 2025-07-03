import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';

import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth-utils';

// GET /api/daily-updates/[id] - Get a single daily update
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const update = await db.getDailyUpdateById(id);
    
    if (!update) {
      return NextResponse.json({
        error: 'Daily update not found',
        success: false
      }, { status: 404 });
    }
    
    // Check if user can view hidden updates
    const user = authService.extractUserFromRequest(request);
    const canManageData = authService.canManageData(user);
    
    // If update is hidden and user cannot manage data, return 404
    if (update.isHidden && !canManageData) {
      return NextResponse.json({
        error: 'Daily update not found',
        success: false
      }, { status: 404 });
    }
    
    return NextResponse.json({
      update: {
        _id: update.id || update._id?.toString(),
        title: update.title,
        content: update.content,
        type: update.type,
        priority: update.priority,
        durationType: update.durationType,
        durationValue: update.durationValue,
        expiresAt: update.expiresAt,
        isActive: update.isActive,
        isPinned: update.isPinned,
        isHidden: update.isHidden,
        targetAudience: update.targetAudience,
        projectId: update.projectId,
        isGeneral: update.isGeneral,
        createdBy: update.createdBy,
        createdAt: update.createdAt,
        updatedAt: update.updatedAt
      },
      success: true
    });
  } catch (error) {
    logger.error('Error fetching daily update', 'DAILY_UPDATES_API', { updateId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch daily update',
      success: false
    }, { status: 500 });
  }
}

// PUT /api/daily-updates/[id] - Update a daily update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    const data = await request.json();
    
    // Get existing update to verify it exists
    const existingUpdate = await db.getDailyUpdateById(id);
    if (!existingUpdate) {
      return NextResponse.json({
        error: 'Daily update not found',
        success: false
      }, { status: 404 });
    }
    
    // Calculate new expiration date if duration changed
    let expiresAt = undefined;
    if (data.durationType !== undefined || data.durationValue !== undefined) {
      const durationType = data.durationType || existingUpdate.durationType;
      const durationValue = data.durationValue || existingUpdate.durationValue;
      
      if (durationType !== 'permanent' && durationValue) {
        const now = new Date();
        if (durationType === 'hours') {
          expiresAt = new Date(now.getTime() + durationValue * 60 * 60 * 1000).toISOString();
        } else if (durationType === 'days') {
          expiresAt = new Date(now.getTime() + durationValue * 24 * 60 * 60 * 1000).toISOString();
        }
      } else if (durationType === 'permanent') {
        expiresAt = null;
      }
    }
    
    // Create update object with only the fields that are provided
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.durationType !== undefined) updateData.durationType = data.durationType;
    if (data.durationValue !== undefined) updateData.durationValue = data.durationValue;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.isHidden !== undefined) updateData.isHidden = data.isHidden;
    if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.isGeneral !== undefined) updateData.isGeneral = data.isGeneral;
    
    const success = await db.updateDailyUpdate(id, updateData);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to update daily update',
        success: false
      }, { status: 500 });
    }
    
    logger.info('Daily update updated successfully', 'DAILY_UPDATES_API', {
      updateId: id,
      userId: adminUser.id,
      changes: Object.keys(updateData)
    });
    
    return NextResponse.json({
      success: true,
      message: 'Daily update updated successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Daily update error', 'DAILY_UPDATES_API', { updateId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to update daily update',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/daily-updates/[id] - Delete a daily update
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    // Get update details before deletion
    const update = await db.getDailyUpdateById(id);
    if (!update) {
      return NextResponse.json({
        error: 'Daily update not found',
        success: false
      }, { status: 404 });
    }
    
    // Delete the daily update
    const success = await db.deleteDailyUpdate(id);
    
    if (!success) {
      return NextResponse.json({
        error: 'Failed to delete daily update',
        success: false
      }, { status: 500 });
    }
    
    logger.info('Daily update deleted successfully', 'DAILY_UPDATES_API', {
      updateId: id,
      updateTitle: update.title,
      deletedBy: adminUser.id
    });
    
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
    
    logger.error('Daily update deletion error', 'DAILY_UPDATES_API', { updateId: (await params).id }, error as Error);
    return NextResponse.json({
      error: 'Failed to delete daily update',
      success: false
    }, { status: 500 });
  }
} 