import { NextRequest, NextResponse } from 'next/server';
import { db, type Subtask } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';

// GET /api/analytics - Advanced analytics data for admin
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);

    // Get time range from query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
    // Calculate date ranges
    const now = new Date();
    const daysBack = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    // Fetch all data from MongoDB
    const [tasks, projects] = await Promise.all([
      db.getAllTasks(true), // Include hidden tasks for admin
      db.getAllProjects()
    ]);

    // Get all subtasks for all tasks
    const allSubtasks: Subtask[] = [];
    for (const task of tasks) {
      const subtasks = await db.getSubtasksByTask(task._id!.toString());
      allSubtasks.push(...subtasks);
    }

    // Basic counts
    const totalTasks = tasks.length;
    const visibleTasks = tasks.filter(task => task.isVisible).length;
    const hiddenTasks = totalTasks - visibleTasks;
    const totalSubtasks = allSubtasks.length;
    const totalProjects = projects.length;

    // Task priority distribution
    const tasksByPriority = {
      high: tasks.filter(task => task.priority >= 1 && task.priority <= 3).length,
      medium: tasks.filter(task => task.priority >= 4 && task.priority <= 6).length,
      low: tasks.filter(task => task.priority >= 7 && task.priority <= 10).length,
      none: tasks.filter(task => task.priority === 0).length
    };

    // Task type distribution
    const tasksByType = {
      events: tasks.filter(task => task.type?.includes('events')).length,
      hours: tasks.filter(task => task.type?.includes('hours')).length
    };

    // Project analytics
    const tasksByProject = projects.map(project => {
      const projectTasks = tasks.filter(task => task.projectId.toString() === project._id!.toString());
      const projectSubtasks = allSubtasks.filter(subtask => 
        projectTasks.some(task => task._id!.toString() === subtask.taskId.toString())
      );
      const highPriorityTasks = projectTasks.filter(task => 
        task.priority >= 1 && task.priority <= 3
      );

      return {
        projectName: project.name,
        taskCount: projectTasks.length,
        subtaskCount: projectSubtasks.length,
        highPriorityCount: highPriorityTasks.length
      };
    });

    // Performance metrics
    const averageTasksPerProject = totalProjects > 0 ? totalTasks / totalProjects : 0;
    const averageSubtasksPerTask = totalTasks > 0 ? totalSubtasks / totalTasks : 0;

    // Generate mock time-based data (in a real app, this would come from analytics database)
    const recentActivity = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      recentActivity.push({
        date: date.toISOString().split('T')[0],
        visits: Math.floor(Math.random() * 50) + 10,
        tasksCreated: Math.floor(Math.random() * 3),
        subtasksCreated: Math.floor(Math.random() * 8)
      });
    }

    // Mock visit analytics (in a real app, this would come from analytics tracking)
    const totalVisits = Math.floor(Math.random() * 1000) + 500;
    const uniqueVisitors = Math.floor(totalVisits * 0.7);
    const visitsThisWeek = recentActivity.slice(-7).reduce((sum, day) => sum + day.visits, 0);
    const visitsLastWeek = recentActivity.slice(-14, -7).reduce((sum, day) => sum + day.visits, 0);

    // Most viewed tasks (mock data - in a real app, track actual views)
    const mostViewedTasks = tasks
      .filter(task => task.isVisible)
      .slice(0, 10)
      .map(task => {
        const project = projects.find(p => p._id!.toString() === task.projectId.toString());
        return {
          taskId: task._id!.toString(),
          taskTitle: task.title,
          projectName: project?.name || 'Unknown Project',
          views: Math.floor(Math.random() * 100) + 10
        };
      })
      .sort((a, b) => b.views - a.views);

    // Task creation trends
    const tasksCreatedThisWeek = recentActivity.slice(-7).reduce((sum, day) => sum + day.tasksCreated, 0);
    const tasksCreatedLastWeek = recentActivity.slice(-14, -7).reduce((sum, day) => sum + day.tasksCreated, 0);

    // System health mock (in a real app, monitor actual system metrics)
    const systemHealth = {
      score: Math.floor(Math.random() * 20) + 80, // 80-100%
      uptime: 99.9,
      responseTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
      errorRate: Math.random() * 0.1 // 0-0.1%
    };

    const analyticsData = {
      // Overview Stats
      totalTasks,
      visibleTasks,
      hiddenTasks,
      totalSubtasks,
      totalProjects,
      totalVisits,
      uniqueVisitors,
      
      // Performance Metrics
      tasksByPriority,
      tasksByType,
      tasksByProject,
      
      // Time-based Analytics
      recentActivity,
      
      // User Engagement
      mostViewedTasks,
      
      // Performance Indicators
      completionRate: totalTasks > 0 ? Math.round((visibleTasks / totalTasks) * 100) : 0,
      averageTasksPerProject,
      averageSubtasksPerTask,
      
      // Productivity Metrics
      tasksCreatedThisWeek,
      tasksCreatedLastWeek,
      visitsThisWeek,
      visitsLastWeek,
      
      // System Health
      systemHealth
    };

    logger.info('Analytics data fetched successfully', 'ANALYTICS_API', { 
      totalTasks, 
      totalProjects, 
      range,
      userId: user?.id 
    });

    return NextResponse.json({
      success: true,
      analytics: analyticsData,
      range,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({
        error: error.message,
        success: false
      }, { status: 401 });
    }

    logger.error('Analytics API error', 'ANALYTICS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to fetch analytics data',
      success: false
    }, { status: 500 });
  }
}

// POST /api/analytics - Log a visit (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, isUniqueVisitor } = body;
    
    // Get current analytics from MongoDB
    const current = await db.getAnalytics();
    
    // Calculate new values
    const newTotalVisits = (current?.totalVisits || 0) + 1;
    const newUniqueVisitors = isUniqueVisitor ? (current?.uniqueVisitors || 0) + 1 : (current?.uniqueVisitors || 0);
    
    // Update daily stats
    const today = date || new Date().toISOString().split('T')[0];
    const dailyStats = current?.dailyStats || {};
    const newTodayStats = (dailyStats[today] || 0) + 1;

    // Update analytics in MongoDB
    await db.updateAnalytics({
      totalVisits: newTotalVisits,
      uniqueVisitors: newUniqueVisitors,
      dailyStats: {
        ...dailyStats,
        [today]: newTodayStats
      }
    });

    logger.info('Analytics visit logged', 'ANALYTICS_API', { 
      date: today, 
      isUniqueVisitor, 
      totalVisits: newTotalVisits 
    });

    return NextResponse.json({
      success: true,
      totalVisits: newTotalVisits,
      uniqueVisitors: newUniqueVisitors
    });
  } catch (error) {
    logger.error('Analytics POST error', 'ANALYTICS_API', undefined, error as Error);
    return NextResponse.json({
      error: 'Failed to log visit',
      success: false
    }, { status: 500 });
  }
} 