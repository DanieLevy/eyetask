import { NextRequest, NextResponse } from 'next/server';
import { updateSubtaskVisibility } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);
    if (!authorized || !isAdminEnhanced(user)) {
      return NextResponse.json({ error: 'Unauthorized access', success: false }, { status: 401 });
    }
    const { id } = await params;
    const { isVisible } = await request.json();
    const updated = await updateSubtaskVisibility(id, isVisible);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update subtask visibility', success: false }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: `Subtask visibility updated` });
  } catch (error) {
    console.error('Error toggling subtask visibility:', error);
    return NextResponse.json({ error: 'Failed to toggle subtask visibility', success: false }, { status: 500 });
  }
} 