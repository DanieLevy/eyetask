import { logger, AppError } from './logger';
import { SupabaseDatabase } from './supabase-database';

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
  getTasksByProjectId(projectId: string): Promise<Task[]>;
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
  updateProject(id: string, updates: Partial<Project>): Promise<Project | null>;
  deleteProject(id: string): Promise<boolean>;
  
  // Users
  getUserByUsername(username: string): Promise<User | null>;
  
  // Analytics
  getAnalytics(): Promise<Analytics>;
  updateAnalytics(updates: Partial<Analytics>): Promise<Analytics>;
  incrementPageView(page: string, id?: string): Promise<void>;
}

// Database factory
export function createDatabase(): Database {
  // Use Supabase database for production
  const db = new SupabaseDatabase();

  // Log that database is ready
  logger.debug('Database instance created', 'DATABASE');

  return db;
}

// Singleton instance
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
} 