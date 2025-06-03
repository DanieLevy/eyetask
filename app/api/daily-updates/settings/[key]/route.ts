import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    const { data: setting, error } = await supabase
      .from('daily_updates_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.error('❌ Error fetching setting:', error);
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      key,
      value: setting.value 
    });
  } catch (error) {
    console.error('❌ Unexpected error in settings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    const { value } = body;

    if (!value || typeof value !== 'string') {
      return NextResponse.json({ 
        error: 'Value is required and must be a string' 
      }, { status: 400 });
    }

    // Upsert the setting
    const { data: setting, error } = await supabase
      .from('daily_updates_settings')
      .upsert({ 
        key, 
        value: value.trim(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating setting:', error);
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }

    console.log('✅ Setting updated:', key);
    return NextResponse.json({ 
      success: true, 
      setting 
    });
  } catch (error) {
    console.error('❌ Unexpected error in settings PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 