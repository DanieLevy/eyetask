import { logger, AppError } from './logger';

// Types
export interface Task {
  id: string;
  title: string;
  subtitle?: string;
  datacoNumber: string;
  description: {
    main: string;
    howToExecute: string;
  };
  projectId: string;
  type: ('events' | 'hours')[];
  locations: string[];
  amountNeeded: number;
  targetCar: string[];
  lidar: boolean;
  dayTime: ('day' | 'night' | 'dusk' | 'dawn')[];
  priority: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  datacoNumber: string;
  type: 'events' | 'hours';
  amountNeeded: number;
  labels: string[];
  targetCar: string[];
  weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin';
  createdAt: string;
  lastLogin: string | null;
}

export interface Analytics {
  totalVisits: number;
  uniqueVisitors: number;
  dailyStats: Record<string, number>;
  pageViews: {
    homepage: number;
    projects: Record<string, number>;
    tasks: Record<string, number>;
    admin: number;
  };
  lastUpdated: string;
}

// Database interface
export interface Database {
  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;
  
  // Subtasks
  getAllSubtasks(): Promise<Subtask[]>;
  getSubtasksByTaskId(taskId: string): Promise<Subtask[]>;
  getSubtaskById(id: string): Promise<Subtask | null>;
  createSubtask(subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subtask>;
  updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask | null>;
  deleteSubtask(id: string): Promise<boolean>;
  
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  
  // Users
  getUserByUsername(username: string): Promise<User | null>;
  
  // Analytics
  getAnalytics(): Promise<Analytics>;
  updateAnalytics(updates: Partial<Analytics>): Promise<Analytics>;
  incrementPageView(page: string, id?: string): Promise<void>;
}

// In-memory database (for development and simple deployments)
class InMemoryDatabase implements Database {
  private data = {
    tasks: [] as Task[],
    subtasks: [] as Subtask[],
    projects: [] as Project[],
    users: [] as User[],
    analytics: {
      totalVisits: 0,
      uniqueVisitors: 0,
      dailyStats: {},
      pageViews: {
        homepage: 0,
        projects: {},
        tasks: {},
        admin: 0,
      },
      lastUpdated: new Date().toISOString(),
    } as Analytics
  };

  constructor() {
    // Initialize with some default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Default admin user
    if (this.data.users.length === 0) {
      this.data.users.push({
        id: 'user_admin',
        username: 'admin',
        email: 'admin@eyetask.com',
        passwordHash: '$2a$10$rYvLkzZoOKVE9Dp5Y2j8FOW8wDOJ8vH.fBCWm8dGE.I8GqVhsqrDy', // password: admin123
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: null,
      });
    }

    // Default project if none exist
    if (this.data.projects.length === 0) {
      this.data.projects.push({
        id: 'project_default',
        name: 'Default Project',
        description: 'A default project for getting started',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Tasks
  async getAllTasks(): Promise<Task[]> {
    return [...this.data.tasks];
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.data.tasks.find(task => task.id === id) || null;
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amountNeeded: 0,
      isVisible: task.isVisible !== undefined ? task.isVisible : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.data.tasks.push(newTask);
    logger.info('Task created in memory', 'DATABASE', { taskId: newTask.id });
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const taskIndex = this.data.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) return null;
    
    this.data.tasks[taskIndex] = {
      ...this.data.tasks[taskIndex],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    
    return this.data.tasks[taskIndex];
  }

  async deleteTask(id: string): Promise<boolean> {
    const initialLength = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(task => task.id !== id);
    
    // Also delete related subtasks
    this.data.subtasks = this.data.subtasks.filter(subtask => subtask.taskId !== id);
    
    return this.data.tasks.length < initialLength;
  }

  // Subtasks
  async getAllSubtasks(): Promise<Subtask[]> {
    return [...this.data.subtasks];
  }

  async getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
    return this.data.subtasks.filter(subtask => subtask.taskId === taskId);
  }

  async getSubtaskById(id: string): Promise<Subtask | null> {
    return this.data.subtasks.find(subtask => subtask.id === id) || null;
  }

  async createSubtask(subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subtask> {
    const newSubtask: Subtask = {
      ...subtask,
      id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.data.subtasks.push(newSubtask);
    
    // Auto-update parent task amount
    await this.updateTaskAmount(subtask.taskId);
    
    return newSubtask;
  }

  async updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask | null> {
    const subtaskIndex = this.data.subtasks.findIndex(subtask => subtask.id === id);
    if (subtaskIndex === -1) return null;
    
    const oldTaskId = this.data.subtasks[subtaskIndex].taskId;
    
    this.data.subtasks[subtaskIndex] = {
      ...this.data.subtasks[subtaskIndex],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    
    // Auto-update parent task amounts
    await this.updateTaskAmount(oldTaskId);
    if (updates.taskId && updates.taskId !== oldTaskId) {
      await this.updateTaskAmount(updates.taskId);
    }
    
    return this.data.subtasks[subtaskIndex];
  }

  async deleteSubtask(id: string): Promise<boolean> {
    const subtaskToDelete = this.data.subtasks.find(subtask => subtask.id === id);
    if (!subtaskToDelete) return false;
    
    const taskId = subtaskToDelete.taskId;
    this.data.subtasks = this.data.subtasks.filter(subtask => subtask.id !== id);
    
    // Auto-update parent task amount
    await this.updateTaskAmount(taskId);
    
    return true;
  }

  // Projects
  async getAllProjects(): Promise<Project[]> {
    return [...this.data.projects];
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.data.projects.find(project => project.id === id) || null;
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.data.projects.push(newProject);
    return newProject;
  }

  // Users
  async getUserByUsername(username: string): Promise<User | null> {
    return this.data.users.find(user => user.username === username) || null;
  }

  // Analytics
  async getAnalytics(): Promise<Analytics> {
    return { ...this.data.analytics };
  }

  async updateAnalytics(updates: Partial<Analytics>): Promise<Analytics> {
    this.data.analytics = {
      ...this.data.analytics,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    return { ...this.data.analytics };
  }

  async incrementPageView(page: string, id?: string): Promise<void> {
    if (page === 'homepage') {
      this.data.analytics.pageViews.homepage++;
    } else if (page === 'admin') {
      this.data.analytics.pageViews.admin++;
    } else if (page === 'projects' && id) {
      this.data.analytics.pageViews.projects[id] = (this.data.analytics.pageViews.projects[id] || 0) + 1;
    } else if (page === 'tasks' && id) {
      this.data.analytics.pageViews.tasks[id] = (this.data.analytics.pageViews.tasks[id] || 0) + 1;
    }
  }

  // Helper method
  private async updateTaskAmount(taskId: string): Promise<void> {
    const subtasks = await this.getSubtasksByTaskId(taskId);
    const totalAmount = subtasks.reduce((sum, subtask) => sum + subtask.amountNeeded, 0);
    await this.updateTask(taskId, { amountNeeded: totalAmount });
  }
}

// Database factory
export function createDatabase(): Database {
  // For now, always use in-memory database
  // In the future, you can add environment-based switching
  return new InMemoryDatabase();
}

// Singleton instance
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = createDatabase();
    logger.info('Database instance created', 'DATABASE');
  }
  return dbInstance;
} 