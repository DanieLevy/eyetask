import { connectToDatabase } from './mongodb';
import { toObjectId, fromObjectId, handleMongoError } from './mongodb';
import { logger } from './logger';
import { ObjectId } from 'mongodb';

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
      const result = await tasks.findOne({ _id: toObjectId(id) });
      return result;
    } catch (error) {
      handleMongoError(error, 'getTaskById');
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

  // Optimized method to get all homepage data in a single aggregation query
  async getHomepageData(): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    try {
      const { projects, tasks } = await this.getCollections();
      
      // Use aggregation to get projects with their task counts and stats
      const pipeline = [
        {
          $lookup: {
            from: 'tasks',
            let: { projectId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$projectId', '$$projectId'] },
                  isVisible: true
                }
              }
            ],
            as: 'tasks'
          }
        },
        {
          $addFields: {
            taskCount: { $size: '$tasks' },
            highPriorityCount: {
              $size: {
                $filter: {
                  input: '$tasks',
                  cond: {
                    $and: [
                      { $gte: ['$$this.priority', 1] },
                      { $lte: ['$$this.priority', 3] }
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $project: {
            tasks: 0 // Remove tasks array to save memory, we only need counts
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ];

      // Get projects with aggregated task stats and all visible tasks separately
      const [projectsWithStats, visibleTasks] = await Promise.all([
        projects.aggregate(pipeline).toArray(),
        tasks.find({ isVisible: true }).sort({ priority: 1, createdAt: -1 }).toArray()
      ]);
      
      return {
        projects: projectsWithStats as Project[],
        tasks: visibleTasks as Task[]
      };
    } catch (error) {
      handleMongoError(error, 'getHomepageData');
      return { projects: [], tasks: [] };
    }
  }

  // Optimized method to get all project page data in a single aggregation query
  async getProjectPageData(projectName: string): Promise<{
    project: Project | null;
    tasks: Task[];
    subtasks: Record<string, any[]>;
  }> {
    try {
      const { projects, tasks, subtasks } = await this.getCollections();
      
      // First find the project by name
      const project = await projects.findOne({ name: projectName });
      
      if (!project) {
        return { project: null, tasks: [], subtasks: {} };
      }
      
      // Convert project._id to ObjectId for proper matching
      const projectObjectId = toObjectId(project._id!.toString());
      
      // Use aggregation to get tasks with their subtasks in a single query
      const pipeline = [
        {
          $match: {
            projectId: projectObjectId,
            isVisible: true
          }
        },
        {
          $lookup: {
            from: 'subtasks',
            let: { taskId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$taskId', '$$taskId'] }
                }
              },
              {
                $sort: { createdAt: -1 }
              }
            ],
            as: 'taskSubtasks'
          }
        },
        {
          $sort: { priority: 1, createdAt: -1 }
        }
      ];
      
      const tasksWithSubtasks = await tasks.aggregate(pipeline).toArray();
      
      // Separate tasks and subtasks
      const projectTasks: Task[] = [];
      const subtasksMap: Record<string, any[]> = {};
      
      for (const taskData of tasksWithSubtasks) {
        const { taskSubtasks, ...task } = taskData;
        
        // Ensure proper ID conversion for client-side usage
        const taskWithId = {
          ...task,
          _id: task._id.toString(),
          projectId: task.projectId.toString()
        };
        
        projectTasks.push(taskWithId as any);
        
        // Process subtasks with proper ID conversion
        const processedSubtasks = (taskSubtasks || []).map((subtask: any) => ({
          ...subtask,
          _id: subtask._id.toString(),
          taskId: subtask.taskId.toString()
        }));
        
        subtasksMap[task._id.toString()] = processedSubtasks;
      }
      
      // Also ensure project has proper ID
      const projectWithId = {
        ...project,
        _id: project._id!.toString()
      };
      
      return {
        project: projectWithId as any,
        tasks: projectTasks,
        subtasks: subtasksMap
      };
    } catch (error) {
      handleMongoError(error, 'getProjectPageData');
      return { project: null, tasks: [], subtasks: {} };
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
}

// Export singleton instance
export const db = new DatabaseService(); 