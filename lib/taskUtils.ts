import { supabaseDb as db } from './supabase-database';
import { logger } from './logger';

// Helper function to calculate and update task amount from subtasks
export async function updateTaskAmount(taskId: string): Promise<boolean> {
  try {
    // Get all subtasks for this task
    const subtasks = await db.getSubtasksByTask(taskId);
    
    // Calculate total amount needed from subtasks
    const totalAmount = subtasks.reduce((sum, subtask) => {
      return sum + (subtask.amountNeeded || 0);
    }, 0);
    
    // Update the task with the calculated amount
    return await db.updateTask(taskId, { amountNeeded: totalAmount });
  } catch (error) {
    console.error('Error updating task amount:', error);
    return false;
  }
} 