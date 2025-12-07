import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { supabaseDb as db, Subtask } from '@/lib/supabase-database';

// GET /api/admin/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = authService.extractUserFromRequest(request);
    requireAdmin(user);

    // Get all data
    const [tasks, projects, analytics] = await Promise.all([
      db.getAllTasks(true), // Include hidden tasks for admin
      db.getAllProjects(),
      db.getAnalytics()
    ]);

    // Get all subtasks for stats
    const allSubtasks: Subtask[] = [];
    for (const task of tasks) {
      const subtasks = await db.getSubtasksByTask(task._id?.toString() ?? '');
      allSubtasks.push(...subtasks);
    }

    // Prepare dashboard statistics
    const dashboardData = {
      // Basic counts
      totalTasks: tasks.length,
      visibleTasks: tasks.filter(task => task.isVisible).length,
      hiddenTasks: tasks.filter(task => !task.isVisible).length,
      totalSubtasks: allSubtasks.length,
      totalProjects: projects.length,
      totalVisits: analytics?.visits?.total || 0,
      uniqueVisitors: analytics?.uniqueVisitors?.total || 0,

      // Task priority distribution
      tasksByPriority: {
        high: tasks.filter(task => task.priority >= 1 && task.priority <= 3).length,
        medium: tasks.filter(task => task.priority >= 4 && task.priority <= 6).length,
        low: tasks.filter(task => task.priority >= 7 && task.priority <= 10).length,
        none: tasks.filter(task => task.priority === 0).length
      },

      // Task type distribution
      tasksByType: {
        events: tasks.filter(task => task.type?.includes('events')).length,
        hours: tasks.filter(task => task.type?.includes('hours')).length
      },

      // Project analytics
      projectStats: projects.map(project => {
        const projectTasks = tasks.filter(task => task.projectId.toString() === project._id?.toString());
        const projectSubtasks = allSubtasks.filter(subtask => 
          projectTasks.some(task => task._id?.toString() === subtask.taskId.toString())
        );
        
        return {
          projectId: project._id?.toString() ?? '',
          projectName: project.name,
          taskCount: projectTasks.length,
          subtaskCount: projectSubtasks.length,
          highPriorityCount: projectTasks.filter(task => 
            task.priority >= 1 && task.priority <= 3
          ).length,
          visibleTaskCount: projectTasks.filter(task => task.isVisible).length
        };
      })
    };

    logger.info('Dashboard data fetched successfully', 'DASHBOARD_API');

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Dashboard API error', 'DASHBOARD_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      success: false
    }, { status: 500 });
  }
} 