import { supabase, supabaseAdmin, getSupabaseClient } from './supabase';
import { logger } from './logger';
import { cache } from './cache';

// Types for our collections (matching MongoDB structure)
export interface Project {
  id?: string;
  _id?: any;
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
  createdAt?: string;
  updatedAt?: string;
  mongodb_id?: string;
}

export interface Task {
  id?: string;
  _id?: any;
  title: string;
  subtitle?: string;
  images?: string[];
  datacoNumber: string;
  description?: {
    main?: string;
    howToExecute?: string;
  };
  projectId: string;
  type: string[];
  locations: string[];
  amountNeeded?: number;
  targetCar: string[];
  lidar?: boolean;
  dayTime: string[];
  priority: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
  mongodb_id?: string;
}

export interface Subtask {
  id?: string;
  _id?: any;
  taskId: string;
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
  createdAt?: string;
  updatedAt?: string;
  mongodb_id?: string;
}

export interface AppUser {
  id?: string;
  _id?: any;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'data_manager' | 'driver_manager';
  createdAt?: string;
  lastLogin?: string;
  isActive?: boolean;
  createdBy?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  mongodb_id?: string;
}

export interface Analytics {
  id?: string;
  _id?: any;
  visits: {
    total: number;
    today: number;
    last7Days: number;
    last30Days: number;
  };
  uniqueVisitors: {
    total: number;
    today: string[];
    last7Days: string[];
    last30Days: string[];
  };
  dailyStats: {
    [date: string]: {
      visits: number;
      uniqueVisitors: string[];
      actions: number;
      loginCount: number;
    };
  };
  counters: {
    projects: number;
    tasks: number;
    subtasks: number;
    users: number;
    activeUsers: number;
  };
  lastUpdated?: string;
  mongodb_id?: string;
}

export interface DailyUpdate {
  id?: string;
  _id?: any;
  title: string;
  content: string;
  type: string;
  priority: number;
  durationType: string;
  durationValue?: number;
  expiresAt?: string;
  isActive: boolean;
  isPinned: boolean;
  isHidden: boolean;
  targetAudience: string[];
  projectId?: string;
  isGeneral: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  mongodb_id?: string;
}

export interface DailyUpdateSetting {
  id?: string;
  _id?: any;
  key: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
  mongodb_id?: string;
}

export interface PushSubscription {
  id?: string;
  _id?: any;
  userId: string;
  username: string;
  email: string;
  role: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent: string;
  deviceType: string;
  createdAt?: string;
  lastActive?: string;
  isActive: boolean;
  mongodb_id?: string;
}

export interface PushNotification {
  id?: string;
  _id?: any;
  title: string;
  body: string;
  icon: string;
  badge: string;
  image: string;
  url: string;
  tag: string;
  requireInteraction: boolean;
  targetRoles: string[];
  targetUsers: string[];
  sentBy: string;
  sentAt: string;
  deliveryStats: {
    sent: number;
    delivered: number;
    failed: number;
    clicked: number;
  };
  status: string;
  mongodb_id?: string;
}

// Supabase Database Service
export class SupabaseDatabaseService {
  private client = getSupabaseClient(true); // Use admin client for server operations

  // Project operations
  async getAllProjects(): Promise<Project[]> {
    try {
      const { data, error } = await this.client
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error getting all projects', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapProjectFromDb);
    } catch (error) {
      logger.error('Error getting all projects', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { data, error } = await this.client
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error getting project by ID', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapProjectFromDb(data);
    } catch (error) {
      logger.error('Error getting project by ID', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('projects')
        .insert({
          name: project.name,
          description: project.description || '',
          is_active: project.isActive !== undefined ? project.isActive : true,
          color: project.color || '#3B82F6',
          priority: project.priority || 1,
          client_name: project.clientName || null,
          client_email: project.clientEmail || null,
          client_phone: project.clientPhone || null,
          notes: project.notes || null,
          image: project.image || null
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating project', 'SUPABASE_DATABASE', { error: error.message });
        throw error;
      }

      return data.id;
    } catch (error) {
      logger.error('Error creating project', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
      if (updates.clientEmail !== undefined) updateData.client_email = updates.clientEmail;
      if (updates.clientPhone !== undefined) updateData.client_phone = updates.clientPhone;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.image !== undefined) updateData.image = updates.image;

      const { error } = await this.client
        .from('projects')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating project', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating project', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      // Tasks will be automatically deleted due to CASCADE foreign key
      const { error } = await this.client
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting project', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting project', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Task operations
  async getAllTasks(includeHidden = false): Promise<Task[]> {
    try {
      let query = this.client
        .from('tasks')
        .select('*')
        .order('priority', { ascending: false });

      if (!includeHidden) {
        query = query.eq('is_visible', true);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting all tasks', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapTaskFromDb);
    } catch (error) {
      logger.error('Error getting all tasks', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error getting task by ID', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapTaskFromDb(data);
    } catch (error) {
      logger.error('Error getting task by ID', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    try {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: false });

      if (error) {
        logger.error('Error getting tasks by project', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapTaskFromDb);
    } catch (error) {
      logger.error('Error getting tasks by project', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('tasks')
        .insert({
          title: task.title,
          subtitle: task.subtitle || null,
          images: task.images || [],
          dataco_number: task.datacoNumber,
          description: task.description || {},
          project_id: task.projectId,
          type: task.type,
          locations: task.locations,
          amount_needed: task.amountNeeded || null,
          target_car: task.targetCar,
          lidar: task.lidar || false,
          day_time: task.dayTime,
          priority: task.priority || 0,
          is_visible: task.isVisible !== undefined ? task.isVisible : true
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating task', 'SUPABASE_DATABASE', { error: error.message });
        throw error;
      }

      return data.id;
    } catch (error) {
      logger.error('Error creating task', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.subtitle !== undefined) updateData.subtitle = updates.subtitle;
      if (updates.images !== undefined) updateData.images = updates.images;
      if (updates.datacoNumber !== undefined) updateData.dataco_number = updates.datacoNumber;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.locations !== undefined) updateData.locations = updates.locations;
      if (updates.amountNeeded !== undefined) updateData.amount_needed = updates.amountNeeded;
      if (updates.targetCar !== undefined) updateData.target_car = updates.targetCar;
      if (updates.lidar !== undefined) updateData.lidar = updates.lidar;
      if (updates.dayTime !== undefined) updateData.day_time = updates.dayTime;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.isVisible !== undefined) updateData.is_visible = updates.isVisible;

      const { error } = await this.client
        .from('tasks')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating task', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating task', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      // Subtasks will be automatically deleted due to CASCADE foreign key
      const { error } = await this.client
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting task', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting task', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // User operations
  async getUserByEmail(email: string): Promise<AppUser | null> {
    try {
      const { data, error } = await this.client
        .from('app_users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        logger.error('Error getting user by email', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapUserFromDb(data);
    } catch (error) {
      logger.error('Error getting user by email', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<AppUser | null> {
    try {
      const { data, error } = await this.client
        .from('app_users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        logger.error('Error getting user by username', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapUserFromDb(data);
    } catch (error) {
      logger.error('Error getting user by username', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async createUser(user: Omit<AppUser, 'id' | 'createdAt'>): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('app_users')
        .insert({
          username: user.username,
          email: user.email,
          password_hash: user.passwordHash,
          role: user.role,
          is_active: user.isActive !== undefined ? user.isActive : true,
          last_login: user.lastLogin || null,
          created_by: user.createdBy || null,
          last_modified_by: user.lastModifiedBy || null,
          last_modified_at: user.lastModifiedAt || null
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating user', 'SUPABASE_DATABASE', { error: error.message });
        throw error;
      }

      return data.id;
    } catch (error) {
      logger.error('Error creating user', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  // Analytics operations
  async getAnalytics(): Promise<Analytics | null> {
    try {
      const { data, error } = await this.client
        .from('analytics')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No analytics exists, create initial record
          return await this.initializeAnalytics();
        }
        logger.error('Error getting analytics', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapAnalyticsFromDb(data);
    } catch (error) {
      logger.error('Error getting analytics', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  private async initializeAnalytics(): Promise<Analytics> {
    const today = new Date().toISOString().split('T')[0];
    const initialData = {
      visits: { total: 0, today: 0, last7Days: 0, last30Days: 0 },
      unique_visitors: { total: 0, today: [], last7Days: [], last30Days: [] },
      daily_stats: {
        [today]: {
          visits: 0,
          uniqueVisitors: [],
          actions: 0,
          loginCount: 0
        }
      },
      counters: { projects: 0, tasks: 0, subtasks: 0, users: 0, activeUsers: 0 },
      last_updated: new Date().toISOString()
    };

    const { data, error } = await this.client
      .from('analytics')
      .insert(initialData)
      .select()
      .single();

    if (error) {
      logger.error('Error initializing analytics', 'SUPABASE_DATABASE', { error: error.message });
      throw error;
    }

    return this.mapAnalyticsFromDb(data);
  }

  // Mapping functions to convert between DB format and app format
  private mapProjectFromDb(dbProject: any): Project {
    return {
      id: dbProject.id,
      _id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description || '',
      isActive: dbProject.is_active,
      color: dbProject.color,
      priority: dbProject.priority,
      clientName: dbProject.client_name,
      clientEmail: dbProject.client_email,
      clientPhone: dbProject.client_phone,
      notes: dbProject.notes,
      image: dbProject.image,
      createdAt: dbProject.created_at,
      updatedAt: dbProject.updated_at,
      mongodb_id: dbProject.mongodb_id
    };
  }

  private mapTaskFromDb(dbTask: any): Task {
    return {
      id: dbTask.id,
      _id: dbTask.id,
      title: dbTask.title,
      subtitle: dbTask.subtitle,
      images: dbTask.images || [],
      datacoNumber: dbTask.dataco_number,
      description: dbTask.description,
      projectId: dbTask.project_id,
      type: dbTask.type || [],
      locations: dbTask.locations || [],
      amountNeeded: dbTask.amount_needed,
      targetCar: dbTask.target_car || [],
      lidar: dbTask.lidar,
      dayTime: dbTask.day_time || [],
      priority: dbTask.priority,
      isVisible: dbTask.is_visible,
      createdAt: dbTask.created_at,
      updatedAt: dbTask.updated_at,
      mongodb_id: dbTask.mongodb_id
    };
  }

  private mapUserFromDb(dbUser: any): AppUser {
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      passwordHash: dbUser.password_hash,
      role: dbUser.role,
      createdAt: dbUser.created_at,
      lastLogin: dbUser.last_login,
      isActive: dbUser.is_active,
      createdBy: dbUser.created_by,
      lastModifiedBy: dbUser.last_modified_by,
      lastModifiedAt: dbUser.last_modified_at,
      mongodb_id: dbUser.mongodb_id
    };
  }

  private mapAnalyticsFromDb(dbAnalytics: any): Analytics {
    return {
      id: dbAnalytics.id,
      visits: dbAnalytics.visits,
      uniqueVisitors: dbAnalytics.unique_visitors,
      dailyStats: dbAnalytics.daily_stats,
      counters: dbAnalytics.counters,
      lastUpdated: dbAnalytics.last_updated,
      mongodb_id: dbAnalytics.mongodb_id
    };
  }

  // Optimized methods for API endpoints
  async getHomepageData(): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    try {
      // Fetch projects - get all fields for proper display
      const { data: projects, error: projectsError } = await this.client
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (projectsError) throw projectsError;

      // Fetch visible tasks
      const { data: tasks, error: tasksError } = await this.client
        .from('tasks')
        .select('*')
        .eq('is_visible', true)
        .order('priority', { ascending: false });

      if (tasksError) throw tasksError;

      return {
        projects: projects?.map(p => this.mapProjectFromDb(p)) || [],
        tasks: tasks?.map(t => this.mapTaskFromDb(t)) || []
      };
    } catch (error) {
      logger.error('Failed to get homepage data', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async getProjectPageData(projectName: string): Promise<{
    project: Project;
    tasks: Task[];
    subtasks: Record<string, Subtask[]>;
    success: boolean;
  }> {
    try {
      const normalizedProjectName = decodeURIComponent(projectName);
      
      // Get project
      const { data: project, error: projectError } = await this.client
        .from('projects')
        .select('*')
        .eq('name', normalizedProjectName)
        .single();

      if (projectError || !project) {
        throw new Error(`Project not found: ${normalizedProjectName}`);
      }

      // Get tasks for this project
      const { data: tasks, error: tasksError } = await this.client
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .eq('is_visible', true)
        .order('priority', { ascending: false });

      if (tasksError) throw tasksError;

      // Get task IDs
      const taskIds = tasks?.map(t => t.id) || [];

      // Get subtasks for all tasks
      const { data: subtasks, error: subtasksError } = await this.client
        .from('subtasks')
        .select('*')
        .in('task_id', taskIds)
        .or('is_visible.is.null,is_visible.eq.true');

      if (subtasksError) throw subtasksError;

      // Organize subtasks by task ID
      const subtasksByTaskId: Record<string, Subtask[]> = {};
      for (const subtask of subtasks || []) {
        const taskId = subtask.task_id;
        if (!subtasksByTaskId[taskId]) {
          subtasksByTaskId[taskId] = [];
        }
        subtasksByTaskId[taskId].push(this.mapSubtaskFromDb(subtask));
      }

      return {
        project: this.mapProjectFromDb(project),
        tasks: tasks?.map(t => this.mapTaskFromDb(t)) || [],
        subtasks: subtasksByTaskId,
        success: true
      };
    } catch (error) {
      logger.error('Failed to get project page data', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  // Cache invalidation methods (compatible with MongoDB version)
  invalidateHomepageCache(): void {
    cache.clear('homepage');
  }

  invalidateProjectCache(projectName: string): void {
    cache.delete(`project:${projectName}`, { namespace: 'projects' });
  }

  invalidateTaskCache(taskId: string): void {
    cache.delete(`task:${taskId}`, { namespace: 'tasks' });
  }

  clearAllCaches(): void {
    cache.clear();
  }

  // Subtask operations
  async getSubtasksByTask(taskId: string, includeHidden = false): Promise<Subtask[]> {
    try {
      let query = this.client
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (!includeHidden) {
        query = query.eq('is_visible', true);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting subtasks by task', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapSubtaskFromDb);
    } catch (error) {
      logger.error('Error getting subtasks by task', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async createSubtask(subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('subtasks')
        .insert({
          task_id: subtask.taskId,
          title: subtask.title,
          subtitle: subtask.subtitle || null,
          images: subtask.images || [],
          dataco_number: subtask.datacoNumber,
          type: subtask.type,
          amount_needed: subtask.amountNeeded || null,
          labels: subtask.labels || [],
          target_car: subtask.targetCar || [],
          weather: subtask.weather || null,
          scene: subtask.scene || null,
          day_time: subtask.dayTime || [],
          is_visible: subtask.isVisible !== undefined ? subtask.isVisible : true
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating subtask', 'SUPABASE_DATABASE', { error: error.message });
        throw error;
      }

      return data.id;
    } catch (error) {
      logger.error('Error creating subtask', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async updateSubtask(id: string, updates: Partial<Subtask>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.subtitle !== undefined) updateData.subtitle = updates.subtitle;
      if (updates.images !== undefined) updateData.images = updates.images;
      if (updates.datacoNumber !== undefined) updateData.dataco_number = updates.datacoNumber;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.amountNeeded !== undefined) updateData.amount_needed = updates.amountNeeded;
      if (updates.labels !== undefined) updateData.labels = updates.labels;
      if (updates.targetCar !== undefined) updateData.target_car = updates.targetCar;
      if (updates.weather !== undefined) updateData.weather = updates.weather;
      if (updates.scene !== undefined) updateData.scene = updates.scene;
      if (updates.dayTime !== undefined) updateData.day_time = updates.dayTime;
      if (updates.isVisible !== undefined) updateData.is_visible = updates.isVisible;

      const { error } = await this.client
        .from('subtasks')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating subtask', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating subtask', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteSubtask(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('subtasks')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting subtask', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting subtask', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async getSubtaskById(id: string): Promise<Subtask | null> {
    try {
      const { data, error } = await this.client
        .from('subtasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error getting subtask by ID', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapSubtaskFromDb(data);
    } catch (error) {
      logger.error('Error getting subtask by ID', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async getSubtasksByDatacoNumber(datacoNumber: string): Promise<Subtask[]> {
    try {
      const { data, error } = await this.client
        .from('subtasks')
        .select('*')
        .eq('dataco_number', datacoNumber);

      if (error) {
        logger.error('Error getting subtasks by dataco number', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapSubtaskFromDb);
    } catch (error) {
      logger.error('Error getting subtasks by dataco number', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async updateSubtaskVisibility(id: string, isVisible: boolean): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('subtasks')
        .update({ is_visible: isVisible })
        .eq('id', id);

      if (error) {
        logger.error('Error updating subtask visibility', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating subtask visibility', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Additional user operations
  async getAllUsers(): Promise<AppUser[]> {
    try {
      const { data, error } = await this.client
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error getting all users', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapUserFromDb);
    } catch (error) {
      logger.error('Error getting all users', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getUserById(id: string): Promise<AppUser | null> {
    try {
      const { data, error } = await this.client
        .from('app_users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error getting user by ID', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapUserFromDb(data);
    } catch (error) {
      logger.error('Error getting user by ID', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<AppUser>, modifiedBy: string): Promise<boolean> {
    try {
      const updateData: any = {
        last_modified_by: modifiedBy,
        last_modified_at: new Date().toISOString()
      };
      
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.passwordHash !== undefined) updateData.password_hash = updates.passwordHash;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.lastLogin !== undefined) updateData.last_login = updates.lastLogin;

      const { error } = await this.client
        .from('app_users')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating user', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating user', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('app_users')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting user', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting user', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Project-specific queries
  async getProjectByName(name: string): Promise<Project | null> {
    try {
      const { data, error } = await this.client
        .from('projects')
        .select('*')
        .eq('name', name)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        logger.error('Error getting project by name', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapProjectFromDb(data);
    } catch (error) {
      logger.error('Error getting project by name', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  // Task-specific queries
  async getTaskByDatacoNumber(datacoNumber: string): Promise<Task | null> {
    try {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .eq('dataco_number', datacoNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        logger.error('Error getting task by dataco number', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapTaskFromDb(data);
    } catch (error) {
      logger.error('Error getting task by dataco number', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async searchTasks(query: string): Promise<Task[]> {
    try {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .or(`title.ilike.%${query}%,subtitle.ilike.%${query}%,dataco_number.ilike.%${query}%`)
        .order('priority', { ascending: false });

      if (error) {
        logger.error('Error searching tasks', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapTaskFromDb);
    } catch (error) {
      logger.error('Error searching tasks', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  // Activity logging
  async logAction(data: {
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
    metadata?: Record<string, any>;
    severity?: 'info' | 'success' | 'warning' | 'error';
  }): Promise<void> {
    try {
      // Handle anonymous users
      const isAnonymous = !data.userId || data.userId === 'anonymous' || data.userId.startsWith('anon_');
      
      const { error } = await this.client
        .from('activity_logs')
        .insert({
          user_id: isAnonymous ? null : data.userId,
          username: isAnonymous ? 'Anonymous' : data.username,
          user_role: isAnonymous ? null : data.userRole,
          action: data.action,
          category: data.category,
          target: data.target || null,
          metadata: data.metadata || null,
          severity: data.severity || 'info'
        });

      if (error) {
        logger.error('Failed to log action', 'DATABASE', { error: error.message });
      }
    } catch (error) {
      logger.error('Failed to log action', 'DATABASE', { error: (error as Error).message });
    }
  }

  // Get recent activity logs
  async getRecentActivityLogs(limit = 100, startDate?: Date): Promise<any[]> {
    try {
      let query = this.client
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting activity logs', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting activity logs', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  // Get active user sessions
  async getActiveUserSessions(minutesAgo = 30): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
      
      const { data, error } = await this.client
        .from('user_sessions')
        .select('id')
        .eq('is_active', true)
        .gte('last_activity', cutoffTime.toISOString());

      if (error) {
        logger.error('Error getting active sessions', 'SUPABASE_DATABASE', { error: error.message });
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      logger.error('Error getting active sessions', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return 0;
    }
  }

  // Add the missing mapping function
  private mapSubtaskFromDb(dbSubtask: any): Subtask {
    return {
      id: dbSubtask.id,
      _id: dbSubtask.id,
      taskId: dbSubtask.task_id,
      title: dbSubtask.title,
      subtitle: dbSubtask.subtitle,
      images: dbSubtask.images || [],
      datacoNumber: dbSubtask.dataco_number,
      type: dbSubtask.type,
      amountNeeded: dbSubtask.amount_needed,
      labels: dbSubtask.labels || [],
      targetCar: dbSubtask.target_car || [],
      weather: dbSubtask.weather,
      scene: dbSubtask.scene,
      dayTime: dbSubtask.day_time || [],
      isVisible: dbSubtask.is_visible,
      createdAt: dbSubtask.created_at,
      updatedAt: dbSubtask.updated_at,
      mongodb_id: dbSubtask.mongodb_id
    };
  }

  // Analytics update methods
  async trackVisit(userId: string, username: string, email: string, role: string): Promise<void> {
    try {
      const analytics = await this.getAnalytics();
      if (!analytics) return;

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      // Update visits
      analytics.visits.total += 1;
      analytics.visits.today += 1;
      
      // Update unique visitors
      if (!analytics.uniqueVisitors.today.includes(userId)) {
        analytics.uniqueVisitors.today.push(userId);
        analytics.uniqueVisitors.total += 1;
      }
      
      // Update daily stats
      if (!analytics.dailyStats[today]) {
        analytics.dailyStats[today] = {
          visits: 0,
          uniqueVisitors: [],
          actions: 0,
          loginCount: 0
        };
      }
      
      analytics.dailyStats[today].visits += 1;
      if (!analytics.dailyStats[today].uniqueVisitors.includes(userId)) {
        analytics.dailyStats[today].uniqueVisitors.push(userId);
      }
      
      analytics.lastUpdated = now;
      
      const { error } = await this.client
        .from('analytics')
        .update({
          visits: analytics.visits,
          unique_visitors: analytics.uniqueVisitors,
          daily_stats: analytics.dailyStats,
          last_updated: now
        })
        .eq('id', analytics.id);

      if (error) {
        logger.error('Error tracking visit', 'SUPABASE_DATABASE', { error: error.message });
      }
    } catch (error) {
      logger.error('Error tracking visit', 'SUPABASE_DATABASE', { error: (error as Error).message });
    }
  }

  async updateAnalyticsCounters(): Promise<void> {
    try {
      const analytics = await this.getAnalytics();
      if (!analytics) return;

      // Get counts from database
      const { data: projectCount } = await this.client.from('projects').select('id', { count: 'exact', head: true });
      const { data: taskCount } = await this.client.from('tasks').select('id', { count: 'exact', head: true });
      const { data: subtaskCount } = await this.client.from('subtasks').select('id', { count: 'exact', head: true });
      const { data: userCount } = await this.client.from('app_users').select('id', { count: 'exact', head: true });
      const { data: activeUserCount } = await this.client.from('app_users').select('id', { count: 'exact', head: true }).eq('is_active', true);

      const counters = {
        projects: projectCount as any || 0,
        tasks: taskCount as any || 0,
        subtasks: subtaskCount as any || 0,
        users: userCount as any || 0,
        activeUsers: activeUserCount as any || 0
      };

      const { error } = await this.client
        .from('analytics')
        .update({
          counters,
          last_updated: new Date().toISOString()
        })
        .eq('id', analytics.id);

      if (error) {
        logger.error('Error updating analytics counters', 'SUPABASE_DATABASE', { error: error.message });
      }
    } catch (error) {
      logger.error('Error updating analytics counters', 'SUPABASE_DATABASE', { error: (error as Error).message });
    }
  }

  // Daily Update operations
  async getActiveDailyUpdates(includeHidden = false): Promise<DailyUpdate[]> {
    try {
      let query = this.client
        .from('daily_updates')
        .select('*')
        .eq('is_active', true);

      if (!includeHidden) {
        query = query.eq('is_hidden', false);
      }

      query = query.order('is_pinned', { ascending: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting active daily updates', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapDailyUpdateFromDb);
    } catch (error) {
      logger.error('Error getting active daily updates', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getActiveDailyUpdatesByScope(projectId?: string, includeHidden = false): Promise<DailyUpdate[]> {
    try {
      let query = this.client
        .from('daily_updates')
        .select('*')
        .eq('is_active', true);

      if (!includeHidden) {
        query = query.eq('is_hidden', false);
      }

      // Add scope filter
      if (projectId) {
        query = query.or(`project_id.eq.${projectId},is_general.eq.true`);
      } else {
        query = query.eq('is_general', true);
      }

      query = query.order('is_pinned', { ascending: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting daily updates by scope', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapDailyUpdateFromDb);
    } catch (error) {
      logger.error('Error getting daily updates by scope', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getAllDailyUpdates(): Promise<DailyUpdate[]> {
    try {
      const { data, error } = await this.client
        .from('daily_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error getting all daily updates', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(this.mapDailyUpdateFromDb);
    } catch (error) {
      logger.error('Error getting all daily updates', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async createDailyUpdate(update: Omit<DailyUpdate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('daily_updates')
        .insert({
          title: update.title,
          content: update.content,
          type: update.type,
          priority: update.priority,
          duration_type: update.durationType,
          duration_value: update.durationValue || null,
          expires_at: update.expiresAt || null,
          is_active: update.isActive,
          is_pinned: update.isPinned,
          is_hidden: update.isHidden,
          target_audience: update.targetAudience,
          project_id: update.projectId || null,
          is_general: update.isGeneral || false,
          created_by: update.createdBy || null
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating daily update', 'SUPABASE_DATABASE', { error: error.message });
        throw error;
      }

      return data.id;
    } catch (error) {
      logger.error('Error creating daily update', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async getDailyUpdateById(id: string): Promise<DailyUpdate | null> {
    try {
      const { data, error } = await this.client
        .from('daily_updates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error getting daily update by ID', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapDailyUpdateFromDb(data);
    } catch (error) {
      logger.error('Error getting daily update by ID', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async updateDailyUpdate(id: string, updates: Partial<DailyUpdate>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.durationType !== undefined) updateData.duration_type = updates.durationType;
      if (updates.durationValue !== undefined) updateData.duration_value = updates.durationValue;
      if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.isPinned !== undefined) updateData.is_pinned = updates.isPinned;
      if (updates.isHidden !== undefined) updateData.is_hidden = updates.isHidden;
      if (updates.targetAudience !== undefined) updateData.target_audience = updates.targetAudience;
      if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
      if (updates.isGeneral !== undefined) updateData.is_general = updates.isGeneral;

      const { error } = await this.client
        .from('daily_updates')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating daily update', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating daily update', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async deleteDailyUpdate(id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('daily_updates')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting daily update', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error deleting daily update', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async getDailyUpdateSetting(key: string): Promise<DailyUpdateSetting | null> {
    try {
      const { data, error } = await this.client
        .from('daily_update_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        logger.error('Error getting daily update setting', 'SUPABASE_DATABASE', { error: error.message });
        return null;
      }

      return this.mapDailyUpdateSettingFromDb(data);
    } catch (error) {
      logger.error('Error getting daily update setting', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return null;
    }
  }

  async upsertDailyUpdateSetting(key: string, value: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('daily_update_settings')
        .upsert({
          key,
          value
        }, {
          onConflict: 'key'
        });

      if (error) {
        logger.error('Error upserting daily update setting', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error upserting daily update setting', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  // Add new mapping functions after the existing ones
  private mapDailyUpdateFromDb(dbUpdate: any): DailyUpdate {
    return {
      id: dbUpdate.id,
      _id: dbUpdate.id,
      title: dbUpdate.title,
      content: dbUpdate.content,
      type: dbUpdate.type,
      priority: dbUpdate.priority,
      durationType: dbUpdate.duration_type,
      durationValue: dbUpdate.duration_value,
      expiresAt: dbUpdate.expires_at,
      isActive: dbUpdate.is_active,
      isPinned: dbUpdate.is_pinned,
      isHidden: dbUpdate.is_hidden,
      targetAudience: dbUpdate.target_audience || [],
      projectId: dbUpdate.project_id,
      isGeneral: dbUpdate.is_general,
      createdBy: dbUpdate.created_by,
      createdAt: dbUpdate.created_at,
      updatedAt: dbUpdate.updated_at,
      mongodb_id: dbUpdate.mongodb_id
    };
  }

  private mapDailyUpdateSettingFromDb(dbSetting: any): DailyUpdateSetting {
    return {
      id: dbSetting.id,
      key: dbSetting.key,
      value: dbSetting.value,
      createdAt: dbSetting.created_at,
      updatedAt: dbSetting.updated_at,
      mongodb_id: dbSetting.mongodb_id
    };
  }

  // Push Notification operations
  async savePushSubscription(subscription: Omit<PushSubscription, 'id' | 'createdAt' | 'lastActive'>): Promise<string> {
    try {
      const now = new Date().toISOString();
      
      // Use the provided userId directly (it's now always a valid UUID or null)
      const userId = subscription.userId || null;
      
      // Check if subscription already exists
      let query = this.client
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', subscription.subscription.endpoint);
      
      // Add user_id condition based on whether it's null or not
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }
      
      const { data: existing } = await query.single();

      if (existing) {
        // Update existing subscription
        await this.client
          .from('push_subscriptions')
          .update({
            is_active: true,
            last_active: now,
            user_agent: subscription.userAgent,
            device_type: subscription.deviceType,
            subscription: subscription.subscription,
            endpoint: subscription.subscription.endpoint,
            p256dh: subscription.subscription.keys?.p256dh || '',
            auth: subscription.subscription.keys?.auth || '',
            username: subscription.username || 'Anonymous',
            role: subscription.role || 'guest',
            email: subscription.email || ''
          })
          .eq('id', existing.id);
        
        logger.info('Updated existing push subscription', 'SUPABASE_DATABASE', { 
          subscriptionId: existing.id,
          userId: userId || 'anonymous'
        });
        
        return existing.id;
      } else {
      // Create new subscription
      const { data, error } = await this.client
        .from('push_subscriptions')
        .insert({
            user_id: userId, // Will be NULL for users without authentication
            username: subscription.username || 'Anonymous',
            email: subscription.email || '',
            role: subscription.role || 'guest',
            subscription: subscription.subscription,
          endpoint: subscription.subscription.endpoint,
            p256dh: subscription.subscription.keys?.p256dh || '',
            auth: subscription.subscription.keys?.auth || '',
          user_agent: subscription.userAgent,
          device_type: subscription.deviceType,
          is_active: true,
            created_at: now,
          last_active: now
        })
          .select('id')
        .single();

      if (error) {
        logger.error('Error saving push subscription', 'SUPABASE_DATABASE', { error: error.message });
        throw error;
      }

        logger.info('Created new push subscription', 'SUPABASE_DATABASE', { 
          subscriptionId: data.id,
          userId: userId || 'anonymous'
        });

      return data.id;
      }
    } catch (error) {
      logger.error('Error saving push subscription', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async removePushSubscription(endpoint: string, userId?: string): Promise<void> {
    try {
      // Use the provided userId directly
      const actualUserId = userId || null;
      
      let query = this.client
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', endpoint);
      
      // Add user_id condition based on whether it's null or not
      if (actualUserId) {
        query = query.eq('user_id', actualUserId);
      } else {
        query = query.is('user_id', null);
      }
      
      const { error } = await query;

      if (error) {
        logger.error('Error removing push subscription', 'SUPABASE_DATABASE', { error: error.message });
        throw error;
      }

      logger.info('Push subscription removed', 'SUPABASE_DATABASE', { 
        endpoint: endpoint.substring(0, 50) + '...',
        userId: actualUserId || 'anonymous'
      });
    } catch (error) {
      logger.error('Error removing push subscription', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async getPushSubscriptions(userId?: string, activeOnly: boolean = true): Promise<PushSubscription[]> {
    try {
      // Use the provided userId directly
      const actualUserId = userId || null;
      
      let query = this.client
        .from('push_subscriptions')
        .select('*');
      
      // Add user_id condition based on whether it's null or not
      if (actualUserId !== undefined) {
        if (actualUserId) {
          query = query.eq('user_id', actualUserId);
        } else {
          query = query.is('user_id', null);
        }
      }
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error('Error getting push subscriptions', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }
      
      return (data || []).map(sub => this.mapPushSubscriptionFromDb(sub));
    } catch (error) {
      logger.error('Error getting push subscriptions', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async getActivePushSubscriptions(filters?: {
    roles?: string[];
    userIds?: string[];
  }): Promise<PushSubscription[]> {
    try {
      let query = this.client
        .from('push_subscriptions')
        .select('*')
        .eq('is_active', true);

      if (filters?.roles?.length) {
        query = query.in('role', filters.roles);
      }

      if (filters?.userIds?.length) {
        // Filter out non-UUID values (like 'anonymous')
        const validUUIDs = filters.userIds.filter(id => {
          // Basic UUID validation
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        });
        
        const hasAnonymous = filters.userIds.includes('anonymous');
        
        if (validUUIDs.length > 0 && hasAnonymous) {
          // Include both valid UUIDs and null (for anonymous)
          query = query.or(`user_id.in.(${validUUIDs.map(id => `"${id}"`).join(',')}),user_id.is.null`);
        } else if (validUUIDs.length > 0) {
          // Only valid UUIDs
          query = query.in('user_id', validUUIDs);
        } else if (hasAnonymous) {
          // Only anonymous users (null user_id)
          query = query.is('user_id', null);
        }
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting active push subscriptions', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(sub => this.mapPushSubscriptionFromDb(sub));
    } catch (error) {
      logger.error('Error getting active push subscriptions', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async createPushNotification(notification: Omit<PushNotification, 'id' | 'sentAt' | 'deliveryStats' | 'status'>): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('push_notifications')
        .insert({
          title: notification.title,
          body: notification.body,
          icon: notification.icon,
          badge: notification.badge,
          image: notification.image,
          url: notification.url,
          tag: notification.tag,
          require_interaction: notification.requireInteraction || false,
          target_roles: notification.targetRoles || [],
          target_users: notification.targetUsers || [],
          sent_by: notification.sentBy,
          delivery_sent: 0,
          delivery_delivered: 0,
          delivery_failed: 0,
          delivery_clicked: 0,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating push notification', 'SUPABASE_DATABASE', { error: error.message });
        throw error;
      }

      return data.id;
    } catch (error) {
      logger.error('Error creating push notification', 'SUPABASE_DATABASE', { error: (error as Error).message });
      throw error;
    }
  }

  async updatePushNotificationStats(id: string, stats: Partial<PushNotification['deliveryStats']>, status?: PushNotification['status']): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (stats.sent !== undefined) updateData.delivery_sent = stats.sent;
      if (stats.delivered !== undefined) updateData.delivery_delivered = stats.delivered;
      if (stats.failed !== undefined) updateData.delivery_failed = stats.failed;
      if (stats.clicked !== undefined) updateData.delivery_clicked = stats.clicked;
      if (status !== undefined) updateData.status = status;

      const { error } = await this.client
        .from('push_notifications')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating push notification stats', 'SUPABASE_DATABASE', { error: error.message });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating push notification stats', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return false;
    }
  }

  async getPushNotificationHistory(limit: number = 50): Promise<PushNotification[]> {
    try {
      const { data, error } = await this.client
        .from('push_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error getting push notification history', 'SUPABASE_DATABASE', { error: error.message });
        return [];
      }

      return data.map(notif => this.mapPushNotificationFromDb(notif));
    } catch (error) {
      logger.error('Error getting push notification history', 'SUPABASE_DATABASE', { error: (error as Error).message });
      return [];
    }
  }

  async updatePushSubscriptionActivity(endpoint: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('push_subscriptions')
        .update({ last_active: new Date().toISOString() })
        .eq('endpoint', endpoint);

      if (error) {
        logger.error('Error updating push subscription activity', 'SUPABASE_DATABASE', { error: error.message });
      }
    } catch (error) {
      logger.error('Error updating push subscription activity', 'SUPABASE_DATABASE', { error: (error as Error).message });
    }
  }

  // Add mapping functions for push notifications
  private mapPushSubscriptionFromDb(dbSub: any): PushSubscription {
    // Handle both old schema (separate fields) and new schema (subscription object)
    let subscriptionData;
    
    if (dbSub.subscription && typeof dbSub.subscription === 'object') {
      // New schema with subscription as JSONB
      subscriptionData = dbSub.subscription;
    } else if (dbSub.endpoint && dbSub.p256dh && dbSub.auth) {
      // Old schema with separate fields
      subscriptionData = {
        endpoint: dbSub.endpoint,
        keys: {
          p256dh: dbSub.p256dh,
          auth: dbSub.auth
        }
      };
    } else {
      // Fallback - try to construct from available data
      subscriptionData = {
        endpoint: dbSub.endpoint || '',
        keys: {
          p256dh: dbSub.p256dh || '',
          auth: dbSub.auth || ''
        }
      };
    }
    
    return {
      id: dbSub.id,
      userId: dbSub.user_id || 'anonymous',
      username: dbSub.username || 'Anonymous',
      email: dbSub.email || '',
      role: dbSub.role || 'guest',
      subscription: subscriptionData,
      userAgent: dbSub.user_agent,
      deviceType: dbSub.device_type,
      createdAt: dbSub.created_at,
      lastActive: dbSub.last_active,
      isActive: dbSub.is_active,
      mongodb_id: dbSub.mongodb_id
    };
  }

  private mapPushNotificationFromDb(dbNotif: any): PushNotification {
    return {
      id: dbNotif.id,
      title: dbNotif.title,
      body: dbNotif.body,
      icon: dbNotif.icon,
      badge: dbNotif.badge,
      image: dbNotif.image,
      url: dbNotif.url,
      tag: dbNotif.tag,
      requireInteraction: dbNotif.require_interaction,
      targetRoles: dbNotif.target_roles,
      targetUsers: dbNotif.target_users,
      sentBy: dbNotif.sent_by,
      sentAt: dbNotif.sent_at,
      deliveryStats: {
        sent: dbNotif.delivery_sent,
        delivered: dbNotif.delivery_delivered,
        failed: dbNotif.delivery_failed,
        clicked: dbNotif.delivery_clicked
      },
      status: dbNotif.status,
      mongodb_id: dbNotif.mongodb_id
    };
  }

  // Analytics tracking
  async incrementPageView(page: string): Promise<void> {
    try {
      const analytics = await this.getAnalytics();
      if (!analytics) {
        logger.warn('No analytics record found', 'DATABASE');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Initialize today's stats if they don't exist
      if (!analytics.dailyStats) {
        analytics.dailyStats = {};
      }
      
      if (!analytics.dailyStats[today]) {
        analytics.dailyStats[today] = {
          visits: 0,
          uniqueVisitors: [],
          actions: 0,
          loginCount: 0
        };
      }
      
      // Increment the visit count for today
      analytics.dailyStats[today].visits++;
      
      // Also update the aggregate visit counts
      const updateData = {
        visits: {
          total: (analytics.visits?.total || 0) + 1,
          today: analytics.dailyStats[today].visits,
          last7Days: analytics.visits?.last7Days || 0, // This would need to be calculated properly
          last30Days: analytics.visits?.last30Days || 0 // This would need to be calculated properly
        },
        daily_stats: analytics.dailyStats,
        last_updated: new Date().toISOString()
      };
      
      // Update the analytics record
      const { error } = await this.client
        .from('analytics')
        .update(updateData)
        .eq('id', analytics.id);
        
      if (error) {
        logger.error('Failed to update page view', 'DATABASE', { error: error.message });
      }
    } catch (error) {
      logger.error('Error tracking page view', 'DATABASE', { page }, error as Error);
    }
  }
}

// Export singleton instance
export const supabaseDb = new SupabaseDatabaseService(); 