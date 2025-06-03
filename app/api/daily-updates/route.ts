import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch active, non-expired daily updates
    const { data: updates, error } = await supabase
      .from('daily_updates')
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('is_pinned', { ascending: false })
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching daily updates:', error);
      return NextResponse.json({ error: 'Failed to fetch daily updates' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      updates: updates || [],
      count: updates?.length || 0
    });
  } catch (error) {
    console.error('❌ Unexpected error in daily updates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      title, 
      content, 
      type = 'info',
      priority = 5,
      duration_type = 'hours',
      duration_value = 24,
      is_pinned = false,
      target_audience = []
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
    if (!validDurationTypes.includes(duration_type)) {
      return NextResponse.json({ 
        error: 'Invalid duration_type. Must be one of: ' + validDurationTypes.join(', ') 
      }, { status: 400 });
    }

    if (priority < 1 || priority > 10) {
      return NextResponse.json({ 
        error: 'Priority must be between 1 and 10' 
      }, { status: 400 });
    }

    // Insert new daily update
    const { data: newUpdate, error } = await supabase
      .from('daily_updates')
      .insert({
        title: title.trim(),
        content: content.trim(),
        type,
        priority,
        duration_type,
        duration_value: duration_type === 'permanent' ? null : duration_value,
        is_pinned,
        target_audience
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating daily update:', error);
      return NextResponse.json({ error: 'Failed to create daily update' }, { status: 500 });
    }

    console.log('✅ Daily update created:', newUpdate.id);
    return NextResponse.json({ 
      success: true, 
      update: newUpdate 
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Unexpected error in daily updates POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 