import { getDatabase } from './database';
import { logger, AppError, validateRequired } from './logger';

// Re-export types for backwards compatibility
export type {
  Task,
  Subtask,
  Project,
  User,
  Analytics
} from './database';

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

// Get database instance
const db = getDatabase();

// Tasks functions
export async function getAllTasks() {
  try {
    const tasks = await db.getAllTasks();
    logger.dataOperation('read', 'tasks', undefined, { count: tasks.length });
    return tasks;
  } catch (error) {
    logger.dataOperation('read', 'tasks', undefined, undefined, error as Error);
    throw error;
  }
}

export async function getTaskById(id: string) {
  try {
    validateRequired({ id }, ['id'], 'GET_TASK_BY_ID');
    const task = await db.getTaskById(id);
    logger.dataOperation('read', 'task', id, { found: !!task });
    return task;
  } catch (error) {
    logger.dataOperation('read', 'task', id, undefined, error as Error);
    throw error;
  }
}

export async function getTasksByProjectId(projectId: string) {
  try {
    validateRequired({ projectId }, ['projectId'], 'GET_TASKS_BY_PROJECT');
    const allTasks = await db.getAllTasks();
    const projectTasks = allTasks.filter(task => task.projectId === projectId);
    logger.dataOperation('read', 'tasks_by_project', projectId, { count: projectTasks.length });
    return projectTasks;
  } catch (error) {
    logger.dataOperation('read', 'tasks_by_project', projectId, undefined, error as Error);
    throw error;
  }
}

export async function getVisibleTasks() {
  try {
    const allTasks = await db.getAllTasks();
    const visibleTasks = allTasks.filter(task => task.isVisible);
    logger.dataOperation('read', 'visible_tasks', undefined, { count: visibleTasks.length });
    return visibleTasks;
  } catch (error) {
    logger.dataOperation('read', 'visible_tasks', undefined, undefined, error as Error);
    throw error;
  }
}

export async function createTask(task: any) {
  try {
    // Validate required fields
    const requiredFields = ['title', 'datacoNumber', 'description', 'projectId', 'type', 'locations', 'targetCar', 'lidar', 'dayTime', 'priority'];
    validateRequired(task, requiredFields, 'CREATE_TASK');
    
    // Check for duplicate DATACO number
    const existingTasks = await db.getAllTasks();
    if (existingTasks.some(t => t.datacoNumber === task.datacoNumber)) {
      throw new AppError(`Task with DATACO number ${task.datacoNumber} already exists`, 409, 'CREATE_TASK');
    }
    
    // Verify project exists
    const project = await db.getProjectById(task.projectId);
    if (!project) {
      throw new AppError(`Project ${task.projectId} not found`, 404, 'CREATE_TASK');
    }
    
    const newTask = await db.createTask(task);
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

export async function updateTask(id: string, updates: any) {
  try {
    validateRequired({ id }, ['id'], 'UPDATE_TASK');
    
    // Validate updates
    if (updates.datacoNumber) {
      const existingTasks = await db.getAllTasks();
      const existingTask = existingTasks.find(t => t.datacoNumber === updates.datacoNumber && t.id !== id);
      if (existingTask) {
        throw new AppError(`Task with DATACO number ${updates.datacoNumber} already exists`, 409, 'UPDATE_TASK');
      }
    }
    
    if (updates.priority !== undefined && (updates.priority < 0 || updates.priority > 10)) {
      throw new AppError('Task priority must be between 0 and 10', 400, 'UPDATE_TASK');
    }
    
    const updatedTask = await db.updateTask(id, updates);
    
    if (!updatedTask) {
      logger.dataOperation('update', 'task', id, { found: false });
      return null;
    }
    
    logger.dataOperation('update', 'task', id, { 
      changes: Object.keys(updates),
      title: updatedTask.title 
    });
    
    return updatedTask;
  } catch (error) {
    logger.dataOperation('update', 'task', id, undefined, error as Error);
    throw error;
  }
}

export async function deleteTask(id: string) {
  try {
    validateRequired({ id }, ['id'], 'DELETE_TASK');
    const deleted = await db.deleteTask(id);
    logger.dataOperation('delete', 'task', id, { deletedSubtasks: true });
    return deleted;
  } catch (error) {
    logger.dataOperation('delete', 'task', id, undefined, error as Error);
    throw error;
  }
}

// Subtasks functions
export async function getAllSubtasks() {
  try {
    const subtasks = await db.getAllSubtasks();
    logger.dataOperation('read', 'subtasks', undefined, { count: subtasks.length });
    return subtasks;
  } catch (error) {
    logger.dataOperation('read', 'subtasks', undefined, undefined, error as Error);
    throw error;
  }
}

export async function getSubtasksByTaskId(taskId: string) {
  try {
    validateRequired({ taskId }, ['taskId'], 'GET_SUBTASKS_BY_TASK');
    const subtasks = await db.getSubtasksByTaskId(taskId);
    logger.dataOperation('read', 'subtasks_by_task', taskId, { count: subtasks.length });
    return subtasks;
  } catch (error) {
    logger.dataOperation('read', 'subtasks_by_task', taskId, undefined, error as Error);
    throw error;
  }
}

export async function getSubtaskById(id: string) {
  try {
    validateRequired({ id }, ['id'], 'GET_SUBTASK_BY_ID');
    const subtask = await db.getSubtaskById(id);
    logger.dataOperation('read', 'subtask', id, { found: !!subtask });
    return subtask;
  } catch (error) {
    logger.dataOperation('read', 'subtask', id, undefined, error as Error);
    throw error;
  }
}

export async function createSubtask(subtask: any) {
  try {
    // Validate required fields
    const requiredFields = ['taskId', 'title', 'datacoNumber', 'type', 'amountNeeded', 'labels', 'targetCar', 'weather', 'scene'];
    validateRequired(subtask, requiredFields, 'CREATE_SUBTASK');
    
    // Check for duplicate DATACO number
    const existingSubtasks = await db.getAllSubtasks();
    if (existingSubtasks.some(s => s.datacoNumber === subtask.datacoNumber)) {
      throw new AppError(`Subtask with DATACO number ${subtask.datacoNumber} already exists`, 409, 'CREATE_SUBTASK');
    }
    
    // Verify parent task exists
    const parentTask = await db.getTaskById(subtask.taskId);
    if (!parentTask) {
      throw new AppError(`Parent task ${subtask.taskId} not found`, 404, 'CREATE_SUBTASK');
    }
    
    const newSubtask = await db.createSubtask(subtask);
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

export async function updateSubtask(id: string, updates: any) {
  try {
    validateRequired({ id }, ['id'], 'UPDATE_SUBTASK');
    
    // Validate updates
    if (updates.datacoNumber) {
      const existingSubtasks = await db.getAllSubtasks();
      const existingSubtask = existingSubtasks.find(s => s.datacoNumber === updates.datacoNumber && s.id !== id);
      if (existingSubtask) {
        throw new AppError(`Subtask with DATACO number ${updates.datacoNumber} already exists`, 409, 'UPDATE_SUBTASK');
      }
    }
    
    if (updates.taskId) {
      const parentTask = await db.getTaskById(updates.taskId);
      if (!parentTask) {
        throw new AppError(`Parent task ${updates.taskId} not found`, 404, 'UPDATE_SUBTASK');
      }
    }
    
    const updatedSubtask = await db.updateSubtask(id, updates);
    
    if (!updatedSubtask) {
      logger.dataOperation('update', 'subtask', id, { found: false });
      return null;
    }
    
    logger.dataOperation('update', 'subtask', id, { 
      changes: Object.keys(updates),
      title: updatedSubtask.title 
    });
    
    return updatedSubtask;
  } catch (error) {
    logger.dataOperation('update', 'subtask', id, undefined, error as Error);
    throw error;
  }
}

export async function deleteSubtask(id: string) {
  try {
    validateRequired({ id }, ['id'], 'DELETE_SUBTASK');
    const deleted = await db.deleteSubtask(id);
    
    if (!deleted) {
      logger.dataOperation('delete', 'subtask', id, { found: false });
      return false;
    }
    
    logger.dataOperation('delete', 'subtask', id);
    return true;
  } catch (error) {
    logger.dataOperation('delete', 'subtask', id, undefined, error as Error);
    throw error;
  }
}

// Projects functions
export async function getAllProjects() {
  try {
    const projects = await db.getAllProjects();
    logger.dataOperation('read', 'projects', undefined, { count: projects.length });
    return projects;
  } catch (error) {
    logger.dataOperation('read', 'projects', undefined, undefined, error as Error);
    throw error;
  }
}

export async function getProjectById(id: string) {
  try {
    validateRequired({ id }, ['id'], 'GET_PROJECT_BY_ID');
    const project = await db.getProjectById(id);
    logger.dataOperation('read', 'project', id, { found: !!project });
    return project;
  } catch (error) {
    logger.dataOperation('read', 'project', id, undefined, error as Error);
    throw error;
  }
}

export async function createProject(project: any) {
  try {
    validateRequired(project, ['name'], 'CREATE_PROJECT');
    
    // Check for duplicate name
    const existingProjects = await db.getAllProjects();
    if (existingProjects.some(p => p.name === project.name)) {
      throw new AppError(`Project with name "${project.name}" already exists`, 409, 'CREATE_PROJECT');
    }
    
    const newProject = await db.createProject(project);
    logger.dataOperation('create', 'project', newProject.id, { name: newProject.name });
    return newProject;
  } catch (error) {
    logger.dataOperation('create', 'project', undefined, undefined, error as Error);
    throw error;
  }
}

export async function updateProject(id: string, updates: any) {
  try {
    validateRequired({ id }, ['id'], 'UPDATE_PROJECT');
    
    // If name is being updated, check for duplicates
    if (updates.name) {
      const existingProjects = await db.getAllProjects();
      const duplicateProject = existingProjects.find(p => p.name === updates.name && p.id !== id);
      if (duplicateProject) {
        throw new AppError(`Project with name "${updates.name}" already exists`, 409, 'UPDATE_PROJECT');
      }
    }
    
    const updatedProject = await db.updateProject(id, updates);
    if (!updatedProject) {
      throw new AppError('Project not found', 404, 'UPDATE_PROJECT');
    }
    
    logger.dataOperation('update', 'project', id, { updates: Object.keys(updates) });
    return updatedProject;
  } catch (error) {
    logger.dataOperation('update', 'project', id, undefined, error as Error);
    throw error;
  }
}

export async function deleteProject(id: string) {
  try {
    validateRequired({ id }, ['id'], 'DELETE_PROJECT');
    
    // Check if project has associated tasks
    const tasks = await db.getTasksByProjectId(id);
    if (tasks.length > 0) {
      throw new AppError('Cannot delete project with existing tasks. Please delete all tasks first.', 400, 'DELETE_PROJECT');
    }
    
    const deleted = await db.deleteProject(id);
    if (!deleted) {
      throw new AppError('Project not found', 404, 'DELETE_PROJECT');
    }
    
    logger.dataOperation('delete', 'project', id);
    return true;
  } catch (error) {
    logger.dataOperation('delete', 'project', id, undefined, error as Error);
    throw error;
  }
}

// Users functions
export async function getUserByUsername(username: string) {
  try {
    validateRequired({ username }, ['username'], 'GET_USER_BY_USERNAME');
    const user = await db.getUserByUsername(username);
    logger.dataOperation('read', 'user', username, { found: !!user });
    return user;
  } catch (error) {
    logger.dataOperation('read', 'user', username, undefined, error as Error);
    throw error;
  }
}

// Analytics functions
export async function getAnalytics() {
  try {
    const analytics = await db.getAnalytics();
    logger.dataOperation('read', 'analytics');
    return analytics;
  } catch (error) {
    logger.dataOperation('read', 'analytics', undefined, undefined, error as Error);
    throw error;
  }
}

export async function updateAnalytics(updates: any) {
  try {
    const updatedAnalytics = await db.updateAnalytics(updates);
    logger.dataOperation('update', 'analytics', undefined, { updates: Object.keys(updates) });
    return updatedAnalytics;
  } catch (error) {
    logger.dataOperation('update', 'analytics', undefined, undefined, error as Error);
    throw error;
  }
}

export async function incrementPageView(page: string, id?: string) {
  try {
    validateRequired({ page }, ['page'], 'INCREMENT_PAGE_VIEW');
    await db.incrementPageView(page, id);
    logger.dataOperation('increment', 'page_view', id, { page });
  } catch (error) {
    logger.dataOperation('increment', 'page_view', id, { page }, error as Error);
    throw error;
  }
}

// Settings functions (using in-memory defaults)
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
    
    logger.dataOperation('read', 'settings');
    return defaultSettings;
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
    await db.getAllTasks();
    checks.database = true;
  } catch {
    checks.database = false;
  }
  
  try {
    await db.getAllSubtasks();
    checks.subtasks = true;
  } catch {
    checks.subtasks = false;
  }
  
  try {
    await db.getAllProjects();
    checks.projects = true;
  } catch {
    checks.projects = false;
  }
  
  try {
    await db.getAnalytics();
    checks.analytics = true;
  } catch {
    checks.analytics = false;
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
    const subtasks = await db.getSubtasksByTaskId(taskId);
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
    await db.updateTask(taskId, { amountNeeded: calculatedAmount });
    logger.info('Task amount updated', 'UPDATE_AMOUNT', { taskId, amount: calculatedAmount });
  } catch (error) {
    logger.error('Error updating task amount', 'UPDATE_AMOUNT', { taskId }, error as Error);
  }
} 