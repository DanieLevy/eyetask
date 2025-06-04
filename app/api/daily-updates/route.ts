import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { toObjectId } from '@/lib/mongodb';

export async function GET() {
  try {
    // Fetch active, non-expired daily updates from MongoDB
    const updates = await db.getActiveDailyUpdates();

    logger.info('Daily updates fetched successfully', 'DAILY_UPDATES_API', { count: updates.length });

    return NextResponse.json({ 
      success: true, 
      updates: updates.map(update => ({
        id: update._id?.toString(),
        title: update.title,
        content: update.content,
        type: update.type,
        priority: update.priority,
        durationType: update.durationType,
        durationValue: update.durationValue,
        expiresAt: update.expiresAt?.toISOString(),
        isActive: update.isActive,
        isPinned: update.isPinned,
        targetAudience: update.targetAudience,
        createdAt: update.createdAt.toISOString(),
        updatedAt: update.updatedAt.toISOString()
      })),
      count: updates.length
    });
  } catch (error) {
    logger.error('Error fetching daily updates', 'DAILY_UPDATES_API', undefined, error as Error);
    return NextResponse.json({ error: 'Failed to fetch daily updates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication - admin required for creating updates
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);

    const body = await request.json();
    
    const { 
      title, 
      content, 
      type = 'info',
      priority = 5,
      durationType = 'hours',
      durationValue = 24,
      isPinned = false,
      targetAudience = []
    } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({ 
        error: 'Title and content are required' 
      }, { status: 400 });
    }

    // Validate types
    const validTypes = ['info', 'warning', 'success', 'error', 'announcement'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid type. Must be one of: ' + validTypes.join(', ') 
      }, { status: 400 });
    }

    const validDurationTypes = ['hours', 'days', 'permanent'];
    if (!validDurationTypes.includes(durationType)) {
      return NextResponse.json({ 
        error: 'Invalid durationType. Must be one of: ' + validDurationTypes.join(', ') 
      }, { status: 400 });
    }

    if (priority < 1 || priority > 10) {
      return NextResponse.json({ 
        error: 'Priority must be between 1 and 10' 
      }, { status: 400 });
    }

    // Calculate expiration date
    let expiresAt: Date | undefined;
    if (durationType !== 'permanent') {
      const now = new Date();
      const duration = durationType === 'hours' ? durationValue * 60 * 60 * 1000 : durationValue * 24 * 60 * 60 * 1000;
      expiresAt = new Date(now.getTime() + duration);
    }

    // Create new daily update in MongoDB
    const updateId = await db.createDailyUpdate({
      title: title.trim(),
      content: content.trim(),
      type,
      priority,
      durationType,
      durationValue: durationType === 'permanent' ? undefined : durationValue,
      expiresAt,
      isActive: true,
      isPinned,
      targetAudience,
      createdBy: user ? toObjectId(user.id) : undefined
    });

    logger.info('Daily update created successfully', 'DAILY_UPDATES_API', { 
      updateId, 
      title: title.trim(),
      type,
      userId: user?.id 
    });

    return NextResponse.json({ 
      success: true, 
      updateId
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Error creating daily update', 'DAILY_UPDATES_API', undefined, error as Error);
    return NextResponse.json({ error: 'Failed to create daily update' }, { status: 500 });
  }
} 