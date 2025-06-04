import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { fromObjectId } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get daily update by ID (we need to implement this function)
    const dailyUpdateResult = await db.getDailyUpdateById(id);

    if (!dailyUpdateResult) {
      return NextResponse.json({ error: 'Daily update not found' }, { status: 404 });
    }

    // Convert to API format
    const update = {
      id: fromObjectId(dailyUpdateResult._id!),
      title: dailyUpdateResult.title,
      content: dailyUpdateResult.content,
      type: dailyUpdateResult.type,
      priority: dailyUpdateResult.priority,
      durationType: dailyUpdateResult.durationType,
      durationValue: dailyUpdateResult.durationValue,
      expiresAt: dailyUpdateResult.expiresAt?.toISOString(),
      isActive: dailyUpdateResult.isActive,
      isPinned: dailyUpdateResult.isPinned,
      targetAudience: dailyUpdateResult.targetAudience,
      createdBy: dailyUpdateResult.createdBy ? fromObjectId(dailyUpdateResult.createdBy) : null,
      createdAt: dailyUpdateResult.createdAt.toISOString(),
      updatedAt: dailyUpdateResult.updatedAt.toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      update 
    });
  } catch (error) {
    console.error('❌ Unexpected error in daily update GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      targetAudience
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
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;

    // Update the daily update
    const updated = await db.updateDailyUpdate(id, updateData);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update daily update' }, { status: 500 });
    }

    // Get the updated daily update
    const dailyUpdateResult = await db.getDailyUpdateById(id);
    if (!dailyUpdateResult) {
      return NextResponse.json({ error: 'Daily update not found after update' }, { status: 404 });
    }

    // Convert to API format
    const update = {
      id: fromObjectId(dailyUpdateResult._id!),
      title: dailyUpdateResult.title,
      content: dailyUpdateResult.content,
      type: dailyUpdateResult.type,
      priority: dailyUpdateResult.priority,
      durationType: dailyUpdateResult.durationType,
      durationValue: dailyUpdateResult.durationValue,
      expiresAt: dailyUpdateResult.expiresAt?.toISOString(),
      isActive: dailyUpdateResult.isActive,
      isPinned: dailyUpdateResult.isPinned,
      targetAudience: dailyUpdateResult.targetAudience,
      createdBy: dailyUpdateResult.createdBy ? fromObjectId(dailyUpdateResult.createdBy) : null,
      createdAt: dailyUpdateResult.createdAt.toISOString(),
      updatedAt: dailyUpdateResult.updatedAt.toISOString()
    };

    console.log('✅ Daily update updated:', id);
    return NextResponse.json({ 
      success: true, 
      update
    });
  } catch (error) {
    console.error('❌ Unexpected error in daily update PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleted = await db.deleteDailyUpdate(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete daily update' }, { status: 500 });
    }

    console.log('✅ Daily update deleted:', id);
    return NextResponse.json({ 
      success: true,
      message: 'Daily update deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Unexpected error in daily update DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 