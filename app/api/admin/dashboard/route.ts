import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, getAllSubtasks, getAllProjects, getAnalytics } from '@/lib/data';
import { extractTokenFromHeader, requireAuth, isAdmin } from '@/lib/auth';

// GET /api/admin/dashboard - Admin dashboard data
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = requireAuth(token);
    
    if (!authorized || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }
    
    // Fetch all data in parallel
    const [tasks, subtasks, projects, analytics] = await Promise.all([
      getAllTasks(),
      getAllSubtasks(),
      getAllProjects(),
      getAnalytics(),
    ]);
    
    // Calculate dashboard statistics
    const dashboardData = {
      totalTasks: tasks.length,
      visibleTasks: tasks.filter(task => task.isVisible).length,
      hiddenTasks: tasks.filter(task => !task.isVisible).length,
      totalSubtasks: subtasks.length,
      totalProjects: projects.length,
      totalVisits: analytics.totalVisits,
      uniqueVisitors: analytics.uniqueVisitors,
      
      // Task priority distribution
      tasksByPriority: {
        high: tasks.filter(task => task.priority >= 1 && task.priority <= 3).length,
        medium: tasks.filter(task => task.priority >= 4 && task.priority <= 6).length,
        low: tasks.filter(task => task.priority >= 7 && task.priority <= 10).length,
        none: tasks.filter(task => task.priority === 0).length,
      },
      
      // Tasks by project
      tasksByProject: projects.map(project => ({
        projectName: project.name,
        taskCount: tasks.filter(task => task.project === project.name).length,
      })),
      
      // Recent activity (last 7 days)
      recentActivity: Object.entries(analytics.dailyStats)
        .slice(-7)
        .map(([date, visits]) => ({ date, visits })),
        
      // Most viewed tasks
      mostViewedTasks: Object.entries(analytics.pageViews.tasks)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([taskId, views]) => {
          const task = tasks.find(t => t.id === taskId);
          return {
            taskId,
            taskTitle: task?.title || 'Unknown Task',
            views,
          };
        }),
    };
    
    return NextResponse.json({ 
      dashboard: dashboardData,
      success: true 
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', success: false },
      { status: 500 }
    );
  }
} 