import { supabaseDb as db } from '@/lib/supabase-database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth-utils';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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
    console.error('Error toggling subtask visibility:', error);
    return NextResponse.json({ error: 'Failed to toggle subtask visibility', success: false }, { status: 500 });
  }
} 