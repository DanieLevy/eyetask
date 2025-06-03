import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: update, error } = await supabase
      .from('daily_updates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching daily update:', error);
      return NextResponse.json({ error: 'Daily update not found' }, { status: 404 });
    }

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
      duration_type,
      duration_value,
      is_pinned,
      is_active,
      target_audience
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
    if (duration_type !== undefined) {
      const validDurationTypes = ['hours', 'days', 'permanent'];
      if (!validDurationTypes.includes(duration_type)) {
        return NextResponse.json({ 
          error: 'Invalid duration_type. Must be one of: ' + validDurationTypes.join(', ') 
        }, { status: 400 });
      }
      updateData.duration_type = duration_type;
    }
    if (duration_value !== undefined) {
      updateData.duration_value = duration_type === 'permanent' ? null : duration_value;
    }
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (target_audience !== undefined) updateData.target_audience = target_audience;

    // Update the daily update
    const { data: updatedUpdate, error } = await supabase
      .from('daily_updates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating daily update:', error);
      return NextResponse.json({ error: 'Failed to update daily update' }, { status: 500 });
    }

    console.log('✅ Daily update updated:', id);
    return NextResponse.json({ 
      success: true, 
      update: updatedUpdate 
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

    const { error } = await supabase
      .from('daily_updates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting daily update:', error);
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