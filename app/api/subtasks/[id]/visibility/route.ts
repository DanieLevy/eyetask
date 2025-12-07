import { NextRequest, NextResponse } from 'next/server';
import { requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { supabaseDb as db } from '@/lib/supabase-database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization');
        const user = await requireAuthEnhanced(authHeader);
    if (!user || !isAdminEnhanced(user)) {
      return NextResponse.json({ error: 'Unauthorized access', success: false }, { status: 401 });
    }
    const { id } = await params;
    const { isVisible } = await request.json();
    const updated = await db.updateSubtaskVisibility(id, isVisible);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update subtask visibility', success: false }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: `Subtask visibility updated` });
  } catch (error) {
    logger.error('Error toggling subtask visibility', 'SUBTASK_API', undefined, error as Error);
    return NextResponse.json({ error: 'Failed to toggle subtask visibility', success: false }, { status: 500 });
  }
} 