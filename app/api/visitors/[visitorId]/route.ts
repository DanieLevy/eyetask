import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth-utils';
import { getSupabaseClient } from '@/lib/supabase';

// PUT /api/visitors/[visitorId] - Update visitor profile (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const { visitorId } = await params;
    
    // Check authentication - admin only
    const user = authService.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    const body = await request.json();
    const { name } = body;
    
    // Get visitor profile first
    const profile = await db.getVisitorProfile(visitorId);
    if (!profile) {
      return NextResponse.json({
        error: 'Visitor not found',
        success: false
      }, { status: 404 });
    }
    
    const supabase = getSupabaseClient(true);
    
    if (name !== undefined) {
      // Update visitor name
      if (name === null || name === '') {
        // Remove name - set to empty string
        const { error } = await supabase
          .from('visitor_profiles')
          .update({ 
            name: '',
            updated_at: new Date().toISOString()
          })
          .eq('visitor_id', visitorId);
          
        if (error) {
          logger.error('Error removing visitor name', 'VISITOR_API', { error });
          throw error;
        }
        
        // Log the action
        await db.logAction({
          userId: adminUser.id,
          username: adminUser.username,
          userRole: adminUser.role,
          action: `הסיר שם מבקר: ${profile.name} (${visitorId})`,
          category: 'user',
          target: {
            id: visitorId,
            type: 'visitor',
            name: profile.name
          },
          severity: 'warning'
        });
        
        logger.info('Visitor name removed', 'VISITOR_API', {
          visitorId,
          previousName: profile.name,
          adminId: adminUser.id
        });
        
      } else {
        // Update name
        const trimmedName = name.trim();
        
        if (trimmedName.length < 2 || trimmedName.length > 50) {
          return NextResponse.json({
            error: 'Name must be between 2 and 50 characters',
            success: false
          }, { status: 400 });
        }
        
        const { error } = await supabase
          .from('visitor_profiles')
          .update({ 
            name: trimmedName,
            updated_at: new Date().toISOString()
          })
          .eq('visitor_id', visitorId);
          
        if (error) {
          logger.error('Error updating visitor name', 'VISITOR_API', { error });
          throw error;
        }
        
        // Log the action
        await db.logAction({
          userId: adminUser.id,
          username: adminUser.username,
          userRole: adminUser.role,
          action: `עדכן שם מבקר: ${profile.name} → ${trimmedName}`,
          category: 'user',
          target: {
            id: visitorId,
            type: 'visitor',
            name: trimmedName
          },
          severity: 'info'
        });
        
        logger.info('Visitor name updated', 'VISITOR_API', {
          visitorId,
          oldName: profile.name,
          newName: trimmedName,
          adminId: adminUser.id
        });
      }
    }
    
    // Get updated profile
    const updatedProfile = await db.getVisitorProfile(visitorId);
    
    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: name === null || name === '' ? 'Visitor name removed' : 'Visitor name updated'
    });
    
  } catch (error) {
    logger.error('Error updating visitor profile', 'VISITOR_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to update visitor profile',
      success: false
    }, { status: 500 });
  }
}

// DELETE /api/visitors/[visitorId] - Delete visitor profile (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  try {
    const { visitorId } = await params;
    
    // Check authentication - admin only
    const user = authService.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    // Get visitor profile first
    const profile = await db.getVisitorProfile(visitorId);
    if (!profile) {
      return NextResponse.json({
        error: 'Visitor not found',
        success: false
      }, { status: 404 });
    }
    
    const supabase = getSupabaseClient(true);
    
    // Delete visitor sessions
    const { error: sessionsError } = await supabase
      .from('visitor_sessions')
      .delete()
      .eq('visitor_id', visitorId);
      
    if (sessionsError) {
      logger.error('Error deleting visitor sessions', 'VISITOR_API', { error: sessionsError });
    }
    
    // Delete visitor activity logs
    const { error: logsError } = await supabase
      .from('activity_logs')
      .delete()
      .eq('visitor_id', visitorId);
      
    if (logsError) {
      logger.error('Error deleting visitor activity logs', 'VISITOR_API', { error: logsError });
    }
    
    // Delete visitor profile
    const { error: profileError } = await supabase
      .from('visitor_profiles')
      .delete()
      .eq('visitor_id', visitorId);
      
    if (profileError) {
      logger.error('Error deleting visitor profile', 'VISITOR_API', { error: profileError });
      throw profileError;
    }
    
    // Log the action
    await db.logAction({
      userId: adminUser.id,
      username: adminUser.username,
      userRole: adminUser.role,
      action: `מחק מבקר: ${profile.name} (${visitorId})`,
      category: 'user',
      target: {
        id: visitorId,
        type: 'visitor',
        name: profile.name
      },
      severity: 'warning'
    });
    
    logger.info('Visitor deleted', 'VISITOR_API', {
      visitorId,
      visitorName: profile.name,
      adminId: adminUser.id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Visitor deleted successfully'
    });
    
  } catch (error) {
    logger.error('Error deleting visitor', 'VISITOR_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to delete visitor',
      success: false
    }, { status: 500 });
  }
} 