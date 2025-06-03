import { supabase, handleSupabaseError } from './supabase';
import { Database as DatabaseTypes } from './database-types';
import type { Database, Project, Task, Subtask, User, Analytics } from './database';
import { logger, AppError, validateRequired } from './logger';

export class SupabaseDatabase implements Database {
  private adminClient: any;
  private adminClientPromise: Promise<any>;
  
  constructor() {
    // Initialize admin client for write operations (server-side only)
    this.adminClientPromise = this.initializeAdminClient();
    // Initialize connection test
    this.testConnection();
  }

  private async initializeAdminClient() {
    // Only create admin client on server side
    if (typeof window === 'undefined') {
      try {
        const { createAdminClient } = await import('./supabase-server');
        this.adminClient = createAdminClient();
        logger.debug('Admin client initialized for server-side operations', 'SUPABASE_DB');
        return this.adminClient;
      } catch (error) {
        logger.warn('Failed to initialize admin client, using regular client', 'SUPABASE_DB');
        this.adminClient = supabase;
        return this.adminClient;
      }
    } else {
      // On client side, use regular supabase client
      this.adminClient = supabase;
      logger.debug('Using regular client for client-side operations', 'SUPABASE_DB');
      return this.adminClient;
    }
  }

  private async getAdminClient() {
    if (!this.adminClient) {
      await this.adminClientPromise;
    }
    return this.adminClient;
  }

  private async testConnection() {
    try {
      const { data, error } = await supabase.from('projects').select('count').limit(1);
      if (error) {
        logger.error('SupabaseDatabase connection test failed', 'SUPABASE_DB', { error: error.message });
      }
    } catch (error) {
      logger.error('SupabaseDatabase connection test error', 'SUPABASE_DB', undefined, error as Error);
    }
  }

  // Tasks
  async getAllTasks(): Promise<Task[]> {
    try {
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const tasks = data.map(this.mapTaskFromSupabase);
      return tasks;
    } catch (error) {
      handleSupabaseError(error, 'getAllTasks');
      return [];
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      validateRequired({ id }, ['id'], 'GET_TASK_BY_ID');
      
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const task = this.mapTaskFromSupabase(data);
      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'getTaskById');
      return null;
    }
  }

  async getTasksByProjectId(projectId: string): Promise<Task[]> {
    try {
      validateRequired({ projectId }, ['projectId'], 'GET_TASKS_BY_PROJECT');
      
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const tasks = data.map(this.mapTaskFromSupabase);
      return tasks;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'getTasksByProjectId');
      return [];
    }
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      // Map to Supabase format
      const supabaseTask = this.mapTaskToSupabase(task);
      
      // Use admin client for creating tasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('tasks')
        .insert(supabaseTask)
        .select()
        .single();

      if (error) throw error;
      
      const newTask = this.mapTaskFromSupabase(data);
      logger.debug(`Created task ${newTask.id}`, 'SUPABASE_DB');
      return newTask;
    } catch (error) {
      handleSupabaseError(error, 'createTask');
      throw new AppError('Failed to create task', 500, 'CREATE_TASK');
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      validateRequired({ id }, ['id'], 'UPDATE_TASK');
      
      const supabaseUpdates = this.mapTaskToSupabase(updates, true);
      
      // Use admin client for updating tasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('tasks')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const updatedTask = this.mapTaskFromSupabase(data);
      logger.debug(`Updated task ${id}`, 'SUPABASE_DB');
      return updatedTask;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'updateTask');
      return null;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      validateRequired({ id }, ['id'], 'DELETE_TASK');
      
      // Use admin client for deleting tasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { error } = await client
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      logger.debug(`Deleted task ${id}`, 'SUPABASE_DB');
      return true;
    } catch (error) {
      handleSupabaseError(error, 'deleteTask');
      return false;
    }
  }

  // Subtasks
  async getAllSubtasks(): Promise<Subtask[]> {
    try {
      // Use admin client for reading subtasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('subtasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const subtasks = data.map(this.mapSubtaskFromSupabase);
      return subtasks;
    } catch (error) {
      handleSupabaseError(error, 'getAllSubtasks');
      return [];
    }
  }

  async getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
    try {
      validateRequired({ taskId }, ['taskId'], 'GET_SUBTASKS_BY_TASK');
      
      // Use admin client for reading subtasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const subtasks = data.map(this.mapSubtaskFromSupabase);
      return subtasks;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'getSubtasksByTaskId');
      return [];
    }
  }

  async getSubtaskById(id: string): Promise<Subtask | null> {
    try {
      validateRequired({ id }, ['id'], 'GET_SUBTASK_BY_ID');
      
      // Use admin client for reading subtasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('subtasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const subtask = this.mapSubtaskFromSupabase(data);
      return subtask;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'getSubtaskById');
      return null;
    }
  }

  async createSubtask(subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subtask> {
    try {
      const supabaseSubtask = this.mapSubtaskToSupabase(subtask);
      
      // Use admin client for creating subtasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('subtasks')
        .insert(supabaseSubtask)
        .select()
        .single();

      if (error) throw error;
      
      const newSubtask = this.mapSubtaskFromSupabase(data);
      logger.debug(`Created subtask ${newSubtask.id}`, 'SUPABASE_DB');
      return newSubtask;
    } catch (error) {
      handleSupabaseError(error, 'createSubtask');
      throw new AppError('Failed to create subtask', 500, 'CREATE_SUBTASK');
    }
  }

  async updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask | null> {
    try {
      validateRequired({ id }, ['id'], 'UPDATE_SUBTASK');
      
      const supabaseUpdates = this.mapSubtaskToSupabase(updates, true);
      
      // Use admin client for updating subtasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('subtasks')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const updatedSubtask = this.mapSubtaskFromSupabase(data);
      logger.debug(`Updated subtask ${id}`, 'SUPABASE_DB');
      return updatedSubtask;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'updateSubtask');
      return null;
    }
  }

  async deleteSubtask(id: string): Promise<boolean> {
    try {
      validateRequired({ id }, ['id'], 'DELETE_SUBTASK');
      
      // Use admin client for deleting subtasks to bypass RLS policies
      const client = await this.getAdminClient();
      const { error } = await client
        .from('subtasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      logger.debug(`Deleted subtask ${id}`, 'SUPABASE_DB');
      return true;
    } catch (error) {
      handleSupabaseError(error, 'deleteSubtask');
      return false;
    }
  }

  // Projects
  async getAllProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const projects = data.map(this.mapProjectFromSupabase);
      return projects;
    } catch (error) {
      handleSupabaseError(error, 'getAllProjects');
      return [];
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      validateRequired({ id }, ['id'], 'GET_PROJECT_BY_ID');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const project = this.mapProjectFromSupabase(data);
      return project;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'getProjectById');
      return null;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      // Use admin client for creating projects to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('projects')
        .insert({
          name: project.name,
          description: project.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Supabase project creation failed', 'SUPABASE_DB', {
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          projectName: project.name
        });
        
        // Provide more specific error messages
        if (error.code === '42501') {
          throw new AppError('Insufficient privileges - check RLS policies and service key', 403, 'CREATE_PROJECT');
        } else if (error.code === '23505') {
          throw new AppError(`Project with name "${project.name}" already exists`, 409, 'CREATE_PROJECT');
        } else if (error.message?.includes('JWT')) {
          throw new AppError('Authentication token invalid or expired', 401, 'CREATE_PROJECT');
        } else {
          throw new AppError(`Database error: ${error.message}`, 500, 'CREATE_PROJECT');
        }
      }
      
      const newProject = this.mapProjectFromSupabase(data);
      logger.debug(`Created project ${newProject.id}`, 'SUPABASE_DB');
      return newProject;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Unexpected error in createProject', 'SUPABASE_DB', {
        projectName: project.name,
        errorType: error?.constructor?.name
      }, error as Error);
      
      throw new AppError('Failed to create project', 500, 'CREATE_PROJECT');
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      validateRequired({ id }, ['id'], 'UPDATE_PROJECT');
      
      // Use admin client for updating projects to bypass RLS policies
      const client = await this.getAdminClient();
      const { data, error } = await client
        .from('projects')
        .update({
          name: updates.name,
          description: updates.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const updatedProject = this.mapProjectFromSupabase(data);
      logger.debug(`Updated project ${id}`, 'SUPABASE_DB');
      return updatedProject;
    } catch (error) {
      handleSupabaseError(error, 'updateProject');
      throw new AppError('Failed to update project', 500, 'UPDATE_PROJECT');
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      validateRequired({ id }, ['id'], 'DELETE_PROJECT');
      
      // Use admin client for deleting projects to bypass RLS policies
      const client = await this.getAdminClient();
      const { error } = await client
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      logger.debug(`Deleted project ${id}`, 'SUPABASE_DB');
      return true;
    } catch (error) {
      handleSupabaseError(error, 'deleteProject');
      throw new AppError('Failed to delete project', 500, 'DELETE_PROJECT');
    }
  }

  // Users
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      validateRequired({ username }, ['username'], 'GET_USER_BY_USERNAME');
      
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const user = this.mapUserFromSupabase(data);
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'getUserByUsername');
      return null;
    }
  }

  // Analytics
  async getAnalytics(): Promise<Analytics> {
    try {
      // Try admin client first, then fallback to regular client
      let client;
      try {
        client = await this.getAdminClient();
      } catch {
        client = supabase;
      }
      
      const { data, error } = await client
        .from('analytics')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create default analytics if none exist
          return this.createDefaultAnalytics();
        }
        return this.createDefaultAnalytics();
      }
      
      const analytics = this.mapAnalyticsFromSupabase(data);
      return analytics;
    } catch (error) {
      return this.createDefaultAnalytics();
    }
  }

  async updateAnalytics(updates: Partial<Analytics>): Promise<Analytics> {
    try {
      // First, get current analytics
      const current = await this.getAnalytics();
      
      const updatedData = {
        ...current,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      
      const client = await this.getAdminClient();
      
      // Check if record exists
      const { data: existing } = await client
        .from('analytics')
        .select('id')
        .limit(1)
        .single();
      
      if (existing) {
        // Update existing record
        const { data, error } = await client
          .from('analytics')
          .update(this.mapAnalyticsToSupabase(updatedData))
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          if (error.code === '42501') {
            throw new Error(`RLS_POLICY_ERROR: ${error.message}`);
          }
          throw error;
        }
        
        return this.mapAnalyticsFromSupabase(data);
      } else {
        // Create new record
        const { data, error } = await client
          .from('analytics')
          .insert(this.mapAnalyticsToSupabase(updatedData))
          .select()
          .single();
        
        if (error) {
          if (error.code === '42501') {
            throw new Error(`RLS_POLICY_ERROR: ${error.message}`);
          }
          throw error;
        }
        
        return this.mapAnalyticsFromSupabase(data);
      }
    } catch (error) {
      handleSupabaseError(error, 'updateAnalytics');
      throw error;
    }
  }

  async incrementPageView(page: string): Promise<void> {
    try {
      const current = await this.getAnalytics();
      const today = new Date().toISOString().split('T')[0];
      const dailyStats = current.dailyStats || {};
      
      await this.updateAnalytics({
        totalVisits: current.totalVisits + 1,
        dailyStats: {
          ...dailyStats,
          [today]: (dailyStats[today] || 0) + 1
        }
      });
    } catch (error) {
      handleSupabaseError(error, 'incrementPageView');
      // Don't throw here - page views should be non-blocking
    }
  }

  // Helper mapping functions
  private mapTaskFromSupabase(data: any): Task {
    return {
      id: data.id,
      title: data.title,
      subtitle: data.subtitle,
      datacoNumber: data.dataco_number,
      description: data.description,
      projectId: data.project_id,
      type: data.type,
      locations: data.locations,
      amountNeeded: Number(data.amount_needed),
      targetCar: data.target_car,
      lidar: data.lidar,
      dayTime: data.day_time,
      priority: data.priority,
      isVisible: data.is_visible,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapTaskToSupabase(task: any, isUpdate = false): any {
    const mapped: any = {};
    
    if (task.title !== undefined) mapped.title = task.title;
    if (task.subtitle !== undefined) mapped.subtitle = task.subtitle;
    if (task.datacoNumber !== undefined) mapped.dataco_number = task.datacoNumber;
    if (task.description !== undefined) mapped.description = task.description;
    if (task.projectId !== undefined) mapped.project_id = task.projectId;
    if (task.type !== undefined) mapped.type = Array.isArray(task.type) ? task.type : [task.type];
    if (task.locations !== undefined) mapped.locations = Array.isArray(task.locations) ? task.locations : [task.locations];
    if (task.amountNeeded !== undefined) mapped.amount_needed = task.amountNeeded;
    if (task.targetCar !== undefined) mapped.target_car = Array.isArray(task.targetCar) ? task.targetCar : [task.targetCar];
    if (task.lidar !== undefined) mapped.lidar = task.lidar;
    if (task.dayTime !== undefined) mapped.day_time = Array.isArray(task.dayTime) ? task.dayTime : [task.dayTime];
    if (task.priority !== undefined) mapped.priority = task.priority;
    if (task.isVisible !== undefined) mapped.is_visible = task.isVisible;
    
    return mapped;
  }

  private mapSubtaskFromSupabase(data: any): Subtask {
    return {
      id: data.id,
      taskId: data.task_id,
      title: data.title,
      subtitle: data.subtitle,
      image: data.image,
      datacoNumber: data.dataco_number,
      type: data.type,
      amountNeeded: Number(data.amount_needed),
      labels: data.labels,
      targetCar: data.target_car,
      weather: data.weather,
      scene: data.scene,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapSubtaskToSupabase(subtask: any, isUpdate = false): any {
    const mapped: any = {};
    
    if (subtask.taskId !== undefined) mapped.task_id = subtask.taskId;
    if (subtask.title !== undefined) mapped.title = subtask.title;
    if (subtask.subtitle !== undefined) mapped.subtitle = subtask.subtitle;
    if (subtask.image !== undefined) mapped.image = subtask.image;
    if (subtask.datacoNumber !== undefined) mapped.dataco_number = subtask.datacoNumber;
    if (subtask.type !== undefined) mapped.type = subtask.type;
    if (subtask.amountNeeded !== undefined) mapped.amount_needed = subtask.amountNeeded;
    if (subtask.labels !== undefined) mapped.labels = Array.isArray(subtask.labels) ? subtask.labels : [subtask.labels];
    if (subtask.targetCar !== undefined) mapped.target_car = Array.isArray(subtask.targetCar) ? subtask.targetCar : [subtask.targetCar];
    if (subtask.weather !== undefined) mapped.weather = subtask.weather;
    if (subtask.scene !== undefined) mapped.scene = subtask.scene;
    
    return mapped;
  }

  private mapProjectFromSupabase(data: any): Project {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapUserFromSupabase(data: any): User {
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      passwordHash: data.password_hash,
      role: data.role,
      createdAt: data.created_at,
      lastLogin: data.last_login
    };
  }

  private mapAnalyticsFromSupabase(data: any): Analytics {
    return {
      totalVisits: data.total_visits,
      uniqueVisitors: data.unique_visitors,
      dailyStats: data.daily_stats,
      pageViews: data.page_views,
      lastUpdated: data.last_updated
    };
  }

  private createDefaultAnalytics(): Analytics {
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      dailyStats: {},
      pageViews: {
        homepage: 0,
        projects: {},
        tasks: {},
        admin: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }

  private mapAnalyticsToSupabase(analytics: Analytics): any {
    const mapped: any = {};
    
    if (analytics.totalVisits !== undefined) mapped.total_visits = analytics.totalVisits;
    if (analytics.uniqueVisitors !== undefined) mapped.unique_visitors = analytics.uniqueVisitors;
    if (analytics.dailyStats !== undefined) mapped.daily_stats = analytics.dailyStats;
    if (analytics.pageViews !== undefined) mapped.page_views = analytics.pageViews;
    if (analytics.lastUpdated !== undefined) mapped.last_updated = analytics.lastUpdated;
    
    return mapped;
  }
} 