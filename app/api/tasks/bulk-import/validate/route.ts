import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

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

// Validate the JSON structure
function validateJiraData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid JSON data structure');
    return { valid: false, errors };
  }
  
  if (!Array.isArray(data.parent_issues)) {
    errors.push('Missing or invalid parent_issues array');
    return { valid: false, errors };
  }
  
  data.parent_issues.forEach((parent: any, parentIndex: number) => {
    if (!parent.key) {
      errors.push(`Parent issue at index ${parentIndex} is missing a key (DATACO number)`);
    }
    
    if (!Array.isArray(parent.subtasks)) {
      errors.push(`Parent issue ${parent.key || `at index ${parentIndex}`} is missing subtasks array`);
    } else {
      parent.subtasks.forEach((subtask: any, subtaskIndex: number) => {
        // Check required fields
        if (!subtask.dataco_number) {
          errors.push(`Subtask at index ${subtaskIndex} of parent ${parent.key || `at index ${parentIndex}`} is missing dataco_number`);
        }
        
        if (!subtask.summary) {
          errors.push(`Subtask ${subtask.dataco_number || `at index ${subtaskIndex}`} is missing summary`);
        }
        
        if (!subtask.issue_type) {
          errors.push(`Subtask ${subtask.dataco_number || `at index ${subtaskIndex}`} is missing issue_type`);
        } else if (subtask.issue_type !== 'Events' && subtask.issue_type !== 'Hours') {
          errors.push(`Subtask ${subtask.dataco_number} has invalid issue_type: ${subtask.issue_type}. Must be "Events" or "Hours"`);
        }
        
        if (subtask.amount_needed === undefined || subtask.amount_needed === null) {
          errors.push(`Subtask ${subtask.dataco_number || `at index ${subtaskIndex}`} is missing amount_needed`);
        } else if (isNaN(Number(subtask.amount_needed)) || Number(subtask.amount_needed) <= 0) {
          errors.push(`Subtask ${subtask.dataco_number} has invalid amount_needed: ${subtask.amount_needed}. Must be a positive number`);
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
    datacoNumbers.map(async (datacoNumber) => {
      const task = await db.getTaskByDatacoNumber(datacoNumber);
      return { datacoNumber, task };
    })
  );
  
  // Check for missing tasks
  tasks.forEach(({ datacoNumber, task }, index) => {
    const originalKey = parentIssues[index].key;
    
    if (!task) {
      errors.push(`Task with DATACO number ${originalKey} not found in the system`);
    } else {
      taskMap[originalKey] = {
        id: task._id?.toString() || '',
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

// POST /api/tasks/bulk-import/validate - Validate JIRA JSON data
export async function POST(request: NextRequest) {
  let user: any;
  
  try {
    // Check authentication and admin status
    user = auth.extractUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access - Admin required', success: false },
        { status: 401 }
      );
    }
    
    // Parse the request body as JSON
    const requestBody = await request.json();
    
    // Validate the JSON structure
    const structureValidation = validateJiraData(requestBody);
    if (!structureValidation.valid) {
      return NextResponse.json({
        valid: false,
        errors: structureValidation.errors,
        success: false
      }, { status: 400 });
    }
    
    // Verify parent tasks exist in the database
    const taskVerification = await verifyParentTasks(requestBody.parent_issues);
    
    return NextResponse.json({
      valid: taskVerification.valid,
      errors: taskVerification.errors,
      taskMap: taskVerification.taskMap,
      success: true
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    logger.error('Error validating bulk import data', 'BULK_IMPORT_VALIDATE_API', { 
      userId: user?.id 
    }, error as Error);
    
    return NextResponse.json(
      { 
        valid: false,
        errors: ['Failed to validate data: ' + (error instanceof Error ? error.message : String(error))],
        success: false 
      },
      { status: 500 }
    );
  }
} 