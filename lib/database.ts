import { connectToDatabase } from './mongodb';
import { toObjectId, fromObjectId, handleMongoError } from './mongodb';
import { logger } from './logger';
import { ObjectId } from 'mongodb';
import { PerformanceTracker } from './enhanced-logging';
import { cache } from './cache';

// Types for our collections
export interface Project {
  _id?: ObjectId;
  name: string;
  description?: string;
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
      // Add other collections as needed
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
      handleMongoError(error, 'getAllProjects');
      return [];
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { projects } = await this.getCollections();
      const result = await projects.findOne({ _id: toObjectId(id) });
      return result;
    } catch (error) {
      handleMongoError(error, 'getProjectById');
      return null;
    }
  }

  async createProject(project: Omit<Project, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { projects } = await this.getCollections();
      const now = new Date();
      const result = await projects.insertOne({
        ...project,
        createdAt: now,
        updatedAt: now
      });
      return fromObjectId(result.insertedId);
    } catch (error) {
      handleMongoError(error, 'createProject');
      throw error;
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
    try {
      const { projects } = await this.getCollections();
      const result = await projects.updateOne(
        { _id: toObjectId(id) },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      handleMongoError(error, 'updateProject');
      return false;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      const { projects, tasks, subtasks } = await this.getCollections();
      
      // First delete all subtasks for tasks in this project
      const projectTasks = await tasks.find({ projectId: toObjectId(id) }).toArray();
      for (const task of projectTasks) {
        await subtasks.deleteMany({ taskId: task._id });
      }
      
      // Then delete all tasks for this project
      await tasks.deleteMany({ projectId: toObjectId(id) });
      
      // Finally delete the project itself
      const result = await projects.deleteOne({ _id: toObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      handleMongoError(error, 'deleteProject');
      return false;
    }
  }

  // Task operations
  async getAllTasks(includeHidden = false): Promise<Task[]> {
    try {
      const { tasks } = await this.getCollections();
      const filter = includeHidden ? {} : { isVisible: true };
      const result = await tasks.find(filter).sort({ priority: -1, createdAt: -1 }).toArray();
      return result;
    } catch (error) {
      handleMongoError(error, 'getAllTasks');
      return [];
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { tasks } = await this.getCollections();
      const objectId = toObjectId(id);
      
      // Use caching for task data
      const cacheKey = `task_${id}_v1`;
      const cachedTask = cache.get<Task>(cacheKey, { 
        namespace: 'task_data',
        ttl: 5 * 60 * 1000 // 5 minutes cache for task data
      });
      
      if (cachedTask) {
        return cachedTask;
      }
      
      const task = await tasks.findOne({ _id: objectId });
      
      if (task) {
        // Cache the task data
        cache.set(cacheKey, task, { 
          namespace: 'task_data',
          ttl: 5 * 60 * 1000 
        });
      }
      
      return task as Task | null;
    } catch (error) {
      logger.error(`Failed to get task: ${id}`, 'DB_TASK', {
        error: (error as Error).message,
        taskId: id
      });
      return null;
    }
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    try {
      const { tasks } = await this.getCollections();
      const result = await tasks.find({ projectId: toObjectId(projectId) }).sort({ priority: -1 }).toArray();
      return result;
    } catch (error) {
      handleMongoError(error, 'getTasksByProject');
      return [];
    }
  }

  async getTaskByDatacoNumber(datacoNumber: string): Promise<Task | null> {
    try {
      const { tasks } = await this.getCollections();
      const result = await tasks.findOne({ datacoNumber });
      return result;
    } catch (error) {
      handleMongoError(error, 'getTaskByDatacoNumber');
      return null;
    }
  }

  async createTask(task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { tasks } = await this.getCollections();
      const now = new Date();
      const result = await tasks.insertOne({
        ...task,
        projectId: toObjectId(task.projectId as any),
        createdAt: now,
        updatedAt: now
      });
      return fromObjectId(result.insertedId);
    } catch (error) {
      handleMongoError(error, 'createTask');
      throw error;
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const { tasks } = await this.getCollections();
      const result = await tasks.updateOne(
        { _id: toObjectId(id) },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      handleMongoError(error, 'updateTask');
      return false;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      const { tasks, subtasks } = await this.getCollections();
      
      // First delete all subtasks for this task
      await subtasks.deleteMany({ taskId: toObjectId(id) });
      
      // Then delete the task itself
      const result = await tasks.deleteOne({ _id: toObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      handleMongoError(error, 'deleteTask');
      return false;
    }
  }

  // Subtask operations
  async getSubtasksByTask(taskId: string): Promise<Subtask[]> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.find({ taskId: toObjectId(taskId) }).sort({ createdAt: -1 }).toArray();
      return result;
    } catch (error) {
      handleMongoError(error, 'getSubtasksByTask');
      return [];
    }
  }

  async getSubtasksByDatacoNumber(datacoNumber: string): Promise<Subtask[]> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.find({ datacoNumber }).toArray();
      return result;
    } catch (error) {
      handleMongoError(error, 'getSubtasksByDatacoNumber');
      return [];
    }
  }

  async createSubtask(subtask: Omit<Subtask, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { subtasks } = await this.getCollections();
      const now = new Date();
      const result = await subtasks.insertOne({
        ...subtask,
        taskId: toObjectId(subtask.taskId as any),
        createdAt: now,
        updatedAt: now
      });
      return fromObjectId(result.insertedId);
    } catch (error) {
      handleMongoError(error, 'createSubtask');
      throw error;
    }
  }

  async getSubtaskById(id: string): Promise<Subtask | null> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.findOne({ _id: toObjectId(id) });
      return result;
    } catch (error) {
      handleMongoError(error, 'getSubtaskById');
      return null;
    }
  }

  async updateSubtask(id: string, updates: Partial<Subtask>): Promise<boolean> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.updateOne(
        { _id: toObjectId(id) },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      handleMongoError(error, 'updateSubtask');
      return false;
    }
  }

  async deleteSubtask(id: string): Promise<boolean> {
    try {
      const { subtasks } = await this.getCollections();
      const result = await subtasks.deleteOne({ _id: toObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      handleMongoError(error, 'deleteSubtask');
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
      handleMongoError(error, 'getUserByEmail');
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<AppUser | null> {
    try {
      const { appUsers } = await this.getCollections();
      const result = await appUsers.findOne({ username });
      return result;
    } catch (error) {
      handleMongoError(error, 'getUserByUsername');
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
      return fromObjectId(result.insertedId);
    } catch (error) {
      handleMongoError(error, 'createUser');
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
      handleMongoError(error, 'getAnalytics');
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
      return result.acknowledged;
    } catch (error) {
      handleMongoError(error, 'updateAnalytics');
      return false;
    }
  }

  async incrementPageView(page: string): Promise<boolean> {
    try {
      const { analytics } = await this.getCollections();
      const result = await analytics.updateOne(
        {},
        { 
          $inc: {
            [`pageViews.${page}`]: 1
          },
          $set: {
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );
      return result.acknowledged;
    } catch (error) {
      handleMongoError(error, 'incrementPageView');
      return false;
    }
  }

  // Log a visit to the site and track daily statistics
  async logVisit(dateStr: string): Promise<{ isUniqueVisitor: boolean; totalVisits: number }> {
    try {
      const { analytics } = await this.getCollections();
      
      // First, increment total visits
      const updateResult = await analytics.updateOne(
        {},
        { 
          $inc: {
            totalVisits: 1,
            [`dailyStats.${dateStr}`]: 1 // Store just the count as a number, not an object
          },
          $set: {
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );
      
      // Get the updated analytics data
      const analyticsData = await analytics.findOne({});
      
      if (!analyticsData) {
        return { isUniqueVisitor: true, totalVisits: 1 };
      }
      
      // For simplicity, we'll just increment unique visitors for each day
      // In a real app, you would track unique IPs or use a more sophisticated method
      const isUniqueVisitor = true;
      
      if (isUniqueVisitor) {
        await analytics.updateOne(
          {},
          { 
            $inc: {
              uniqueVisitors: 1
            }
          }
        );
      }
      
      return { 
        isUniqueVisitor, 
        totalVisits: analyticsData.totalVisits 
      };
    } catch (error) {
      handleMongoError(error, 'logVisit');
      return { isUniqueVisitor: false, totalVisits: 0 };
    }
  }

  // Log activity for tracking user actions
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
      
      const activity = {
        ...activityData,
        timestamp: new Date(),
        userType: activityData.userType || 'system',
        isVisible: true,
        metadata: {}
      };
      
      const result = await activities.insertOne(activity);
      
      return result.acknowledged;
    } catch (error) {
      handleMongoError(error, 'logActivity');
      return false;
    }
  }

  // Daily Updates operations
  async getActiveDailyUpdates(includeHidden = false): Promise<DailyUpdate[]> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const now = new Date();
      
      const filter: any = {
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: now } }
        ]
      };
      
      if (!includeHidden) {
        filter.isHidden = false;
      }

      const result = await dailyUpdates.find(filter).sort({
        isPinned: -1,    // Pinned first
        priority: 1,     // Priority 1 first, 10 last (ascending)
        createdAt: -1    // Newest first within same priority
      }).toArray();
      return result;
    } catch (error) {
      handleMongoError(error, 'getActiveDailyUpdates');
      return [];
    }
  }

  async getAllDailyUpdates(): Promise<DailyUpdate[]> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const result = await dailyUpdates.find({}).sort({ 
        isPinned: -1,    // Pinned first
        priority: 1,     // Priority 1 first, 10 last (ascending)
        createdAt: -1    // Newest first within same priority
      }).toArray();
      return result;
    } catch (error) {
      handleMongoError(error, 'getAllDailyUpdates');
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
      return fromObjectId(result.insertedId);
    } catch (error) {
      handleMongoError(error, 'createDailyUpdate');
      throw error;
    }
  }

  async getDailyUpdateById(id: string): Promise<DailyUpdate | null> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const result = await dailyUpdates.findOne({ _id: toObjectId(id) });
      return result;
    } catch (error) {
      handleMongoError(error, 'getDailyUpdateById');
      return null;
    }
  }

  async updateDailyUpdate(id: string, updates: Partial<DailyUpdate>): Promise<boolean> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const result = await dailyUpdates.updateOne(
        { _id: toObjectId(id) },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      handleMongoError(error, 'updateDailyUpdate');
      return false;
    }
  }

  async deleteDailyUpdate(id: string): Promise<boolean> {
    try {
      const { dailyUpdates } = await this.getCollections();
      const result = await dailyUpdates.deleteOne({ _id: toObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      handleMongoError(error, 'deleteDailyUpdate');
      return false;
    }
  }

  // Daily Update Settings operations
  async getDailyUpdateSetting(key: string): Promise<DailyUpdateSetting | null> {
    try {
      const { dailyUpdatesSettings } = await this.getCollections();
      const result = await dailyUpdatesSettings.findOne({ key });
      return result;
    } catch (error) {
      handleMongoError(error, 'getDailyUpdateSetting');
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
            key,
            value,
            updatedAt: now
          },
          $setOnInsert: {
            createdAt: now
          }
        },
        { upsert: true }
      );
      return result.acknowledged;
    } catch (error) {
      handleMongoError(error, 'upsertDailyUpdateSetting');
      return false;
    }
  }

  // Search operations
  async searchTasks(query: string): Promise<Task[]> {
    try {
      const { tasks } = await this.getCollections();
      const result = await tasks.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { subtitle: { $regex: query, $options: 'i' } },
          { datacoNumber: { $regex: query, $options: 'i' } },
          { 'description.main': { $regex: query, $options: 'i' } }
        ]
      }).toArray();
      return result;
    } catch (error) {
      handleMongoError(error, 'searchTasks');
      return [];
    }
  }

  /**
   * Optimized method to get all homepage data in a single aggregation query
   * with caching to improve performance
   */
  async getHomepageData(): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    // Try to get from cache first
    const cacheKey = 'homepage_data_v2'; // Versioned cache key
    const cachedData = cache.get<{ projects: Project[]; tasks: Task[] }>(cacheKey, { 
      namespace: 'api_data',
      // Cache for 2 minutes - this is a good balance for homepage data
      // which doesn't change very frequently but should be reasonably fresh
      ttl: 2 * 60 * 1000 
    });
    
    if (cachedData) {
      logger.debug('Homepage data served from cache', 'DB_HOMEPAGE_DATA', {
        projectCount: cachedData.projects.length,
        taskCount: cachedData.tasks.length
      });
      return cachedData;
    }
    
    try {
      const startTime = performance.now();
      const tracker = new PerformanceTracker('HOMEPAGE_DATA_QUERY', 'getHomepageData');
      logger.debug('Starting homepage data aggregation', 'DB_HOMEPAGE_DATA');
      
      const { projects, tasks } = await this.getCollections();
      
      // Start both queries in parallel
      logger.debug('Starting parallel queries for homepage data', 'DB_HOMEPAGE_DATA');
      
      // Create a lean aggregation for projects 
      // Only retrieve essential fields needed for the homepage
      const projectsQuery = projects.find(
        {}, // No filter, get all projects
        { 
          projection: { 
            name: 1, 
            description: 1,
            createdAt: 1
          } 
        }
      ).sort({ name: 1 }).toArray();
      
      // Create a lean aggregation for tasks
      // Only get visible tasks with minimal fields needed for the homepage
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
            // Don't include description and images fields to reduce size
          } 
        }
      ).sort({ priority: -1 }).toArray();
      
      // Run both queries in parallel
      const [projectsData, tasksData] = await Promise.all([projectsQuery, tasksQuery]);
      
      const result = {
        projects: projectsData as Project[],
        tasks: tasksData as Task[]
      };
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Store in cache
      cache.set(cacheKey, result, { 
        namespace: 'api_data',
        ttl: 2 * 60 * 1000  // 2 minutes
      });
      
      logger.debug('Homepage data aggregation completed', 'DB_HOMEPAGE_DATA', {
        projectCount: result.projects.length,
        taskCount: result.tasks.length,
        aggregationTime: `${processingTime.toFixed(2)}ms`,
        totalTime: `${processingTime.toFixed(2)}ms`,
        projectsDataSize: JSON.stringify(result.projects).length,
        tasksDataSize: JSON.stringify(result.tasks).length
      });
      
      tracker.finish({
        resultSize: `${(JSON.stringify(result).length / 1024).toFixed(2)} KB`,
        success: true
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to get homepage data', 'DB_HOMEPAGE_DATA', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Optimized method to get project page data with caching
   */
  async getProjectPageData(projectName: string): Promise<{
    project: Project;
    tasks: Task[];
  }> {
    // Normalize project name to handle URL encoding issues
    const normalizedProjectName = decodeURIComponent(projectName);
    
    // Try to get from cache first
    const cacheKey = `project_data_${normalizedProjectName}_v2`;
    const cachedData = cache.get<{ project: Project; tasks: Task[] }>(cacheKey, { 
      namespace: 'api_data',
      ttl: 2 * 60 * 1000 // 2 minutes cache
    });
    
    if (cachedData) {
      logger.debug('Project data served from cache', 'DB_PROJECT_DATA', {
        projectName: normalizedProjectName,
        taskCount: cachedData.tasks.length
      });
      return cachedData;
    }
    
    try {
      const startTime = performance.now();
      const tracker = new PerformanceTracker('PROJECT_DATA_QUERY', 'getProjectPageData');
      logger.debug(`Starting project data query for: ${normalizedProjectName}`, 'DB_PROJECT_DATA');
      
      const { projects, tasks } = await this.getCollections();
      
      // First get the project
      const project = await projects.findOne({ name: normalizedProjectName });
      
      if (!project) {
        throw new Error(`Project not found: ${normalizedProjectName}`);
      }
      
      // Then get tasks for this project with optimized projection
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
            isVisible: 1
            // Don't include description and images to reduce data size
          }
        }
      ).sort({ priority: -1 }).toArray();
      
      const result = {
        project: project as Project,
        tasks: projectTasks as Task[]
      };
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Store in cache
      cache.set(cacheKey, result, { 
        namespace: 'api_data',
        ttl: 2 * 60 * 1000 // 2 minutes cache
      });
      
      logger.debug(`Project data query completed for: ${normalizedProjectName}`, 'DB_PROJECT_DATA', {
        projectName: normalizedProjectName,
        taskCount: result.tasks.length,
        queryTime: `${processingTime.toFixed(2)}ms`,
        dataSize: JSON.stringify(result).length
      });
      
      tracker.finish({
        resultSize: `${(JSON.stringify(result).length / 1024).toFixed(2)} KB`,
        success: true
      });
      
      return result;
    } catch (error) {
      logger.error(`Failed to get project data for: ${normalizedProjectName}`, 'DB_PROJECT_DATA', { 
        error: (error as Error).message,
        projectName: normalizedProjectName
      });
      throw error;
    }
  }

  // Optimized method to get project stats (task counts, etc.)
  async getProjectStats(): Promise<Record<string, { taskCount: number; highPriorityCount: number }>> {
    try {
      const { tasks } = await this.getCollections();
      
      const pipeline = [
        {
          $match: { isVisible: true }
        },
        {
          $group: {
            _id: '$projectId',
            taskCount: { $sum: 1 },
            highPriorityCount: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$priority', 1] }, { $lte: ['$priority', 3] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ];
      
      const stats = await tasks.aggregate(pipeline).toArray();
      const statsMap: Record<string, { taskCount: number; highPriorityCount: number }> = {};
      
      for (const stat of stats) {
        statsMap[stat._id.toString()] = {
          taskCount: stat.taskCount,
          highPriorityCount: stat.highPriorityCount
        };
      }
      
      return statsMap;
    } catch (error) {
      handleMongoError(error, 'getProjectStats');
      return {};
    }
  }

  /**
   * Invalidate cache when data changes
   */
  invalidateHomepageCache(): void {
    cache.delete('homepage_data_v2', { namespace: 'api_data' });
    logger.debug('Homepage data cache invalidated', 'CACHE_INVALIDATION');
  }
  
  /**
   * Invalidate project cache when project data changes
   */
  invalidateProjectCache(projectName: string): void {
    const normalizedProjectName = decodeURIComponent(projectName);
    cache.delete(`project_data_${normalizedProjectName}_v2`, { namespace: 'api_data' });
    logger.debug(`Project data cache invalidated for: ${normalizedProjectName}`, 'CACHE_INVALIDATION');
  }
  
  /**
   * Invalidate task cache when task data changes
   */
  invalidateTaskCache(taskId: string): void {
    cache.delete(`task_${taskId}_v1`, { namespace: 'task_data' });
    logger.debug(`Task data cache invalidated for: ${taskId}`, 'CACHE_INVALIDATION');
  }
  
  /**
   * Clear all API data caches
   */
  clearAllCaches(): void {
    cache.clear('api_data');
    cache.clear('task_data');
    logger.info('All API data caches cleared', 'CACHE_CLEAR');
  }
}

// Export singleton instance
export const db = new DatabaseService(); 