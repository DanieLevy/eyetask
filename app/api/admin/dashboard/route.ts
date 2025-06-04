import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

// GET /api/admin/dashboard - Admin dashboard data
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);
    
    // Fetch all data in parallel from MongoDB
    const [tasks, projects, analytics] = await Promise.all([
      db.getAllTasks(true), // Include hidden tasks for admin
      db.getAllProjects(),
      db.getAnalytics()
    ]);

    // Get all subtasks for all tasks
    const allSubtasks = [];
    for (const task of tasks) {
      const subtasks = await db.getSubtasksByTask(task._id!.toString());
      allSubtasks.push(...subtasks);
    }
    
    // Calculate dashboard statistics
    const dashboardData = {
      totalTasks: tasks.length,
      visibleTasks: tasks.filter(task => task.isVisible).length,
      hiddenTasks: tasks.filter(task => !task.isVisible).length,
      totalSubtasks: allSubtasks.length,
      totalProjects: projects.length,
      totalVisits: analytics?.totalVisits || 0,
      uniqueVisitors: analytics?.uniqueVisitors || 0,
      
      // Task priority distribution
      tasksByPriority: {
        high: tasks.filter(task => task.priority >= 1 && task.priority <= 3).length,
        medium: tasks.filter(task => task.priority >= 4 && task.priority <= 6).length,
        low: tasks.filter(task => task.priority >= 7 && task.priority <= 10).length,
        none: tasks.filter(task => task.priority === 0).length,
      },
      
      // Tasks by project
      tasksByProject: projects.map(project => ({
        projectId: project._id?.toString(),
        projectName: project.name,
        taskCount: tasks.filter(task => task.projectId.toString() === project._id!.toString()).length,
      })),
      
      // Recent activity (last 7 days) - mock data for now
      recentActivity: generateRecentActivity(),
        
      // Most viewed tasks - mock data for now  
      mostViewedTasks: tasks
        .filter(task => task.isVisible)
        .slice(0, 5)
        .map((task, index) => {
          const project = projects.find(p => p._id!.toString() === task.projectId.toString());
          return {
            taskId: task._id?.toString(),
            taskTitle: task.title,
            projectName: project?.name || 'Unknown Project',
            views: Math.floor(Math.random() * 100) + (50 - index * 10), // Mock view count
          };
        })
        .sort((a, b) => b.views - a.views),
    };

    logger.info('Admin dashboard data fetched successfully', 'ADMIN_DASHBOARD_API', { 
      totalTasks: dashboardData.totalTasks,
      totalProjects: dashboardData.totalProjects,
      userId: user?.id 
    });
    
    return NextResponse.json({
      dashboard: dashboardData,
      success: true,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Error fetching admin dashboard data', 'ADMIN_DASHBOARD_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', success: false },
      { status: 500 }
    );
  }
}

// Helper function to generate mock recent activity data
function generateRecentActivity() {
  const activity = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    activity.push({
      date: date.toISOString().split('T')[0],
      visits: Math.floor(Math.random() * 50) + 10
    });
  }
  
  return activity;
} 