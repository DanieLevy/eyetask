import { mongodb, toObjectId, fromObjectId, handleMongoError } from './mongodb';
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
  image?: string;
  datacoNumber: string;
  type: 'events' | 'hours';
  amountNeeded?: number;
  labels: string[];
  targetCar: string[];
  weather?: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene?: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
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
  // Project operations
  async getAllProjects(): Promise<Project[]> {
    try {
      const { projects } = await mongodb.getCollections();
      const result = await projects.find({}).sort({ createdAt: -1 }).toArray();
      return result as Project[];
    } catch (error) {
      handleMongoError(error, 'getAllProjects');
      return [];
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { projects } = await mongodb.getCollections();
      const result = await projects.findOne({ _id: toObjectId(id) });
      return result as Project;
    } catch (error) {
      handleMongoError(error, 'getProjectById');
      return null;
    }
  }

  async createProject(project: Omit<Project, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { projects } = await mongodb.getCollections();
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
      const { projects } = await mongodb.getCollections();
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
      const { projects, tasks, subtasks } = await mongodb.getCollections();
      
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
      const { tasks } = await mongodb.getCollections();
      const filter = includeHidden ? {} : { isVisible: true };
      const result = await tasks.find(filter).sort({ priority: -1, createdAt: -1 }).toArray();
      return result as Task[];
    } catch (error) {
      handleMongoError(error, 'getAllTasks');
      return [];
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { tasks } = await mongodb.getCollections();
      const result = await tasks.findOne({ _id: toObjectId(id) });
      return result as Task;
    } catch (error) {
      handleMongoError(error, 'getTaskById');
      return null;
    }
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    try {
      const { tasks } = await mongodb.getCollections();
      const result = await tasks.find({ projectId: toObjectId(projectId) }).sort({ priority: -1 }).toArray();
      return result as Task[];
    } catch (error) {
      handleMongoError(error, 'getTasksByProject');
      return [];
    }
  }

  async createTask(task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { tasks } = await mongodb.getCollections();
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
      const { tasks } = await mongodb.getCollections();
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
      const { tasks, subtasks } = await mongodb.getCollections();
      
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
      const { subtasks } = await mongodb.getCollections();
      const result = await subtasks.find({ taskId: toObjectId(taskId) }).sort({ createdAt: -1 }).toArray();
      return result as Subtask[];
    } catch (error) {
      handleMongoError(error, 'getSubtasksByTask');
      return [];
    }
  }

  async createSubtask(subtask: Omit<Subtask, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { subtasks } = await mongodb.getCollections();
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
      const { subtasks } = await mongodb.getCollections();
      const result = await subtasks.findOne({ _id: toObjectId(id) });
      return result as Subtask;
    } catch (error) {
      handleMongoError(error, 'getSubtaskById');
      return null;
    }
  }

  async updateSubtask(id: string, updates: Partial<Subtask>): Promise<boolean> {
    try {
      const { subtasks } = await mongodb.getCollections();
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
      const { subtasks } = await mongodb.getCollections();
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
      const { appUsers } = await mongodb.getCollections();
      const result = await appUsers.findOne({ email });
      return result as AppUser;
    } catch (error) {
      handleMongoError(error, 'getUserByEmail');
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<AppUser | null> {
    try {
      const { appUsers } = await mongodb.getCollections();
      const result = await appUsers.findOne({ username });
      return result as AppUser;
    } catch (error) {
      handleMongoError(error, 'getUserByUsername');
      return null;
    }
  }

  async createUser(user: Omit<AppUser, '_id' | 'createdAt'>): Promise<string> {
    try {
      const { appUsers } = await mongodb.getCollections();
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
      const { analytics } = await mongodb.getCollections();
      const result = await analytics.findOne({});
      return result as Analytics;
    } catch (error) {
      handleMongoError(error, 'getAnalytics');
      return null;
    }
  }

  async updateAnalytics(updates: Partial<Analytics>): Promise<boolean> {
    try {
      const { analytics } = await mongodb.getCollections();
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
      const { analytics } = await mongodb.getCollections();
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
  async getActiveDailyUpdates(): Promise<DailyUpdate[]> {
    try {
      const { dailyUpdates } = await mongodb.getCollections();
      const now = new Date();
      const result = await dailyUpdates.find({
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: now } }
        ]
      }).sort({ isPinned: -1, priority: -1, createdAt: -1 }).toArray();
      return result as DailyUpdate[];
    } catch (error) {
      handleMongoError(error, 'getActiveDailyUpdates');
      return [];
    }
  }

  async createDailyUpdate(update: Omit<DailyUpdate, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { dailyUpdates } = await mongodb.getCollections();
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
      const { dailyUpdates } = await mongodb.getCollections();
      const result = await dailyUpdates.findOne({ _id: toObjectId(id) });
      return result as DailyUpdate;
    } catch (error) {
      handleMongoError(error, 'getDailyUpdateById');
      return null;
    }
  }

  async updateDailyUpdate(id: string, updates: Partial<DailyUpdate>): Promise<boolean> {
    try {
      const { dailyUpdates } = await mongodb.getCollections();
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
      const { dailyUpdates } = await mongodb.getCollections();
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
      const { dailyUpdatesSettings } = await mongodb.getCollections();
      const result = await dailyUpdatesSettings.findOne({ key });
      return result as DailyUpdateSetting;
    } catch (error) {
      handleMongoError(error, 'getDailyUpdateSetting');
      return null;
    }
  }

  async upsertDailyUpdateSetting(key: string, value: string): Promise<boolean> {
    try {
      const { dailyUpdatesSettings } = await mongodb.getCollections();
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
      const { tasks } = await mongodb.getCollections();
      const result = await tasks.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { subtitle: { $regex: query, $options: 'i' } },
          { datacoNumber: { $regex: query, $options: 'i' } },
          { 'description.main': { $regex: query, $options: 'i' } }
        ]
      }).toArray();
      return result as Task[];
    } catch (error) {
      handleMongoError(error, 'searchTasks');
      return [];
    }
  }
}

// Export singleton instance
export const db = new DatabaseService(); 