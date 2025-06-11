import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { toObjectId } from '@/lib/mongodb';
import { cache } from '@/lib/cache';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for daily updates
const CACHE_NAMESPACE = 'daily_updates';

export async function GET(request: NextRequest) {
  try {
    // Check if this is for admin (include hidden) or homepage (exclude hidden)
    const url = new URL(request.url);
    const includeHidden = url.searchParams.get('includeHidden') === 'true';
    
    // Generate cache key based on whether hidden items are included
    const cacheKey = `daily_updates_${includeHidden ? 'admin' : 'public'}`;
    
    // Try to get from cache first
    const cachedUpdates = cache.get<{ updates: any[], count: number }>(cacheKey, {
      namespace: CACHE_NAMESPACE,
      ttl: CACHE_TTL
    });
    
    if (cachedUpdates) {
      logger.debug('Daily updates served from cache', 'DAILY_UPDATES_API', { 
        count: cachedUpdates.count, 
        includeHidden,
        cached: true
      });
      
      return NextResponse.json({ 
        success: true, 
        updates: cachedUpdates.updates,
        count: cachedUpdates.count,
        cached: true
      });
    }
    
    // Fetch active daily updates from MongoDB
    const updates = await db.getActiveDailyUpdates(includeHidden);

    // Transform updates for API response
    const transformedUpdates = updates.map(update => ({
        id: update._id?.toString(),
        title: update.title,
        content: update.content,
        type: update.type,
        priority: update.priority,
        duration_type: update.durationType,
        duration_value: update.durationValue,
        expiresAt: update.expiresAt?.toISOString(),
        is_active: update.isActive,
        is_pinned: update.isPinned,
        is_hidden: update.isHidden || false,
        targetAudience: update.targetAudience,
        created_at: update.createdAt.toISOString(),
        updated_at: update.updatedAt.toISOString()
    }));
    
    // Cache the result
    cache.set(cacheKey, { 
      updates: transformedUpdates, 
      count: updates.length 
    }, {
      namespace: CACHE_NAMESPACE,
      ttl: CACHE_TTL
    });

    logger.info('Daily updates fetched successfully', 'DAILY_UPDATES_API', { 
      count: updates.length, 
      includeHidden 
    });

    return NextResponse.json({ 
      success: true, 
      updates: transformedUpdates,
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
      durationType = 'days',
      durationValue = 7,
      isPinned = false,
      isHidden = false,
      targetAudience = ['all']
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Title is required' 
      }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Content is required' 
      }, { status: 400 });
    }

    // Validate type
    const validTypes = ['info', 'warning', 'success', 'error', 'announcement'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid type. Must be one of: ' + validTypes.join(', ') 
      }, { status: 400 });
    }

    // Validate priority
    if (priority < 1 || priority > 10) {
      return NextResponse.json({ 
        error: 'Priority must be between 1 and 10' 
      }, { status: 400 });
    }

    // Validate duration type
    const validDurationTypes = ['hours', 'days', 'permanent'];
    if (!validDurationTypes.includes(durationType)) {
      return NextResponse.json({ 
        error: 'Invalid durationType. Must be one of: ' + validDurationTypes.join(', ') 
      }, { status: 400 });
    }

    // Calculate expiresAt date
    let expiresAt: Date | undefined = undefined;
    if (durationType !== 'permanent' && durationValue) {
      expiresAt = new Date();
      if (durationType === 'hours') {
        expiresAt.setHours(expiresAt.getHours() + durationValue);
      } else if (durationType === 'days') {
        expiresAt.setDate(expiresAt.getDate() + durationValue);
      }
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
      isHidden,
      createdBy: user ? toObjectId(user.id) : undefined
    });

    // Invalidate both caches (admin and public)
    cache.delete('daily_updates_admin', { namespace: CACHE_NAMESPACE });
    cache.delete('daily_updates_public', { namespace: CACHE_NAMESPACE });

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