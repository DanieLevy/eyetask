import { supabase, handleSupabaseError } from './supabase';
import { logger, AppError, validateRequired } from './logger';
import type { Database } from './database';
import type { 
  Task, 
  Subtask, 
  Project, 
  User, 
  Analytics 
} from './database';

export class SupabaseDatabase implements Database {
  // Tasks
  async getAllTasks(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const tasks = data.map(this.mapTaskFromSupabase);
      logger.debug(`Retrieved ${tasks.length} tasks from Supabase`, 'SUPABASE_DB');
      return tasks;
    } catch (error) {
      handleSupabaseError(error, 'getAllTasks');
      return [];
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      validateRequired({ id }, ['id'], 'GET_TASK_BY_ID');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const task = this.mapTaskFromSupabase(data);
      logger.debug(`Retrieved task ${id} from Supabase`, 'SUPABASE_DB');
      return task;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'getTaskById');
      return null;
    }
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      // Map to Supabase format
      const supabaseTask = this.mapTaskToSupabase(task);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(supabaseTask)
        .select()
        .single();

      if (error) throw error;
      
      const newTask = this.mapTaskFromSupabase(data);
      logger.info(`Created task ${newTask.id} in Supabase`, 'SUPABASE_DB');
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
      
      const { data, error } = await supabase
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
      logger.info(`Updated task ${id} in Supabase`, 'SUPABASE_DB');
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
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      logger.info(`Deleted task ${id} from Supabase`, 'SUPABASE_DB');
      return true;
    } catch (error) {
      handleSupabaseError(error, 'deleteTask');
      return false;
    }
  }

  // Subtasks
  async getAllSubtasks(): Promise<Subtask[]> {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const subtasks = data.map(this.mapSubtaskFromSupabase);
      logger.debug(`Retrieved ${subtasks.length} subtasks from Supabase`, 'SUPABASE_DB');
      return subtasks;
    } catch (error) {
      handleSupabaseError(error, 'getAllSubtasks');
      return [];
    }
  }

  async getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
    try {
      validateRequired({ taskId }, ['taskId'], 'GET_SUBTASKS_BY_TASK');
      
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const subtasks = data.map(this.mapSubtaskFromSupabase);
      logger.debug(`Retrieved ${subtasks.length} subtasks for task ${taskId} from Supabase`, 'SUPABASE_DB');
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
      
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const subtask = this.mapSubtaskFromSupabase(data);
      logger.debug(`Retrieved subtask ${id} from Supabase`, 'SUPABASE_DB');
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
      
      const { data, error } = await supabase
        .from('subtasks')
        .insert(supabaseSubtask)
        .select()
        .single();

      if (error) throw error;
      
      const newSubtask = this.mapSubtaskFromSupabase(data);
      logger.info(`Created subtask ${newSubtask.id} in Supabase`, 'SUPABASE_DB');
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
      
      const { data, error } = await supabase
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
      logger.info(`Updated subtask ${id} in Supabase`, 'SUPABASE_DB');
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
      
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      logger.info(`Deleted subtask ${id} from Supabase`, 'SUPABASE_DB');
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
      logger.debug(`Retrieved ${projects.length} projects from Supabase`, 'SUPABASE_DB');
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
      logger.debug(`Retrieved project ${id} from Supabase`, 'SUPABASE_DB');
      return project;
    } catch (error) {
      if (error instanceof AppError) throw error;
      handleSupabaseError(error, 'getProjectById');
      return null;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          description: project.description || null
        })
        .select()
        .single();

      if (error) throw error;
      
      const newProject = this.mapProjectFromSupabase(data);
      logger.info(`Created project ${newProject.id} in Supabase`, 'SUPABASE_DB');
      return newProject;
    } catch (error) {
      handleSupabaseError(error, 'createProject');
      throw new AppError('Failed to create project', 500, 'CREATE_PROJECT');
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
      logger.debug(`Retrieved user ${username} from Supabase`, 'SUPABASE_DB');
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
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create default analytics if none exist
          return this.createDefaultAnalytics();
        }
        throw error;
      }
      
      const analytics = this.mapAnalyticsFromSupabase(data);
      logger.debug('Retrieved analytics from Supabase', 'SUPABASE_DB');
      return analytics;
    } catch (error) {
      handleSupabaseError(error, 'getAnalytics');
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
        last_updated: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('analytics')
        .upsert({
          total_visits: updatedData.totalVisits,
          unique_visitors: updatedData.uniqueVisitors,
          daily_stats: updatedData.dailyStats,
          page_views: updatedData.pageViews,
          last_updated: updatedData.lastUpdated
        })
        .select()
        .single();

      if (error) throw error;
      
      const analytics = this.mapAnalyticsFromSupabase(data);
      logger.debug('Updated analytics in Supabase', 'SUPABASE_DB');
      return analytics;
    } catch (error) {
      handleSupabaseError(error, 'updateAnalytics');
      return this.createDefaultAnalytics();
    }
  }

  async incrementPageView(page: string, id?: string): Promise<void> {
    try {
      const analytics = await this.getAnalytics();
      
      if (page === 'homepage') {
        analytics.pageViews.homepage++;
      } else if (page === 'admin') {
        analytics.pageViews.admin++;
      } else if (page === 'projects' && id) {
        analytics.pageViews.projects[id] = (analytics.pageViews.projects[id] || 0) + 1;
      } else if (page === 'tasks' && id) {
        analytics.pageViews.tasks[id] = (analytics.pageViews.tasks[id] || 0) + 1;
      }
      
      await this.updateAnalytics(analytics);
      logger.debug(`Incremented page view for ${page}${id ? `:${id}` : ''}`, 'SUPABASE_DB');
    } catch (error) {
      logger.error('Failed to increment page view', 'SUPABASE_DB', { page, id }, error as Error);
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
    if (task.type !== undefined) mapped.type = task.type;
    if (task.locations !== undefined) mapped.locations = task.locations;
    if (task.amountNeeded !== undefined) mapped.amount_needed = task.amountNeeded;
    if (task.targetCar !== undefined) mapped.target_car = task.targetCar;
    if (task.lidar !== undefined) mapped.lidar = task.lidar;
    if (task.dayTime !== undefined) mapped.day_time = task.dayTime;
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
    if (subtask.labels !== undefined) mapped.labels = subtask.labels;
    if (subtask.targetCar !== undefined) mapped.target_car = subtask.targetCar;
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
} 