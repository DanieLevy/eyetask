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
  role: 'admin';
  createdAt: Date;
  lastLogin?: Date;
}

export interface Analytics {
  _id?: ObjectId;
  totalVisits: number;
  uniqueVisitors: number;
  dailyStats: Record<string, any>;
  pageViews: {
    admin: number;
    tasks: Record<string, any>;
    homepage: number;
    projects: Record<string, any>;
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
  async getSubtasksByTask(taskId: string): Promise<Subtask[]> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.find({ taskId: createObjectId(taskId), $or: [{ isVisible: { $exists: false } }, { isVisible: true }] }).sort({ createdAt: -1 }).toArray();
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
        createdAt: new Date()
      });
      return result.insertedId.toString();
    } catch (error) {
      logger.error('Error creating user', 'DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  // Analytics operations
  async getAnalytics(): Promise<Analytics | null> {
    try {
      const { analytics } = await this.getCollections();
      const result = await analytics.findOne({});
      return result;
    } catch (error) {
      logger.error('Error getting analytics', 'DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async updateAnalytics(updates: Partial<Analytics>): Promise<boolean> {
    try {
      const { analytics } = await this.getCollections();
      const result = await analytics.updateOne(
        {},
        { 
          $set: {
            ...updates,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );
      return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (error) {
      logger.error('Error updating analytics', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async incrementPageView(page: string): Promise<boolean> {
    try {
      const { analytics } = await this.getCollections();
      const result = await analytics.updateOne(
        {},
        { 
          $inc: { [`pageViews.${page}`]: 1 },
          $set: { lastUpdated: new Date() }
        },
        { upsert: true }
      );
      return true;
    } catch (error) {
      logger.error('Error incrementing page view', 'DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async logVisit(dateStr: string): Promise<{ isUniqueVisitor: boolean; totalVisits: number }> {
    try {
      const { analytics } = await this.getCollections();
      
      // Get current analytics document
      let analyticsDoc = await analytics.findOne({});
      
      const currentTotalVisits = analyticsDoc?.totalVisits || 0;
      const currentUniqueVisitors = analyticsDoc?.uniqueVisitors || 0;
      const currentDailyStats = analyticsDoc?.dailyStats || {};
      
      const isUniqueVisitor = !currentDailyStats[dateStr];
      const newTotalVisits = currentTotalVisits + 1;
      
      // Update or create the document
      await analytics.updateOne(
        {},
        {
          $set: {
            totalVisits: newTotalVisits,
            uniqueVisitors: isUniqueVisitor ? currentUniqueVisitors + 1 : currentUniqueVisitors,
            [`dailyStats.${dateStr}`]: (currentDailyStats[dateStr] || 0) + 1,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );

      return { isUniqueVisitor, totalVisits: newTotalVisits };
    } catch (error) {
      logger.error('Error logging visit', 'DATABASE', { error: (error as Error).message });
      return { isUniqueVisitor: false, totalVisits: 0 };
    }
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
      const { activities } = await this.getCollections();
      await activities.insertOne({
        ...activityData,
        timestamp: new Date(),
        userId: activityData.userId ? createObjectId(activityData.userId) : undefined
      });
      return true;
    } catch (error) {
      logger.error('Error logging activity', 'DATABASE', { error: (error as Error).message });
      return false;
    }
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