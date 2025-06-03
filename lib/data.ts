import { promises as fs } from 'fs';
import path from 'path';
import { logger, AppError, validateRequired, retryOperation, safeJsonParse } from './logger';

// Type definitions based on workplan
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

export interface Settings {
  appName: string;
  companyName: string;
  language: string;
  rtl: boolean;
  theme: string;
  version: string;
  maintenanceMode: boolean;
  allowPublicAccess: boolean;
  realTimeUpdates: boolean;
  maxImageSize: number;
  supportedImageFormats: string[];
  pagination: {
    tasksPerPage: number;
    subtasksPerPage: number;
  };
  lastUpdated: string;
}

// Data file paths
const DATA_DIR = path.join(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const SUBTASKS_FILE = path.join(DATA_DIR, 'subtasks.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
async function ensureDataDirectory(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch (error) {
    logger.info('Creating data directory', 'DATA_INIT');
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Create backup of data file before major operations
async function createBackup(filePath: string): Promise<void> {
  try {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    logger.debug(`Backup created: ${backupPath}`, 'BACKUP');
  } catch (error) {
    logger.warn('Failed to create backup', 'BACKUP', { filePath }, error as Error);
  }
}

// Generic read function with enhanced error handling
async function readJsonFile<T>(filePath: string, defaultValue?: T): Promise<T> {
  try {
    await ensureDataDirectory();
    
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = safeJsonParse(data, null, `READ_${path.basename(filePath)}`);
    
    if (parsed === null) {
      if (defaultValue !== undefined) {
        logger.warn(`Using default value for ${filePath}`, 'DATA_READ');
        return defaultValue;
      }
      throw new AppError(`Invalid JSON in file: ${filePath}`, 500, 'DATA_READ');
    }
    
    logger.debug(`Successfully read file: ${path.basename(filePath)}`, 'DATA_READ');
    return parsed;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if ((error as any).code === 'ENOENT') {
      if (defaultValue !== undefined) {
        logger.info(`File not found, using default: ${filePath}`, 'DATA_READ');
        return defaultValue;
      }
      throw new AppError(`File not found: ${filePath}`, 404, 'DATA_READ');
    }
    
    logger.error(`Error reading file: ${filePath}`, 'DATA_READ', undefined, error as Error);
    throw new AppError(`Failed to read data from ${filePath}`, 500, 'DATA_READ');
  }
}

// Generic write function with enhanced error handling
async function writeJsonFile<T>(filePath: string, data: T, createBackup: boolean = true): Promise<void> {
  try {
    await ensureDataDirectory();
    
    // Validate data before writing
    if (data === null || data === undefined) {
      throw new AppError('Cannot write null or undefined data', 400, 'DATA_WRITE');
    }
    
    // Create backup if file exists and backup is requested
    if (createBackup) {
      try {
        await fs.access(filePath);
        await createBackup(filePath);
      } catch (error) {
        // File doesn't exist, no backup needed
      }
    }
    
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf8');
    
    logger.debug(`Successfully wrote file: ${path.basename(filePath)}`, 'DATA_WRITE');
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error(`Error writing file: ${filePath}`, 'DATA_WRITE', undefined, error as Error);
    throw new AppError(`Failed to write data to ${filePath}`, 500, 'DATA_WRITE');
  }
}

// Tasks functions with enhanced error handling
export async function getAllTasks(): Promise<Task[]> {
  try {
    const data = await readJsonFile<{ tasks: Task[] }>(TASKS_FILE, { tasks: [] });
    logger.dataOperation('read', 'tasks', undefined, { count: data.tasks.length });
    return data.tasks;
  } catch (error) {
    logger.dataOperation('read', 'tasks', undefined, undefined, error as Error);
    throw error;
  }
}

export async function getTaskById(id: string): Promise<Task | null> {
  try {
    validateRequired({ id }, ['id'], 'GET_TASK_BY_ID');
    
    const tasks = await getAllTasks();
    const task = tasks.find(task => task.id === id) || null;
    
    logger.dataOperation('read', 'task', id, { found: !!task });
    return task;
  } catch (error) {
    logger.dataOperation('read', 'task', id, undefined, error as Error);
    throw error;
  }
}

export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
  try {
    validateRequired({ projectId }, ['projectId'], 'GET_TASKS_BY_PROJECT');
    
    const tasks = await getAllTasks();
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    
    logger.dataOperation('read', 'tasks_by_project', projectId, { count: projectTasks.length });
    return projectTasks;
  } catch (error) {
    logger.dataOperation('read', 'tasks_by_project', projectId, undefined, error as Error);
    throw error;
  }
}

export async function getVisibleTasks(): Promise<Task[]> {
  try {
    const tasks = await getAllTasks();
    const visibleTasks = tasks.filter(task => task.isVisible);
    
    logger.dataOperation('read', 'visible_tasks', undefined, { count: visibleTasks.length });
    return visibleTasks;
  } catch (error) {
    logger.dataOperation('read', 'visible_tasks', undefined, undefined, error as Error);
    throw error;
  }
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  try {
    // Validate required fields (amountNeeded removed since it's auto-calculated)
    const requiredFields = ['title', 'datacoNumber', 'description', 'projectId', 'type', 'locations', 'targetCar', 'dayTime', 'priority'];
    validateRequired(task, requiredFields, 'CREATE_TASK');
    
    const tasks = await getAllTasks();
    
    // Check for duplicate DATACO number
    if (tasks.some(t => t.datacoNumber === task.datacoNumber)) {
      throw new AppError(`Task with DATACO number ${task.datacoNumber} already exists`, 409, 'CREATE_TASK');
    }
    
    // Verify project exists
    const project = await getProjectById(task.projectId);
    if (!project) {
      throw new AppError(`Project ${task.projectId} not found`, 404, 'CREATE_TASK');
    }
    
    const newTask: Task = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amountNeeded: 0, // Will be calculated from subtasks
      isVisible: task.isVisible !== undefined ? task.isVisible : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    tasks.push(newTask);
    await writeJsonFile(TASKS_FILE, { tasks });
    
    logger.dataOperation('create', 'task', newTask.id, { 
      title: newTask.title, 
      projectId: newTask.projectId 
    });
    
    return newTask;
  } catch (error) {
    logger.dataOperation('create', 'task', undefined, undefined, error as Error);
    throw error;
  }
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  try {
    validateRequired({ id }, ['id'], 'UPDATE_TASK');
    
    const tasks = await getAllTasks();
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      logger.dataOperation('update', 'task', id, { found: false });
      return null;
    }
    
    // Validate updates
    if (updates.datacoNumber) {
      const existingTask = tasks.find(t => t.datacoNumber === updates.datacoNumber && t.id !== id);
      if (existingTask) {
        throw new AppError(`Task with DATACO number ${updates.datacoNumber} already exists`, 409, 'UPDATE_TASK');
      }
    }
    
    if (updates.priority !== undefined && (updates.priority < 0 || updates.priority > 10)) {
      throw new AppError('Task priority must be between 0 and 10', 400, 'UPDATE_TASK');
    }
    
    const originalTask = { ...tasks[taskIndex] };
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString(),
    };
    
    await writeJsonFile(TASKS_FILE, { tasks });
    
    logger.dataOperation('update', 'task', id, { 
      changes: Object.keys(updates),
      title: tasks[taskIndex].title 
    });
    
    return tasks[taskIndex];
  } catch (error) {
    logger.dataOperation('update', 'task', id, undefined, error as Error);
    throw error;
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    validateRequired({ id }, ['id'], 'DELETE_TASK');
    
    const tasks = await getAllTasks();
    const initialLength = tasks.length;
    const filteredTasks = tasks.filter(task => task.id !== id);
    
    if (filteredTasks.length === initialLength) {
      logger.dataOperation('delete', 'task', id, { found: false });
      return false;
    }
    
    // Also delete related subtasks
    try {
      const subtasks = await getAllSubtasks();
      const filteredSubtasks = subtasks.filter(subtask => subtask.taskId !== id);
      await writeJsonFile(SUBTASKS_FILE, { subtasks: filteredSubtasks });
      
      logger.info(`Deleted ${subtasks.length - filteredSubtasks.length} related subtasks`, 'DELETE_TASK');
    } catch (error) {
      logger.warn('Failed to delete related subtasks', 'DELETE_TASK', { taskId: id }, error as Error);
    }
    
    await writeJsonFile(TASKS_FILE, { tasks: filteredTasks });
    
    logger.dataOperation('delete', 'task', id, { deletedSubtasks: true });
    return true;
  } catch (error) {
    logger.dataOperation('delete', 'task', id, undefined, error as Error);
    throw error;
  }
}

// Subtasks functions with enhanced error handling
export async function getAllSubtasks(): Promise<Subtask[]> {
  try {
    const data = await readJsonFile<{ subtasks: Subtask[] }>(SUBTASKS_FILE, { subtasks: [] });
    logger.dataOperation('read', 'subtasks', undefined, { count: data.subtasks.length });
    return data.subtasks;
  } catch (error) {
    logger.dataOperation('read', 'subtasks', undefined, undefined, error as Error);
    throw error;
  }
}

export async function getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
  try {
    validateRequired({ taskId }, ['taskId'], 'GET_SUBTASKS_BY_TASK');
    
    const subtasks = await getAllSubtasks();
    const taskSubtasks = subtasks.filter(subtask => subtask.taskId === taskId);
    
    logger.dataOperation('read', 'subtasks_by_task', taskId, { count: taskSubtasks.length });
    return taskSubtasks;
  } catch (error) {
    logger.dataOperation('read', 'subtasks_by_task', taskId, undefined, error as Error);
    throw error;
  }
}

export async function getSubtaskById(id: string): Promise<Subtask | null> {
  try {
    validateRequired({ id }, ['id'], 'GET_SUBTASK_BY_ID');
    
    const subtasks = await getAllSubtasks();
    const subtask = subtasks.find(subtask => subtask.id === id) || null;
    
    logger.dataOperation('read', 'subtask', id, { found: !!subtask });
    return subtask;
  } catch (error) {
    logger.dataOperation('read', 'subtask', id, undefined, error as Error);
    throw error;
  }
}

export async function createSubtask(subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subtask> {
  try {
    // Validate required fields
    const requiredFields = ['taskId', 'title', 'datacoNumber', 'type', 'amountNeeded', 'labels', 'targetCar', 'weather', 'scene'];
    validateRequired(subtask, requiredFields, 'CREATE_SUBTASK');
    
    const subtasks = await getAllSubtasks();
    
    // Check for duplicate DATACO number
    if (subtasks.some(s => s.datacoNumber === subtask.datacoNumber)) {
      throw new AppError(`Subtask with DATACO number ${subtask.datacoNumber} already exists`, 409, 'CREATE_SUBTASK');
    }
    
    // Verify parent task exists
    const parentTask = await getTaskById(subtask.taskId);
    if (!parentTask) {
      throw new AppError(`Parent task ${subtask.taskId} not found`, 404, 'CREATE_SUBTASK');
    }
    
    const newSubtask: Subtask = {
      ...subtask,
      id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    subtasks.push(newSubtask);
    await writeJsonFile(SUBTASKS_FILE, { subtasks });
    
    // Auto-update parent task amount
    await updateTaskAmount(subtask.taskId);
    
    logger.dataOperation('create', 'subtask', newSubtask.id, { 
      title: newSubtask.title,
      taskId: newSubtask.taskId 
    });
    
    return newSubtask;
  } catch (error) {
    logger.dataOperation('create', 'subtask', undefined, undefined, error as Error);
    throw error;
  }
}

export async function updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask | null> {
  try {
    validateRequired({ id }, ['id'], 'UPDATE_SUBTASK');
    
    const subtasks = await getAllSubtasks();
    const subtaskIndex = subtasks.findIndex(subtask => subtask.id === id);
    
    if (subtaskIndex === -1) {
      logger.dataOperation('update', 'subtask', id, { found: false });
      return null;
    }
    
    const oldTaskId = subtasks[subtaskIndex].taskId;
    
    // Validate updates
    if (updates.datacoNumber) {
      const existingSubtask = subtasks.find(s => s.datacoNumber === updates.datacoNumber && s.id !== id);
      if (existingSubtask) {
        throw new AppError(`Subtask with DATACO number ${updates.datacoNumber} already exists`, 409, 'UPDATE_SUBTASK');
      }
    }
    
    if (updates.taskId) {
      const parentTask = await getTaskById(updates.taskId);
      if (!parentTask) {
        throw new AppError(`Parent task ${updates.taskId} not found`, 404, 'UPDATE_SUBTASK');
      }
    }
    
    subtasks[subtaskIndex] = {
      ...subtasks[subtaskIndex],
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString(),
    };
    
    await writeJsonFile(SUBTASKS_FILE, { subtasks });
    
    // Auto-update parent task amounts
    await updateTaskAmount(oldTaskId);
    if (updates.taskId && updates.taskId !== oldTaskId) {
      await updateTaskAmount(updates.taskId);
    }
    
    logger.dataOperation('update', 'subtask', id, { 
      changes: Object.keys(updates),
      title: subtasks[subtaskIndex].title 
    });
    
    return subtasks[subtaskIndex];
  } catch (error) {
    logger.dataOperation('update', 'subtask', id, undefined, error as Error);
    throw error;
  }
}

export async function deleteSubtask(id: string): Promise<boolean> {
  try {
    validateRequired({ id }, ['id'], 'DELETE_SUBTASK');
    
    const subtasks = await getAllSubtasks();
    const subtaskToDelete = subtasks.find(subtask => subtask.id === id);
    
    if (!subtaskToDelete) {
      logger.dataOperation('delete', 'subtask', id, { found: false });
      return false;
    }
    
    const taskId = subtaskToDelete.taskId;
    const filteredSubtasks = subtasks.filter(subtask => subtask.id !== id);
    
    await writeJsonFile(SUBTASKS_FILE, { subtasks: filteredSubtasks });
    
    // Auto-update parent task amount
    await updateTaskAmount(taskId);
    
    logger.dataOperation('delete', 'subtask', id);
    return true;
  } catch (error) {
    logger.dataOperation('delete', 'subtask', id, undefined, error as Error);
    throw error;
  }
}

// Projects functions with enhanced error handling
export async function getAllProjects(): Promise<Project[]> {
  try {
    const data = await readJsonFile<{ projects: Project[] }>(PROJECTS_FILE, { projects: [] });
    logger.dataOperation('read', 'projects', undefined, { count: data.projects.length });
    return data.projects;
  } catch (error) {
    logger.dataOperation('read', 'projects', undefined, undefined, error as Error);
    throw error;
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    validateRequired({ id }, ['id'], 'GET_PROJECT_BY_ID');
    
    const projects = await getAllProjects();
    const project = projects.find(project => project.id === id) || null;
    
    logger.dataOperation('read', 'project', id, { found: !!project });
    return project;
  } catch (error) {
    logger.dataOperation('read', 'project', id, undefined, error as Error);
    throw error;
  }
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  try {
    validateRequired(project, ['name'], 'CREATE_PROJECT');
    
    const projects = await getAllProjects();
    
    // Check for duplicate name
    if (projects.some(p => p.name === project.name)) {
      throw new AppError(`Project with name "${project.name}" already exists`, 409, 'CREATE_PROJECT');
    }
    
    const newProject: Project = {
      ...project,
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    projects.push(newProject);
    await writeJsonFile(PROJECTS_FILE, { projects });
    
    logger.dataOperation('create', 'project', newProject.id, { name: newProject.name });
    return newProject;
  } catch (error) {
    logger.dataOperation('create', 'project', undefined, undefined, error as Error);
    throw error;
  }
}

// Users functions with enhanced error handling
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    validateRequired({ username }, ['username'], 'GET_USER_BY_USERNAME');
    
    const data = await readJsonFile<{ users: User[] }>(USERS_FILE, { users: [] });
    const user = data.users.find(user => user.username === username) || null;
    
    logger.dataOperation('read', 'user', username, { found: !!user });
    return user;
  } catch (error) {
    logger.dataOperation('read', 'user', username, undefined, error as Error);
    throw error;
  }
}

// Analytics functions with enhanced error handling
export async function getAnalytics(): Promise<Analytics> {
  try {
    const defaultAnalytics: Analytics = {
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
    };
    
    const data = await readJsonFile<{ analytics: Analytics }>(ANALYTICS_FILE, { analytics: defaultAnalytics });
    logger.dataOperation('read', 'analytics');
    return data.analytics;
  } catch (error) {
    logger.dataOperation('read', 'analytics', undefined, undefined, error as Error);
    throw error;
  }
}

export async function updateAnalytics(updates: Partial<Analytics>): Promise<Analytics> {
  try {
    const currentAnalytics = await getAnalytics();
    const updatedAnalytics = {
      ...currentAnalytics,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    
    await writeJsonFile(ANALYTICS_FILE, { analytics: updatedAnalytics });
    
    logger.dataOperation('update', 'analytics', undefined, { updates: Object.keys(updates) });
    return updatedAnalytics;
  } catch (error) {
    logger.dataOperation('update', 'analytics', undefined, undefined, error as Error);
    throw error;
  }
}

export async function incrementPageView(page: string, id?: string): Promise<void> {
  try {
    validateRequired({ page }, ['page'], 'INCREMENT_PAGE_VIEW');
    
    const analytics = await getAnalytics();
    
    if (page === 'homepage') {
      analytics.pageViews.homepage++;
    } else if (page === 'admin') {
      analytics.pageViews.admin++;
    } else if (page === 'projects' && id) {
      analytics.pageViews.projects[id] = (analytics.pageViews.projects[id] || 0) + 1;
    } else if (page === 'tasks' && id) {
      analytics.pageViews.tasks[id] = (analytics.pageViews.tasks[id] || 0) + 1;
    }
    
    await updateAnalytics(analytics);
    
    logger.dataOperation('increment', 'page_view', id, { page });
  } catch (error) {
    logger.dataOperation('increment', 'page_view', id, { page }, error as Error);
    throw error;
  }
}

// Settings functions with enhanced error handling
export async function getSettings(): Promise<Settings> {
  try {
    const defaultSettings: Settings = {
      appName: 'EyeTask',
      companyName: 'Mobileye',
      language: 'he',
      rtl: true,
      theme: 'light',
      version: '1.0.0',
      maintenanceMode: false,
      allowPublicAccess: true,
      realTimeUpdates: true,
      maxImageSize: 5242880,
      supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
      pagination: {
        tasksPerPage: 20,
        subtasksPerPage: 50,
      },
      lastUpdated: new Date().toISOString(),
    };
    
    const data = await readJsonFile<{ settings: Settings }>(SETTINGS_FILE, { settings: defaultSettings });
    logger.dataOperation('read', 'settings');
    return data.settings;
  } catch (error) {
    logger.dataOperation('read', 'settings', undefined, undefined, error as Error);
    throw error;
  }
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  try {
    const currentSettings = await getSettings();
    const updatedSettings = {
      ...currentSettings,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    
    await writeJsonFile(SETTINGS_FILE, { settings: updatedSettings });
    
    logger.dataOperation('update', 'settings', undefined, { updates: Object.keys(updates) });
    return updatedSettings;
  } catch (error) {
    logger.dataOperation('update', 'settings', undefined, undefined, error as Error);
    throw error;
  }
}

// Health check function
export async function healthCheck(): Promise<{ status: string; checks: Record<string, boolean> }> {
  const checks: Record<string, boolean> = {};
  
  try {
    await ensureDataDirectory();
    checks.dataDirectory = true;
  } catch {
    checks.dataDirectory = false;
  }
  
  try {
    await getAllTasks();
    checks.tasksFile = true;
  } catch {
    checks.tasksFile = false;
  }
  
  try {
    await getAllSubtasks();
    checks.subtasksFile = true;
  } catch {
    checks.subtasksFile = false;
  }
  
  try {
    await getAllProjects();
    checks.projectsFile = true;
  } catch {
    checks.projectsFile = false;
  }
  
  try {
    await getAnalytics();
    checks.analyticsFile = true;
  } catch {
    checks.analyticsFile = false;
  }
  
  try {
    await getSettings();
    checks.settingsFile = true;
  } catch {
    checks.settingsFile = false;
  }
  
  const allHealthy = Object.values(checks).every(Boolean);
  
  logger.info('Health check completed', 'HEALTH', { 
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks 
  });
  
  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks
  };
}

// Auto-calculate task amount from subtasks
export async function calculateTaskAmount(taskId: string): Promise<number> {
  try {
    const subtasks = await getSubtasksByTaskId(taskId);
    const totalAmount = subtasks.reduce((sum, subtask) => sum + subtask.amountNeeded, 0);
    logger.debug(`Calculated amount for task ${taskId}: ${totalAmount}`, 'CALC_AMOUNT');
    return totalAmount;
  } catch (error) {
    logger.error('Error calculating task amount', 'CALC_AMOUNT', { taskId }, error as Error);
    return 0;
  }
}

// Update task amount based on subtasks
export async function updateTaskAmount(taskId: string): Promise<void> {
  try {
    const calculatedAmount = await calculateTaskAmount(taskId);
    await updateTask(taskId, { amountNeeded: calculatedAmount });
    logger.info('Task amount updated', 'UPDATE_AMOUNT', { taskId, amount: calculatedAmount });
  } catch (error) {
    logger.error('Error updating task amount', 'UPDATE_AMOUNT', { taskId }, error as Error);
  }
} 