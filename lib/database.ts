import { connectToDatabase, createObjectId, ObjectId } from './mongodb';
import { logger } from './logger';
import { cache } from './cache';

// Types for our collections
export interface Project {
  _id?: ObjectId;
  name: string;
  description: string;
  isActive?: boolean;
  color?: string;
  priority?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  _id?: ObjectId;
  title: string;
  subtitle?: string;
  images?: string[];
  datacoNumber: string;
  description?: {
    main?: string;
    howToExecute?: string;
  };
  projectId: ObjectId;
  type: string[];
  locations: string[];
  amountNeeded?: number;
  targetCar: string[];
  lidar?: boolean;
  dayTime: string[];
  priority: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subtask {
  _id?: ObjectId;
  taskId: ObjectId;
  title: string;
  subtitle?: string;
  images?: string[];
  datacoNumber: string;
  type: 'events' | 'hours';
  amountNeeded?: number;
  labels: string[];
  targetCar: string[];
  weather?: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene?: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
  dayTime: string[];
  isVisible?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  _id?: ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'data_manager' | 'driver_manager';
  createdAt: Date;
  lastLogin?: Date;
  isActive?: boolean;
  createdBy?: ObjectId;
  lastModifiedBy?: ObjectId;
  lastModifiedAt?: Date;
}

export interface Analytics {
  _id?: ObjectId;
  // Visit tracking
  visits: {
    total: number;
    today: number;
    last7Days: number;
    last30Days: number;
  };
  // Unique visitors tracking
  uniqueVisitors: {
    total: number;
    today: Set<string> | string[]; // User IDs who visited today
    last7Days: Set<string> | string[];
    last30Days: Set<string> | string[];
  };
  // Daily aggregation
  dailyStats: {
    [date: string]: {
      visits: number;
      uniqueVisitors: string[]; // Array of user IDs
      actions: number;
      loginCount: number;
    };
  };
  // Real-time counters
  counters: {
    projects: number;
    tasks: number;
    subtasks: number;
    users: number;
    activeUsers: number;
  };
  lastUpdated: Date;
}

export interface DailyUpdate {
  _id?: ObjectId;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  durationType: 'hours' | 'days' | 'permanent';
  durationValue?: number;
  expiresAt?: Date;
  isActive: boolean;
  isPinned: boolean;
  isHidden: boolean;
  targetAudience: string[];
  projectId?: ObjectId;
  isGeneral?: boolean;
  createdBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyUpdateSetting {
  _id?: ObjectId;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// New interface for detailed user sessions
export interface UserSession {
  _id?: ObjectId;
  userId: string;
  username: string;
  email: string;
  role: string;
  sessionStart: Date;
  sessionEnd?: Date;
  ipAddress?: string;
  userAgent?: string;
  actions: number;
  lastActivity: Date;
  isActive: boolean;
}

// Enhanced activity event interface
export interface ActivityLog {
  _id?: ObjectId;
  timestamp: Date;
  userId: string;
  username: string;
  userRole: string;
  action: string;
  category: 'auth' | 'project' | 'task' | 'subtask' | 'user' | 'system' | 'view';
  target?: {
    id: string;
    type: string;
    name?: string;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    changes?: Record<string, { old: any; new: any }>;
    [key: string]: any;
  };
  severity: 'info' | 'success' | 'warning' | 'error';
}

// Database service class
export class DatabaseService {
  private async getCollections() {
    const connection = await connectToDatabase();
    if (!connection || !connection.db) {
      throw new Error('Failed to get database connection for DatabaseService.');
    }
    const db = connection.db;
    return {
      projects: db.collection<Project>('projects'),
      tasks: db.collection<Task>('tasks'),
      subtasks: db.collection<Subtask>('subtasks'),
      appUsers: db.collection<AppUser>('appUsers'),
      analytics: db.collection<Analytics>('analytics'),
      userSessions: db.collection<UserSession>('userSessions'),
      activityLogs: db.collection<ActivityLog>('activityLogs'),
      dailyUpdates: db.collection<DailyUpdate>('dailyUpdates'),
      dailyUpdatesSettings: db.collection<DailyUpdateSetting>('dailyUpdatesSettings'),
      activities: db.collection('activities'),
      feedbackTickets: db.collection('feedbackTickets'),
    };
  }

  // Project operations
  async getAllProjects(): Promise<Project[]> {
    try {
      const { projects } = await this.getCollections();
      const result = await projects.find({}).sort({ createdAt: -1 }).toArray();
      return result;
    } catch (error) {
      logger.error('Error getting all projects', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { projects } = await this.getCollections();
      const result = await projects.findOne({ _id: createObjectId(id) });
      return result;
    } catch (error) {
      logger.error('Error getting project by ID', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async createProject(project: Omit<Project, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { projects } = await this.getCollections();
      const now = new Date();
      const result = await projects.insertOne({
        name: project.name,
        description: project.description || '',
        isActive: project.isActive !== undefined ? project.isActive : true,
        color: project.color || '#3B82F6',
        priority: project.priority || 1,
        clientName: project.clientName || '',
        clientEmail: project.clientEmail || '',
        clientPhone: project.clientPhone || '',
        notes: project.notes || '',
        image: project.image || '',
        createdAt: now,
        updatedAt: now
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Error creating project', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
    try {
      const { projects } = await this.getCollections();
      const result = await projects.updateOne(
        { _id: createObjectId(id) },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating project', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      const { projects, tasks } = await this.getCollections();
      
      // First, check if there are tasks associated with this project
      const projectTasks = await tasks.find({ projectId: createObjectId(id) }).toArray();
      
      if (projectTasks.length > 0) {
        // Delete all tasks and their subtasks
        await tasks.deleteMany({ projectId: createObjectId(id) });
      }
      
      const result = await projects.deleteOne({ _id: createObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting project', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Task operations
  async getAllTasks(includeHidden = false): Promise<Task[]> {
    try {
      const { tasks } = await this.getCollections();
      const filter = includeHidden ? {} : { isVisible: true };
      const result = await tasks.find(filter).sort({ priority: -1 }).toArray();
      return result;
    } catch (error) {
      logger.error('Error getting all tasks', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { tasks } = await this.getCollections();
      const objectId = createObjectId(id);
      const result = await tasks.findOne({ _id: objectId });
      return result;
    } catch (error) {
      logger.error('Error getting task by ID', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    try {
      const { tasks } = await this.getCollections();
      const result = await tasks.find({ projectId: createObjectId(projectId) }).sort({ priority: -1 }).toArray();
      return result;
    } catch (error) {
      logger.error('Error getting tasks by project', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getTaskByDatacoNumber(datacoNumber: string): Promise<Task | null> {
    try {
      const { tasks } = await this.getCollections();
      const result = await tasks.findOne({ datacoNumber });
      return result;
    } catch (error) {
      logger.error('Error getting task by dataco number', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async createTask(task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { tasks } = await this.getCollections();
      const now = new Date();
      const result = await tasks.insertOne({
        ...task,
        projectId: createObjectId(task.projectId as any),
        createdAt: now,
        updatedAt: now
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Error creating task', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const { tasks } = await this.getCollections();
      const result = await tasks.updateOne(
        { _id: createObjectId(id) },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating task', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      const { tasks, subtasks } = await this.getCollections();
      
      // First delete all subtasks for this task
      await subtasks.deleteMany({ taskId: createObjectId(id) });
      
      // Then delete the task itself
      const result = await tasks.deleteOne({ _id: createObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting task', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Subtask operations
  async getSubtasksByTask(taskId: string, includeHidden = false): Promise<Subtask[]> {
    try {
      const { subtasks } = await this.getCollections();
      const filter: any = { taskId: createObjectId(taskId) };
      if (!includeHidden) {
        filter.$or = [{ isVisible: { $exists: false } }, { isVisible: true }];
      }
      const result = await subtasks.find(filter).sort({ createdAt: -1 }).toArray();
      return result;
    } catch (error) {
      logger.error('Error getting subtasks by task', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getSubtasksByDatacoNumber(datacoNumber: string): Promise<Subtask[]> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.find({ datacoNumber, $or: [{ isVisible: { $exists: false } }, { isVisible: true }] }).toArray();
      return result;
    } catch (error) {
      logger.error('Error getting subtasks by dataco number', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async createSubtask(subtask: Omit<Subtask, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { subtasks } = await this.getCollections();
      const now = new Date();
      const result = await subtasks.insertOne({
        ...subtask,
        isVisible: subtask.isVisible !== undefined ? subtask.isVisible : true,
        taskId: createObjectId(subtask.taskId as any),
        createdAt: now,
        updatedAt: now
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Error creating subtask', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async getSubtaskById(id: string): Promise<Subtask | null> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.findOne({ _id: createObjectId(id) });
      return result;
    } catch (error) {
      logger.error('Error getting subtask by ID', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async updateSubtask(id: string, updates: Partial<Subtask>): Promise<boolean> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.updateOne(
        { _id: createObjectId(id) },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating subtask', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteSubtask(id: string): Promise<boolean> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.deleteOne({ _id: createObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting subtask', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async updateSubtaskVisibility(id: string, isVisible: boolean): Promise<boolean> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.updateOne(
        { _id: createObjectId(id) },
        { $set: { isVisible, updatedAt: new Date() } }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating subtask visibility', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // User operations
  async getUserByEmail(email: string): Promise<AppUser | null> {
    try {
      const { appUsers } = await this.getCollections();
      const result = await appUsers.findOne({ email });
      return result;
    } catch (error) {
      logger.error('Error getting user by email', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<AppUser | null> {
    try {
      const { appUsers } = await this.getCollections();
      const result = await appUsers.findOne({ username });
      return result;
    } catch (error) {
      logger.error('Error getting user by username', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async createUser(user: Omit<AppUser, '_id' | 'createdAt'>): Promise<string> {
    try {
      const { appUsers } = await this.getCollections();
      const result = await appUsers.insertOne({
        ...user,
        isActive: user.isActive !== undefined ? user.isActive : true,
        createdAt: new Date()
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Error creating user', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async getAllUsers(): Promise<AppUser[]> {
    try {
      const { appUsers } = await this.getCollections();
      const result = await appUsers.find({}).sort({ createdAt: -1 }).toArray();
      return result;
    } catch (error) {
      logger.error('Error getting all users', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getUserById(id: string): Promise<AppUser | null> {
    try {
      const { appUsers } = await this.getCollections();
      const result = await appUsers.findOne({ _id: createObjectId(id) });
      return result;
    } catch (error) {
      logger.error('Error getting user by ID', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<AppUser>, modifiedBy: string): Promise<boolean> {
    try {
      const { appUsers } = await this.getCollections();
      const result = await appUsers.updateOne(
        { _id: createObjectId(id) },
        { 
          $set: {
            ...updates,
            lastModifiedBy: createObjectId(modifiedBy),
            lastModifiedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating user', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const { appUsers } = await this.getCollections();
      const result = await appUsers.deleteOne({ _id: createObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting user', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Analytics operations
  async getAnalytics(): Promise<Analytics | null> {
    try {
      const { analytics } = await this.getCollections();
      let result = await analytics.findOne({});
      const today = new Date().toISOString().split('T')[0];
      
      // Initialize analytics if not exists
      if (!result) {
        const now = new Date();
        const initialData: Analytics = {
          visits: { total: 0, today: 0, last7Days: 0, last30Days: 0 },
          uniqueVisitors: { total: 0, today: [], last7Days: [], last30Days: [] },
          dailyStats: {
            [today]: {
              visits: 0,
              uniqueVisitors: [],
              actions: 0,
              loginCount: 0
            }
          },
          counters: { projects: 0, tasks: 0, subtasks: 0, users: 0, activeUsers: 0 },
          lastUpdated: now
        };
        const insertResult = await analytics.insertOne(initialData);
        result = { ...initialData, _id: insertResult.insertedId };
      }
      
      // Ensure today's stats exist
      if (result && (!result.dailyStats || !result.dailyStats[today])) {
        await analytics.updateOne(
          {},
          {
            $set: {
              [`dailyStats.${today}`]: {
                visits: 0,
                uniqueVisitors: [],
                actions: 0,
                loginCount: 0
              }
            }
          }
        );
        // Update the result object to reflect the change
        if (!result.dailyStats) result.dailyStats = {};
        result.dailyStats[today] = {
          visits: 0,
          uniqueVisitors: [],
          actions: 0,
          loginCount: 0
        };
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting analytics', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  // New method to track user visit
  async trackVisit(userId: string, username: string, email: string, role: string): Promise<void> {
    try {
      // Skip tracking for admin users
      if (role === 'admin') {
        return;
      }
      
      const { analytics, userSessions } = await this.getCollections();
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // Update or create user session
      await userSessions.updateOne(
        { userId, isActive: true },
        {
          $set: {
            username,
            email,
            role,
            lastActivity: now
          },
          $setOnInsert: {
            sessionStart: now,
            actions: 0,
            isActive: true
          }
        },
        { upsert: true }
      );
      
      // Increment actions separately to avoid conflict
      await userSessions.updateOne(
        { userId, isActive: true },
        { $inc: { actions: 1 } }
      );
      
      // Update analytics
      const analyticsDoc = await this.getAnalytics();
      if (analyticsDoc) {
        // Update unique visitors arrays
        const todayVisitors = new Set(analyticsDoc.uniqueVisitors.today as string[]);
        const last7DaysVisitors = new Set(analyticsDoc.uniqueVisitors.last7Days as string[]);
        const last30DaysVisitors = new Set(analyticsDoc.uniqueVisitors.last30Days as string[]);
        
        todayVisitors.add(userId);
        last7DaysVisitors.add(userId);
        last30DaysVisitors.add(userId);
        
        // Update daily stats
        if (!analyticsDoc.dailyStats[today]) {
          analyticsDoc.dailyStats[today] = {
            visits: 0,
            uniqueVisitors: [],
            actions: 0,
            loginCount: 0
          };
        }
        
        const dailyUniqueVisitors = new Set(analyticsDoc.dailyStats[today].uniqueVisitors);
        dailyUniqueVisitors.add(userId);
        
        await analytics.updateOne(
          {},
          {
            $set: {
              'uniqueVisitors.today': Array.from(todayVisitors),
              'uniqueVisitors.last7Days': Array.from(last7DaysVisitors),
              'uniqueVisitors.last30Days': Array.from(last30DaysVisitors),
              [`dailyStats.${today}.uniqueVisitors`]: Array.from(dailyUniqueVisitors),
              'uniqueVisitors.total': await userSessions.countDocuments({}),
              lastUpdated: now
            },
            $inc: {
              'visits.total': 1,
              'visits.today': 1,
              [`dailyStats.${today}.visits`]: 1
            }
          }
        );
      }
    } catch (error) {
      logger.error('Error tracking visit', 'DATABASE', { error: (error as Error).message });
    }
  }

  // New method to log action with detailed tracking
  async logAction(data: {
    userId: string;
    username: string;
    userRole: string;
    action: string;
    category: ActivityLog['category'];
    target?: ActivityLog['target'];
    metadata?: ActivityLog['metadata'];
    severity?: ActivityLog['severity'];
  }): Promise<void> {
    try {
      // Skip logging for admin users
      if (data.userRole === 'admin') {
        return;
      }
      
      const { activityLogs, analytics, userSessions } = await this.getCollections();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Create activity log
      await activityLogs.insertOne({
        timestamp: now,
        userId: data.userId,
        username: data.username,
        userRole: data.userRole,
        action: data.action,
        category: data.category,
        target: data.target,
        metadata: data.metadata,
        severity: data.severity || 'info'
      });
      
      // Update user session
      await userSessions.updateOne(
        { userId: data.userId, isActive: true },
        {
          $set: { lastActivity: now },
          $inc: { actions: 1 }
        }
      );
      
      // Ensure daily stats structure exists before incrementing
      const analyticsDoc = await this.getAnalytics();
      if (analyticsDoc && !analyticsDoc.dailyStats[today]) {
        await analytics.updateOne(
          {},
          {
            $set: {
              [`dailyStats.${today}`]: {
                visits: 0,
                uniqueVisitors: [],
                actions: 0,
                loginCount: 0
              }
            }
          }
        );
      }
      
      // Update analytics daily stats
      await analytics.updateOne(
        {},
        {
          $inc: {
            [`dailyStats.${today}.actions`]: 1,
            ...(data.category === 'auth' && data.action.includes('התחבר') ? 
              { [`dailyStats.${today}.loginCount`]: 1 } : {})
          }
        }
      );
    } catch (error) {
      logger.error('Error logging action', 'DATABASE', { error: (error as Error).message });
    }
  }

  // Update counters
  async updateAnalyticsCounters(): Promise<void> {
    try {
      const { analytics, projects, tasks, subtasks, appUsers, userSessions } = await this.getCollections();
      
      const [projectCount, taskCount, subtaskCount, userCount, activeUserCount] = await Promise.all([
        projects.countDocuments({}),
        tasks.countDocuments({}),
        subtasks.countDocuments({}),
        appUsers.countDocuments({}),
        userSessions.countDocuments({ isActive: true })
      ]);
      
      await analytics.updateOne(
        {},
        {
          $set: {
            'counters.projects': projectCount,
            'counters.tasks': taskCount,
            'counters.subtasks': subtaskCount,
            'counters.users': userCount,
            'counters.activeUsers': activeUserCount,
            lastUpdated: new Date()
          }
        }
      );
    } catch (error) {
      logger.error('Error updating analytics counters', 'DATABASE', { error: (error as Error).message });
    }
  }

  // Get analytics data for dashboard
  async getAnalyticsDashboard(range: '1d' | '7d' | '30d'): Promise<any> {
    try {
      const { analytics, activityLogs, userSessions } = await this.getCollections();
      const now = new Date();
      const startDate = new Date();
      
      if (range === '1d') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (range === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setDate(startDate.getDate() - 30);
      }
      
      // Get analytics document
      const analyticsDoc = await this.getAnalytics();
      
      // Get recent activities (exclude admin)
      const recentActivities = await activityLogs
        .find({ 
          timestamp: { $gte: startDate },
          userRole: { $ne: 'admin' }
        })
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();
      
      // Get active sessions (exclude admin)
      const activeSessions = await userSessions
        .find({ 
          isActive: true,
          role: { $ne: 'admin' }
        })
        .sort({ lastActivity: -1 })
        .toArray();
      
      // Calculate visit stats based on range and daily stats
      let visitCount = 0;
      let uniqueVisitorCount = 0;
      const uniqueVisitorSet = new Set<string>();
      
      if (analyticsDoc && analyticsDoc.dailyStats) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        if (range === '1d') {
          // For today, use today's stats
          const todayStats = analyticsDoc.dailyStats[today] || { visits: 0, uniqueVisitors: [] };
          visitCount = todayStats.visits || 0;
          uniqueVisitorCount = Array.isArray(todayStats.uniqueVisitors) ? todayStats.uniqueVisitors.length : 0;
        } else {
          // Calculate from daily stats for the range
          const endDate = new Date();
          const startDateCalc = new Date();
          startDateCalc.setDate(startDateCalc.getDate() - (range === '7d' ? 7 : 30));
          
          Object.entries(analyticsDoc.dailyStats).forEach(([date, stats]) => {
            const dateObj = new Date(date);
            if (dateObj >= startDateCalc && dateObj <= endDate) {
              visitCount += stats.visits || 0;
              if (Array.isArray(stats.uniqueVisitors)) {
                stats.uniqueVisitors.forEach(userId => uniqueVisitorSet.add(userId));
              }
            }
          });
          
          uniqueVisitorCount = uniqueVisitorSet.size;
        }
      }
      
      // Group activities by category
      const activityByCategory: Record<string, number> = {};
      const activityByUser: Record<string, { count: number; username: string; role: string }> = {};
      
      recentActivities.forEach(activity => {
        // By category
        activityByCategory[activity.category] = (activityByCategory[activity.category] || 0) + 1;
        
        // By user
        if (!activityByUser[activity.userId]) {
          activityByUser[activity.userId] = {
            count: 0,
            username: activity.username,
            role: activity.userRole
          };
        }
        activityByUser[activity.userId].count++;
      });
      
      // Get top users
      const topUsers = Object.entries(activityByUser)
        .map(([userId, data]) => ({
          userId,
          username: data.username,
          role: data.role,
          actionCount: data.count
        }))
        .sort((a, b) => b.actionCount - a.actionCount)
        .slice(0, 10);
      
      return {
        visits: visitCount,
        uniqueVisitors: uniqueVisitorCount,
        activeSessions: activeSessions.length,
        counters: analyticsDoc?.counters || {},
        recentActivities: recentActivities.slice(0, 50),
        activityByCategory,
        topUsers,
        dailyStats: analyticsDoc?.dailyStats || {}
      };
    } catch (error) {
      logger.error('Error getting analytics dashboard', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  // Clean up old analytics data (run periodically)
  async cleanupAnalytics(): Promise<void> {
    try {
      const { analytics, activityLogs, userSessions } = await this.getCollections();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Remove old activity logs
      await activityLogs.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });
      
      // Mark old sessions as inactive
      await userSessions.updateMany(
        { lastActivity: { $lt: thirtyDaysAgo }, isActive: true },
        { $set: { isActive: false } }
      );
      
      // Clean up daily stats older than 30 days
      const analyticsDoc = await analytics.findOne({});
      if (analyticsDoc) {
        const dailyStats = analyticsDoc.dailyStats;
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        Object.keys(dailyStats).forEach(date => {
          if (date < cutoffDate) {
            delete dailyStats[date];
          }
        });
        
        await analytics.updateOne(
          {},
          { $set: { dailyStats, lastUpdated: new Date() } }
        );
      }
    } catch (error) {
      logger.error('Error cleaning up analytics', 'DATABASE', { error: (error as Error).message });
    }
  }

  // Legacy methods for backward compatibility
  async updateAnalytics(updates: Partial<Analytics>): Promise<boolean> {
    return true; // No-op for legacy code
  }

  async incrementPageView(page: string): Promise<boolean> {
    return true; // No-op for legacy code
  }

  async logVisit(dateStr: string): Promise<{ isUniqueVisitor: boolean; totalVisits: number }> {
    // Legacy method - return dummy data
    return { isUniqueVisitor: false, totalVisits: 0 };
  }

  // Daily Updates operations
  async getActiveDailyUpdates(includeHidden = false): Promise<DailyUpdate[]> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const filter: any = {
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      };
      
      if (!includeHidden) {
        filter.isHidden = { $ne: true };
      }
      
      const result = await dailyUpdates.find(filter)
        .sort({ isPinned: -1, priority: -1, createdAt: -1 })
        .toArray();
      
      return result;
    } catch (error) {
      logger.error('Error getting active daily updates', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getActiveDailyUpdatesByScope(projectId?: string, includeHidden = false): Promise<DailyUpdate[]> {
    try {
      const { dailyUpdates } = await this.getCollections();
      
      const filter: any = {
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      };
      
      if (!includeHidden) {
        filter.isHidden = { $ne: true };
      }
      
      // Add scope filtering
      if (projectId) {
        filter.projectId = createObjectId(projectId);
      } else {
        // For homepage/general scope - get general updates only
        filter.$or = [
          { isGeneral: true },
          { projectId: { $exists: false } },
          { projectId: null }
        ];
      }
      
      const result = await dailyUpdates.find(filter)
        .sort({ isPinned: -1, priority: -1, createdAt: -1 })
        .toArray();
      
      return result;
    } catch (error) {
      logger.error('Error getting scoped daily updates', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getProjectByName(name: string): Promise<Project | null> {
    try {
      const { projects } = await this.getCollections();
      const result = await projects.findOne({ name });
      return result;
    } catch (error) {
      logger.error('Error getting project by name', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async getAllDailyUpdates(): Promise<DailyUpdate[]> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const result = await dailyUpdates.find({})
        .sort({ createdAt: -1 })
        .toArray();
      return result;
    } catch (error) {
      logger.error('Error getting all daily updates', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async createDailyUpdate(update: Omit<DailyUpdate, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const now = new Date();
      const result = await dailyUpdates.insertOne({
        ...update,
        createdAt: now,
        updatedAt: now
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Error creating daily update', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async getDailyUpdateById(id: string): Promise<DailyUpdate | null> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const result = await dailyUpdates.findOne({ _id: createObjectId(id) });
      return result;
    } catch (error) {
      logger.error('Error getting daily update by ID', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async updateDailyUpdate(id: string, updates: Partial<DailyUpdate>): Promise<boolean> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const result = await dailyUpdates.updateOne(
        { _id: createObjectId(id) },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error updating daily update', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteDailyUpdate(id: string): Promise<boolean> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const result = await dailyUpdates.deleteOne({ _id: createObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting daily update', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Daily Update Settings
  async getDailyUpdateSetting(key: string): Promise<DailyUpdateSetting | null> {
    try {
      const { dailyUpdatesSettings } = await this.getCollections();
      const result = await dailyUpdatesSettings.findOne({ key });
      return result;
    } catch (error) {
      logger.error('Error getting daily update setting', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async upsertDailyUpdateSetting(key: string, value: string): Promise<boolean> {
    try {
      const { dailyUpdatesSettings } = await this.getCollections();
      const now = new Date();
      const result = await dailyUpdatesSettings.updateOne(
        { key },
        { 
          $set: { 
            value,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: now
          }
        },
        { upsert: true }
      );
      return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (error) {
      logger.error('Error upserting daily update setting', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Search operations
  async searchTasks(query: string): Promise<Task[]> {
    try {
      const { tasks } = await this.getCollections();
      const searchRegex = new RegExp(query, 'i');
      const result = await tasks.find({
        $and: [
          { isVisible: true },
          {
            $or: [
              { title: searchRegex },
              { subtitle: searchRegex },
              { datacoNumber: searchRegex },
              { type: { $in: [searchRegex] } },
              { locations: { $in: [searchRegex] } },
              { targetCar: { $in: [searchRegex] } }
            ]
          }
        ]
      }).sort({ priority: -1 }).toArray();
      return result;
    } catch (error) {
      logger.error('Error searching tasks', 'DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  // Optimized methods for API endpoints
  async getHomepageData(): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    // Try to get from cache first
    const cacheKey = 'homepage_data_v2';
    const cachedData = cache.get<{ projects: Project[]; tasks: Task[] }>(cacheKey, { 
      namespace: 'api_data',
      ttl: 2 * 60 * 1000 // 2 minutes cache
    });
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const { projects, tasks } = await this.getCollections();
      
      // Create lean queries for homepage
      const projectsQuery = projects.find(
        {},
        { 
          projection: { 
            name: 1, 
            description: 1,
            createdAt: 1
          } 
        }
      ).sort({ name: 1 }).toArray();
      
      const tasksQuery = tasks.find(
        { isVisible: true },
        { 
          projection: { 
            title: 1,
            subtitle: 1,
            datacoNumber: 1,
            projectId: 1,
            type: 1,
            locations: 1,
            targetCar: 1,
            dayTime: 1,
            priority: 1,
            isVisible: 1
          } 
        }
      ).sort({ priority: -1 }).toArray();
      
      // Run both queries in parallel
      const [projectsData, tasksData] = await Promise.all([projectsQuery, tasksQuery]);
      
      const result = {
        projects: projectsData as Project[],
        tasks: tasksData as Task[]
      };
      
      // Store in cache
      cache.set(cacheKey, result, { 
        namespace: 'api_data',
        ttl: 2 * 60 * 1000  // 2 minutes
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to get homepage data', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async getProjectPageData(projectName: string): Promise<{
    project: Project;
    tasks: Task[];
    subtasks: Record<string, Subtask[]>;
    success: boolean;
  }> {
    const normalizedProjectName = decodeURIComponent(projectName);
    
    // Try to get from cache first
    const cacheKey = `project_data_${normalizedProjectName}_v2`;
    const cachedData = cache.get<{ 
      project: Project; 
      tasks: Task[]; 
      subtasks: Record<string, Subtask[]>;
      success: boolean;
    }>(cacheKey, { 
      namespace: 'api_data',
      ttl: 2 * 60 * 1000 // 2 minutes cache
    });
    
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const { projects, tasks, subtasks } = await this.getCollections();
      
      // First get the project
      const project = await projects.findOne({ name: normalizedProjectName });
      
      if (!project) {
        throw new Error(`Project not found: ${normalizedProjectName}`);
      }
      
      // Then get tasks for this project
      const projectTasks = await tasks.find(
        { 
          projectId: project._id,
          isVisible: true 
        },
        {
          projection: {
            title: 1,
            subtitle: 1,
            datacoNumber: 1,
            projectId: 1,
            type: 1,
            locations: 1,
            targetCar: 1,
            dayTime: 1,
            priority: 1,
            isVisible: 1,
            description: 1,
            images: 1,
            amountNeeded: 1,
            lidar: 1
          }
        }
      ).sort({ priority: -1 }).toArray();
      
      // Get all task IDs
      const taskIds = projectTasks.map(task => task._id);
      
      // Fetch subtasks for all tasks in this project
      const allSubtasks = await subtasks.find(
        { taskId: { $in: taskIds }, $or: [{ isVisible: { $exists: false } }, { isVisible: true }] }
      ).toArray();
      
      // Organize subtasks by task ID
      const subtasksByTaskId: Record<string, Subtask[]> = {};
      for (const subtask of allSubtasks) {
        const taskId = subtask.taskId.toString();
        if (!subtasksByTaskId[taskId]) {
          subtasksByTaskId[taskId] = [];
        }
        subtasksByTaskId[taskId].push(subtask);
      }
      
      const result = {
        project: project as Project,
        tasks: projectTasks as Task[],
        subtasks: subtasksByTaskId,
        success: true
      };
      
      // Store in cache
      cache.set(cacheKey, result, { 
        namespace: 'api_data',
        ttl: 2 * 60 * 1000 // 2 minutes cache
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to get project page data', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async getProjectStats(): Promise<Record<string, { taskCount: number; highPriorityCount: number }>> {
    try {
      const { projects, tasks } = await this.getCollections();
      
      // Get all projects and tasks
      const [allProjects, allTasks] = await Promise.all([
        projects.find({}).toArray(),
        tasks.find({ isVisible: true }).toArray()
      ]);
      
      // Group tasks by project
      const stats: Record<string, { taskCount: number; highPriorityCount: number }> = {};
      
      // Initialize stats for all projects
      allProjects.forEach(project => {
        stats[project.name] = { taskCount: 0, highPriorityCount: 0 };
      });
      
      // Count tasks for each project
      allTasks.forEach(task => {
        const project = allProjects.find(p => p._id?.toString() === task.projectId.toString());
        if (project) {
          stats[project.name].taskCount++;
          if (task.priority >= 8) { // High priority threshold
            stats[project.name].highPriorityCount++;
          }
        }
      });
      
      return stats;
    } catch (error) {
      logger.error('Error getting project stats', 'DATABASE', { error: (error as Error).message });
      return {};
    }
  }

  // Cache management methods
  invalidateHomepageCache(): void {
    cache.delete('homepage_data_v2', { namespace: 'api_data' });
  }

  invalidateProjectCache(projectName: string): void {
    const normalizedProjectName = decodeURIComponent(projectName);
    cache.delete(`project_data_${normalizedProjectName}_v2`, { namespace: 'api_data' });
  }

  invalidateTaskCache(taskId: string): void {
    // Invalidate related caches when a task changes
    this.invalidateHomepageCache();
  }

  clearAllCaches(): void {
    cache.clear('api_data');
  }

  async logActivity(activityData: {
    category: string;
    action: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    details?: Record<string, any>;
    userId?: string;
    userType?: 'admin' | 'user' | 'system';
    target?: {
      id: string;
      type: string;
      title?: string;
    };
  }): Promise<boolean> {
    try {
      // Map to new logAction method
      if (activityData.userId) {
        const user = await this.getUserById(activityData.userId);
        if (user) {
          await this.logAction({
            userId: activityData.userId,
            username: user.username,
            userRole: user.role,
            action: activityData.action,
            category: activityData.category as ActivityLog['category'],
            target: activityData.target,
            metadata: activityData.details,
            severity: activityData.severity
          });
        }
      } else {
        // System action
        await this.logAction({
          userId: 'system',
          username: 'System',
          userRole: 'system',
          action: activityData.action,
          category: activityData.category as ActivityLog['category'],
          target: activityData.target,
          metadata: activityData.details,
          severity: activityData.severity
        });
      }
      return true;
    } catch (error) {
      logger.error('Error logging activity', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }
}

// Create a singleton instance
export const db = new DatabaseService();

// Export convenience functions
export async function getHomepageData() {
  return db.getHomepageData();
}

export async function getProjectPageData(projectName: string) {
  return db.getProjectPageData(projectName);
}

export async function updateSubtaskVisibility(id: string, isVisible: boolean) {
  return db.updateSubtaskVisibility(id, isVisible);
} 