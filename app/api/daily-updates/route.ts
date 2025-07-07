import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';

// GET /api/daily-updates - Get daily updates (filtered by scope)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const includeHidden = searchParams.get('includeHidden') === 'true';
    
    // Check if user is authenticated (optional - updates might be public)
    const user = authService.extractUserFromRequest(request);
    const canManageData = user ? authService.canManageData(user) : false;
    
    // Get updates based on scope - if admin wants to see all updates, use getAllDailyUpdates
    const updates = canManageData && includeHidden && !projectId 
      ? await db.getAllDailyUpdates()
      : await db.getActiveDailyUpdatesByScope(
          projectId || undefined,
          canManageData && includeHidden
        );
    
    const updatesWithIds = updates.map(update => ({
      id: update.id || update._id?.toString(),
      _id: update.id || update._id?.toString(),
      title: update.title,
      content: update.content,
      type: update.type,
      priority: update.priority,
      duration_type: update.durationType,
      duration_value: update.durationValue,
      expires_at: update.expiresAt,
      is_active: update.isActive,
      is_pinned: update.isPinned,
      is_hidden: update.isHidden,
      target_audience: update.targetAudience,
      projectId: update.projectId,
      isGeneral: update.isGeneral,
      created_by: update.createdBy,
      created_at: update.createdAt,
      updated_at: update.updatedAt
    }));
    
    return NextResponse.json({
      updates: updatesWithIds,
      total: updates.length,
      success: true
    });
  } catch (error) {
    logger.error('Error fetching daily updates', 'DAILY_UPDATES_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch daily updates',
      success: false
    }, { status: 500 });
  }
}

// POST /api/daily-updates - Create new daily update (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    
    // Check if user can manage data (admin or data_manager)
    if (!user || !authService.canManageData(user)) {
      return NextResponse.json({
        error: 'Unauthorized - Admin or Data Manager access required',
        success: false
      }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'content', 'type', 'priority', 'durationType', 'targetAudience'];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json({
          error: `Missing required field: ${field}`,
          success: false
        }, { status: 400 });
      }
    }
    
    // Validate type
    if (!['info', 'warning', 'success', 'error', 'announcement'].includes(data.type)) {
      return NextResponse.json({
        error: 'Invalid type',
        success: false
      }, { status: 400 });
    }
    
    // Calculate expiration date if needed
    let expiresAt: string | undefined = undefined;
    if (data.durationType !== 'permanent' && data.durationValue) {
      const now = new Date();
      if (data.durationType === 'hours') {
        expiresAt = new Date(now.getTime() + data.durationValue * 60 * 60 * 1000).toISOString();
      } else if (data.durationType === 'days') {
        expiresAt = new Date(now.getTime() + data.durationValue * 24 * 60 * 60 * 1000).toISOString();
      }
    }
    
    // Create daily update - explicitly type the object
    const updateData: any = {
      title: data.title,
      content: data.content,
      type: data.type,
      priority: data.priority || 5,
      durationType: data.durationType,
      durationValue: data.durationValue || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isPinned: data.isPinned || false,
      isHidden: data.isHidden || false,
      targetAudience: data.targetAudience || [],
      projectId: data.projectId || undefined,
      isGeneral: data.isGeneral !== undefined ? data.isGeneral : !data.projectId,
      createdBy: user.id
    };
    
    // Only add expiresAt if it's defined
    if (expiresAt) {
      updateData.expiresAt = expiresAt;
    }
    
    const updateId = await db.createDailyUpdate(updateData);
    const newUpdate = await db.getDailyUpdateById(updateId);
    
    logger.info('Daily update created successfully', 'DAILY_UPDATES_API', {
      updateId,
      userId: user.id,
      type: data.type
    });
    
    return NextResponse.json({
      update: {
        _id: newUpdate?.id || newUpdate?._id?.toString(),
        title: newUpdate?.title,
        content: newUpdate?.content,
        type: newUpdate?.type,
        priority: newUpdate?.priority,
        durationType: newUpdate?.durationType,
        durationValue: newUpdate?.durationValue,
        expiresAt: newUpdate?.expiresAt,
        isActive: newUpdate?.isActive,
        isPinned: newUpdate?.isPinned,
        isHidden: newUpdate?.isHidden,
        targetAudience: newUpdate?.targetAudience,
        projectId: newUpdate?.projectId,
        isGeneral: newUpdate?.isGeneral,
        createdBy: newUpdate?.createdBy,
        createdAt: newUpdate?.createdAt,
        updatedAt: newUpdate?.updatedAt
      },
      success: true
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }
    
    logger.error('Error creating daily update', 'DAILY_UPDATES_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to create daily update',
      success: false
    }, { status: 500 });
  }
} 