import { promises as fs } from 'fs';
import path from 'path';

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
  project: string;
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
  weather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
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

// Generic read function
async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    throw new Error(`Failed to read data from ${filePath}`);
  }
}

// Generic write function
async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw new Error(`Failed to write data to ${filePath}`);
  }
}

// Tasks functions
export async function getAllTasks(): Promise<Task[]> {
  const data = await readJsonFile<{ tasks: Task[] }>(TASKS_FILE);
  return data.tasks;
}

export async function getTaskById(id: string): Promise<Task | null> {
  const tasks = await getAllTasks();
  return tasks.find(task => task.id === id) || null;
}

export async function getVisibleTasks(): Promise<Task[]> {
  const tasks = await getAllTasks();
  return tasks.filter(task => task.isVisible);
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const tasks = await getAllTasks();
  const newTask: Task = {
    ...task,
    id: `task_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  tasks.push(newTask);
  await writeJsonFile(TASKS_FILE, { tasks });
  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = await getAllTasks();
  const taskIndex = tasks.findIndex(task => task.id === id);
  
  if (taskIndex === -1) return null;
  
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await writeJsonFile(TASKS_FILE, { tasks });
  return tasks[taskIndex];
}

export async function deleteTask(id: string): Promise<boolean> {
  const tasks = await getAllTasks();
  const filteredTasks = tasks.filter(task => task.id !== id);
  
  if (filteredTasks.length === tasks.length) return false;
  
  await writeJsonFile(TASKS_FILE, { tasks: filteredTasks });
  return true;
}

// Subtasks functions
export async function getAllSubtasks(): Promise<Subtask[]> {
  const data = await readJsonFile<{ subtasks: Subtask[] }>(SUBTASKS_FILE);
  return data.subtasks;
}

export async function getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
  const subtasks = await getAllSubtasks();
  return subtasks.filter(subtask => subtask.taskId === taskId);
}

export async function getSubtaskById(id: string): Promise<Subtask | null> {
  const subtasks = await getAllSubtasks();
  return subtasks.find(subtask => subtask.id === id) || null;
}

export async function createSubtask(subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subtask> {
  const subtasks = await getAllSubtasks();
  const newSubtask: Subtask = {
    ...subtask,
    id: `subtask_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  subtasks.push(newSubtask);
  await writeJsonFile(SUBTASKS_FILE, { subtasks });
  return newSubtask;
}

export async function updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask | null> {
  const subtasks = await getAllSubtasks();
  const subtaskIndex = subtasks.findIndex(subtask => subtask.id === id);
  
  if (subtaskIndex === -1) return null;
  
  subtasks[subtaskIndex] = {
    ...subtasks[subtaskIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await writeJsonFile(SUBTASKS_FILE, { subtasks });
  return subtasks[subtaskIndex];
}

export async function deleteSubtask(id: string): Promise<boolean> {
  const subtasks = await getAllSubtasks();
  const filteredSubtasks = subtasks.filter(subtask => subtask.id !== id);
  
  if (filteredSubtasks.length === subtasks.length) return false;
  
  await writeJsonFile(SUBTASKS_FILE, { subtasks: filteredSubtasks });
  return true;
}

// Projects functions
export async function getAllProjects(): Promise<Project[]> {
  const data = await readJsonFile<{ projects: Project[] }>(PROJECTS_FILE);
  return data.projects;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await getAllProjects();
  return projects.find(project => project.id === id) || null;
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  const projects = await getAllProjects();
  const newProject: Project = {
    ...project,
    id: `project_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  projects.push(newProject);
  await writeJsonFile(PROJECTS_FILE, { projects });
  return newProject;
}

// Users functions
export async function getUserByUsername(username: string): Promise<User | null> {
  const data = await readJsonFile<{ users: User[] }>(USERS_FILE);
  return data.users.find(user => user.username === username) || null;
}

// Analytics functions
export async function getAnalytics(): Promise<Analytics> {
  const data = await readJsonFile<{ analytics: Analytics }>(ANALYTICS_FILE);
  return data.analytics;
}

export async function updateAnalytics(updates: Partial<Analytics>): Promise<Analytics> {
  const currentAnalytics = await getAnalytics();
  const updatedAnalytics = {
    ...currentAnalytics,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  
  await writeJsonFile(ANALYTICS_FILE, { analytics: updatedAnalytics });
  return updatedAnalytics;
}

export async function incrementPageView(page: string, id?: string): Promise<void> {
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
}

// Settings functions
export async function getSettings(): Promise<Settings> {
  const data = await readJsonFile<{ settings: Settings }>(SETTINGS_FILE);
  return data.settings;
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const currentSettings = await getSettings();
  const updatedSettings = {
    ...currentSettings,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  
  await writeJsonFile(SETTINGS_FILE, { settings: updatedSettings });
  return updatedSettings;
} 