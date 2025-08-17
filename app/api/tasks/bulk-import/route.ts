import { NextRequest, NextResponse } from 'next/server';
import { supabaseDb as db } from '@/lib/supabase-database';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { createObjectId } from '@/lib/supabase';
import { pushService } from '@/lib/services/pushNotificationService';
import { updateTaskAmount } from '@/lib/taskUtils';
import { activityLogger } from '@/lib/activityLogger';


// Define interfaces based on the JSON structure
interface JiraSubtask {
  dataco_number: string;
  summary: string;
  issue_type: string;
  amount_needed: number;
  weather: string;
  road_type: string;
  day_time: string | string[];
  labels: string[];
}

interface JiraParentIssue {
  key: string;
  title: string;
  extra_sensors?: string;
  target_car: string | string[];
  subtasks: JiraSubtask[];
}

interface JiraImportData {
  parent_issues: JiraParentIssue[];
}

// Detect if this is a calibration/stability task structure
function isCalibrationTask(parentIssue: JiraParentIssue): boolean {
  // Check if all subtasks have amount_needed = 0 and/or issue_type = "Sub Task"
  // But exclude Loops with 0 amount as those might be placeholders
  return parentIssue.subtasks.every(subtask => 
    (subtask.amount_needed === 0 && subtask.issue_type !== 'Loops') || 
    subtask.issue_type === 'Sub Task'
  );
}

// Map issue type to our system's type
function mapIssueType(issueType: string, isCalibration: boolean): 'events' | 'hours' | 'loops' {
  // For calibration tasks, default to 'events' type
  if (isCalibration || issueType === 'Sub Task') {
    return 'events';
  }
  
  // Regular mapping
  const lowerIssueType = issueType.toLowerCase();
  if (lowerIssueType === 'hours') return 'hours';
  if (lowerIssueType === 'loops') return 'loops';
  return 'events'; // Default to events
}

// Map JIRA road_type to our scene type
const roadTypeToSceneMap: Record<string, string> = {
  'Mixed': 'Mixed',
  'Highway': 'Highway',
  'Urban': 'Urban',
  'Rural': 'Rural',
  'Sub-Urban': 'Sub-Urban',
  'Test Track': 'Test Track',
  // Handle combined types
  'Rural/Sub-Urban': 'Rural', // Default to Rural for combined Rural/Sub-Urban
  'Sub-Urban/Rural': 'Rural', // Handle reverse order too
};

// Enhanced function to map road types with fallback logic
function mapRoadTypeToScene(roadType: string): string {
  // Direct mapping
  if (roadTypeToSceneMap[roadType]) {
    return roadTypeToSceneMap[roadType];
  }
  
  // Handle slash-separated combinations
  if (roadType.includes('/')) {
    const parts = roadType.split('/').map(p => p.trim());
    // Try to find the first valid part
    for (const part of parts) {
      if (roadTypeToSceneMap[part]) {
        return roadTypeToSceneMap[part];
      }
    }
  }
  
  // Default to Mixed for unrecognized types
  return 'Mixed';
}

// Map JIRA day_time to our dayTime array format
const mapDayTime = (dayTime: string | string[]): string[] => {
  // If it's already an array, return it
  if (Array.isArray(dayTime)) {
    return dayTime;
  }
  
  if (dayTime === 'Mixed') {
    return ['day', 'night', 'dusk', 'dawn'];
  }
  
  const mapping: Record<string, string> = {
    'Day': 'day',
    'Night': 'night',
    'Dusk': 'dusk',
    'Dawn': 'dawn'
  };
  
  const result = mapping[dayTime];
  return result ? [result] : [];
};

// Validate the JSON structure
function validateJiraData(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid JSON data structure');
    return { valid: false, errors };
  }
  
  if (!Array.isArray(data.parent_issues)) {
    errors.push('Missing or invalid parent_issues array');
    return { valid: false, errors };
  }
  
  data.parent_issues.forEach((parent: Record<string, unknown>, parentIndex: number) => {
    if (!parent.key) {
      errors.push(`Parent issue at index ${parentIndex} is missing a key (DATACO number)`);
    }
    
    if (!Array.isArray(parent.subtasks)) {
      errors.push(`Parent issue ${parent.key || `at index ${parentIndex}`} is missing subtasks array`);
    } else {
      // Check if this is a calibration task set
      const isCalibrationParent = (parent.subtasks as any[]).every(subtask => 
        subtask.amount_needed === 0 || subtask.issue_type === 'Sub Task'
      );
      
      parent.subtasks.forEach((subtask: Record<string, unknown>, subtaskIndex: number) => {
        // Check required fields
        if (!subtask.dataco_number) {
          errors.push(`Subtask at index ${subtaskIndex} of parent ${parent.key || `at index ${parentIndex}`} is missing dataco_number`);
        }
        
        if (!subtask.summary) {
          errors.push(`Subtask ${subtask.dataco_number || `at index ${subtaskIndex}`} is missing summary`);
        }
        
        if (!subtask.issue_type) {
          errors.push(`Subtask ${subtask.dataco_number || `at index ${subtaskIndex}`} is missing issue_type`);
        } else if (subtask.issue_type !== 'Events' && subtask.issue_type !== 'Hours' && subtask.issue_type !== 'Sub Task' && subtask.issue_type !== 'Loops') {
          errors.push(`Subtask ${subtask.dataco_number} has invalid issue_type: ${subtask.issue_type}. Must be "Events", "Hours", "Loops", or "Sub Task"`);
        }
        
        if (subtask.amount_needed === undefined || subtask.amount_needed === null) {
          errors.push(`Subtask ${subtask.dataco_number || `at index ${subtaskIndex}`} is missing amount_needed`);
        } else if (isNaN(Number(subtask.amount_needed))) {
          errors.push(`Subtask ${subtask.dataco_number} has invalid amount_needed: ${subtask.amount_needed}. Must be a number`);
        } else if (!isCalibrationParent && Number(subtask.amount_needed) <= 0) {
          // Only require positive amount for non-calibration tasks
          // Exception: Allow 0 for Loops type as they might be placeholders
          if (subtask.issue_type !== 'Loops') {
            errors.push(`Subtask ${subtask.dataco_number} has invalid amount_needed: ${subtask.amount_needed}. Must be a positive number for non-calibration tasks`);
          }
        }
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Verify that all parent tasks exist in the database
async function verifyParentTasks(parentIssues: JiraParentIssue[]): Promise<{ 
  valid: boolean; 
  errors: string[]; 
  taskMap: Record<string, { id: string; title: string }> 
}> {
  const errors: string[] = [];
  const taskMap: Record<string, { id: string; title: string }> = {};
  
  // Extract all DATACO numbers
  const datacoNumbers = parentIssues.map(issue => {
    // Remove "DATACO-" prefix if present
    return issue.key.replace(/^DATACO-/, '');
  });
  
  // Query tasks by DATACO numbers
  const tasks = await Promise.all(
    datacoNumbers.map(async (datacoNumber, index) => {
      const task = await db.getTaskByDatacoNumber(datacoNumber);
      return { originalKey: parentIssues[index].key, task };
    })
  );
  
  // Check for missing tasks
  tasks.forEach(({ originalKey, task }) => {
    if (!task) {
      errors.push(`Task with DATACO number ${originalKey} not found in the system`);
    } else {
      taskMap[originalKey] = {
        id: task._id ? task._id.toString() : '',
        title: task.title
      };
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    taskMap
  };
}

// POST /api/tasks/bulk-import - Handle bulk import from JIRA JSON
export async function POST(request: NextRequest) {
  const user = authService.extractUserFromRequest(request);
  
  try {
    // Check authentication and admin/data_manager status
    if (!user || (user.role !== 'admin' && user.role !== 'data_manager')) {
      return NextResponse.json(
        { error: 'Unauthorized access - Admin or data manager role required', success: false },
        { status: 401 }
      );
    }
    
    // Parse the request body as JSON
    const requestBody = await request.json() as Record<string, unknown>;
    
    // Validate the JSON structure
    const validationResult = validateJiraData(requestBody);
    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JIRA data structure',
        validationErrors: validationResult.errors
      }, { status: 400 });
    }
    
    // Verify parent tasks exist in the database
    const taskVerification = await verifyParentTasks(requestBody.parent_issues as JiraParentIssue[]);
    if (!taskVerification.valid) {
      return NextResponse.json({
        success: false,
        error: 'Some parent tasks not found',
        validationErrors: taskVerification.errors
      }, { status: 404 });
    }
    
    // Process each parent issue and its subtasks
    const results = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [] as { taskKey: string; subtaskKey: string; error: string }[],
      taskResults: [] as { taskKey: string; subtasksAdded: number }[]
    };
    
    for (const parentIssue of requestBody.parent_issues as JiraParentIssue[]) {
      const taskInfo = taskVerification.taskMap[parentIssue.key];
      if (!taskInfo) continue; // Skip if task not found (should be caught in verification)
      
      let subtasksAdded = 0;
      
      for (const jiraSubtask of parentIssue.subtasks) {
        results.totalProcessed++;
        
        try {
          // Normalize the DATACO number (remove prefix if present)
          const datacoNumber = jiraSubtask.dataco_number.replace(/^DATACO-/, '');
          
          // Check if subtask with this DATACO number already exists
          const existingSubtasks = await db.getSubtasksByDatacoNumber(datacoNumber);
          if (existingSubtasks && existingSubtasks.length > 0) {
            results.failed++;
            results.errors.push({
              taskKey: parentIssue.key,
              subtaskKey: jiraSubtask.dataco_number,
              error: 'Subtask with this DATACO number already exists'
            });
            continue;
          }
          
          // Detect if this is a calibration/stability task
          const isCalibration = isCalibrationTask(parentIssue);
          // Map issue type to our system's type
          const systemIssueType = mapIssueType(jiraSubtask.issue_type, isCalibration);
          
          // Convert weather to appropriate type
          const weatherValue = jiraSubtask.weather as string || 'Clear';
          let validWeather: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
          
          // Map unknown weather to Mixed
          if (weatherValue === 'Unknown' || weatherValue === 'unknown') {
            validWeather = 'Mixed';
            logger.info('Mapping Unknown weather to Mixed', 'BULK_IMPORT_API', {
              subtask: jiraSubtask.dataco_number,
              originalWeather: weatherValue
            });
          } else if (['Clear', 'Fog', 'Overcast', 'Rain', 'Snow', 'Mixed'].includes(weatherValue)) {
            validWeather = weatherValue as 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
          } else {
            validWeather = 'Clear'; // Default fallback
          }
            
          // Convert scene to appropriate type
          const sceneValue = mapRoadTypeToScene(jiraSubtask.road_type as string);
          
          // Log combined road types
          if (jiraSubtask.road_type && (jiraSubtask.road_type as string).includes('/')) {
            logger.info('Mapping combined road type', 'BULK_IMPORT_API', {
              subtask: jiraSubtask.dataco_number,
              originalRoadType: jiraSubtask.road_type,
              mappedScene: sceneValue
            });
          }
          const validScene = ['Highway', 'Urban', 'Rural', 'Sub-Urban', 'Test Track', 'Mixed'].includes(sceneValue)
            ? sceneValue as 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed'
            : 'Mixed';
          
          // Map fields to our system format
          const subtaskData = {
            title: jiraSubtask.summary as string,
            subtitle: '',
            datacoNumber: datacoNumber,
            type: systemIssueType,
            amountNeeded: Number(jiraSubtask.amount_needed),
            labels: jiraSubtask.labels as string[] || [],
            targetCar: Array.isArray(parentIssue.target_car) ? parentIssue.target_car : [parentIssue.target_car as string],
            weather: validWeather,
            scene: validScene,
            dayTime: mapDayTime(jiraSubtask.day_time),
            taskId: createObjectId(taskInfo.id)
          };
          
          // Add calibration-specific labels if this is a calibration task
          if (isCalibration) {
            // Add calibration label if not already present
            if (!subtaskData.labels.includes('calibration')) {
              subtaskData.labels.push('calibration');
            }
            // Add stability label if not already present
            if (!subtaskData.labels.includes('stability')) {
              subtaskData.labels.push('stability');
            }
            
            // Add specific type labels based on the summary
            const summaryLower = jiraSubtask.summary.toLowerCase();
            if (summaryLower.includes('setup approval')) {
              subtaskData.labels.push('setup-approval');
            } else if (summaryLower.includes('calibration approval')) {
              subtaskData.labels.push('calibration-approval');
            } else if (summaryLower.includes('di validations')) {
              subtaskData.labels.push('di-validation');
            } else if (summaryLower.includes('gt approval')) {
              subtaskData.labels.push('gt-approval');
            } else if (summaryLower.includes('c2l approval')) {
              subtaskData.labels.push('c2l-approval');
            }
          }
          
          // Create the subtask
          const subtaskId = await db.createSubtask(subtaskData);
          
          // Log the activity
          await activityLogger.logSubtaskActivity(
            'created',
            subtaskId,
            subtaskData.title,
            taskInfo.id,
            user?.id,
            'admin'
          );
          
          results.successful++;
          subtasksAdded++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            taskKey: parentIssue.key,
            subtaskKey: jiraSubtask.dataco_number,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Update task amount after adding all subtasks
      await updateTaskAmount(taskInfo.id);
      
      results.taskResults.push({
        taskKey: parentIssue.key,
        subtasksAdded
      });
    }
    
    // Log the bulk import activity
    logger.info('Bulk import from JIRA completed', 'BULK_IMPORT_API', {
      totalProcessed: results.totalProcessed,
      successful: results.successful,
      failed: results.failed,
      userId: user?.id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Bulk import completed',
      results,
      timestamp: new Date().toISOString()
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    logger.error('Error during bulk import', 'BULK_IMPORT_API', { 
      userId: user?.id 
    }, error as Error);
    
    return NextResponse.json(
      { error: 'Failed to process bulk import', success: false },
      { status: 500 }
    );
  }
} 
