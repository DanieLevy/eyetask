// Supabase to MongoDB Migration Script
// This script helps migrate data from your Supabase database to MongoDB

const { createClient } = require('@supabase/supabase-js');
const DriversHubDB = require('./mongodb-helper');

// Supabase configuration
const SUPABASE_URL = 'https://gpgenilthxcpiwcpipns.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key'; // Get this from Supabase dashboard

class SupabaseToMongoMigration {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.mongodb = new DriversHubDB();
    this.migrationLog = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.migrationLog.push(logEntry);
    
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : '📋';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async connect() {
    try {
      await this.mongodb.connect();
      this.log('Connected to MongoDB', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to connect to MongoDB: ${error.message}`, 'error');
      return false;
    }
  }

  async disconnect() {
    await this.mongodb.disconnect();
    this.log('Disconnected from MongoDB', 'info');
  }

  // Transform Supabase data to MongoDB format
  transformProject(supabaseProject) {
    return {
      name: supabaseProject.name,
      description: supabaseProject.description,
      createdAt: new Date(supabaseProject.created_at),
      updatedAt: new Date(supabaseProject.updated_at)
    };
  }

  transformTask(supabaseTask, projectMapping) {
    return {
      title: supabaseTask.title,
      subtitle: supabaseTask.subtitle,
      datacoNumber: supabaseTask.dataco_number,
      description: supabaseTask.description,
      projectId: projectMapping[supabaseTask.project_id],
      type: supabaseTask.type || [],
      locations: supabaseTask.locations || [],
      amountNeeded: supabaseTask.amount_needed || 0,
      targetCar: supabaseTask.target_car || [],
      lidar: supabaseTask.lidar || false,
      dayTime: supabaseTask.day_time || [],
      priority: supabaseTask.priority || 0,
      isVisible: supabaseTask.is_visible !== false,
      createdAt: new Date(supabaseTask.created_at),
      updatedAt: new Date(supabaseTask.updated_at)
    };
  }

  transformSubtask(supabaseSubtask, taskMapping) {
    return {
      taskId: taskMapping[supabaseSubtask.task_id],
      title: supabaseSubtask.title,
      subtitle: supabaseSubtask.subtitle,
      image: supabaseSubtask.image,
      datacoNumber: supabaseSubtask.dataco_number,
      type: supabaseSubtask.type,
      amountNeeded: supabaseSubtask.amount_needed || 0,
      labels: supabaseSubtask.labels || [],
      targetCar: supabaseSubtask.target_car || [],
      weather: supabaseSubtask.weather,
      scene: supabaseSubtask.scene,
      createdAt: new Date(supabaseSubtask.created_at),
      updatedAt: new Date(supabaseSubtask.updated_at)
    };
  }

  transformUser(supabaseUser) {
    return {
      username: supabaseUser.username,
      email: supabaseUser.email,
      passwordHash: supabaseUser.password_hash,
      role: supabaseUser.role || 'admin',
      createdAt: new Date(supabaseUser.created_at),
      lastLogin: supabaseUser.last_login ? new Date(supabaseUser.last_login) : null
    };
  }

  transformAnalytics(supabaseAnalytics) {
    return {
      totalVisits: supabaseAnalytics.total_visits || 0,
      uniqueVisitors: supabaseAnalytics.unique_visitors || 0,
      dailyStats: supabaseAnalytics.daily_stats || {},
      pageViews: supabaseAnalytics.page_views || {
        admin: 0,
        tasks: {},
        homepage: 0,
        projects: {}
      },
      lastUpdated: new Date(supabaseAnalytics.last_updated)
    };
  }

  transformDailyUpdate(supabaseDailyUpdate, userMapping) {
    return {
      title: supabaseDailyUpdate.title,
      content: supabaseDailyUpdate.content,
      type: supabaseDailyUpdate.type || 'info',
      priority: supabaseDailyUpdate.priority || 5,
      durationType: supabaseDailyUpdate.duration_type || 'hours',
      durationValue: supabaseDailyUpdate.duration_value || 24,
      expiresAt: supabaseDailyUpdate.expires_at ? new Date(supabaseDailyUpdate.expires_at) : null,
      isActive: supabaseDailyUpdate.is_active !== false,
      isPinned: supabaseDailyUpdate.is_pinned === true,
      targetAudience: supabaseDailyUpdate.target_audience || [],
      createdBy: supabaseDailyUpdate.created_by ? userMapping[supabaseDailyUpdate.created_by] : null,
      createdAt: new Date(supabaseDailyUpdate.created_at),
      updatedAt: new Date(supabaseDailyUpdate.updated_at)
    };
  }

  transformDailyUpdateSettings(supabaseSettings) {
    return {
      key: supabaseSettings.key,
      value: supabaseSettings.value,
      createdAt: new Date(supabaseSettings.created_at),
      updatedAt: new Date(supabaseSettings.updated_at)
    };
  }

  async migrateProjects() {
    try {
      this.log('Starting projects migration...');
      
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('*');

      if (error) throw error;

      const projectMapping = {};
      
      for (const project of projects) {
        const transformedProject = this.transformProject(project);
        const mongoId = await this.mongodb.createProject(transformedProject);
        projectMapping[project.id] = mongoId;
      }

      this.log(`Migrated ${projects.length} projects`, 'success');
      return projectMapping;
    } catch (error) {
      this.log(`Projects migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateTasks(projectMapping) {
    try {
      this.log('Starting tasks migration...');
      
      const { data: tasks, error } = await this.supabase
        .from('tasks')
        .select('*');

      if (error) throw error;

      const taskMapping = {};
      
      for (const task of tasks) {
        const transformedTask = this.transformTask(task, projectMapping);
        const mongoId = await this.mongodb.createTask(transformedTask);
        taskMapping[task.id] = mongoId;
      }

      this.log(`Migrated ${tasks.length} tasks`, 'success');
      return taskMapping;
    } catch (error) {
      this.log(`Tasks migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateSubtasks(taskMapping) {
    try {
      this.log('Starting subtasks migration...');
      
      const { data: subtasks, error } = await this.supabase
        .from('subtasks')
        .select('*');

      if (error) throw error;

      for (const subtask of subtasks) {
        const transformedSubtask = this.transformSubtask(subtask, taskMapping);
        await this.mongodb.createSubtask(transformedSubtask);
      }

      this.log(`Migrated ${subtasks.length} subtasks`, 'success');
    } catch (error) {
      this.log(`Subtasks migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateUsers() {
    try {
      this.log('Starting users migration...');
      
      const { data: users, error } = await this.supabase
        .from('app_users')
        .select('*');

      if (error) throw error;

      const userMapping = {};
      
      for (const user of users) {
        const transformedUser = this.transformUser(user);
        const mongoId = await this.mongodb.createUser(transformedUser);
        userMapping[user.id] = mongoId;
      }

      this.log(`Migrated ${users.length} users`, 'success');
      return userMapping;
    } catch (error) {
      this.log(`Users migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateAnalytics() {
    try {
      this.log('Starting analytics migration...');
      
      const { data: analytics, error } = await this.supabase
        .from('analytics')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (analytics) {
        const transformedAnalytics = this.transformAnalytics(analytics);
        await this.mongodb.updateAnalytics(transformedAnalytics);
        this.log('Migrated analytics data', 'success');
      } else {
        this.log('No analytics data found', 'info');
      }
    } catch (error) {
      this.log(`Analytics migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateDailyUpdates(userMapping) {
    try {
      this.log('Starting daily updates migration...');
      
      const { data: updates, error } = await this.supabase
        .from('daily_updates')
        .select('*');

      if (error) throw error;

      for (const update of updates) {
        const transformedUpdate = this.transformDailyUpdate(update, userMapping);
        await this.mongodb.createDailyUpdate(transformedUpdate);
      }

      this.log(`Migrated ${updates.length} daily updates`, 'success');
    } catch (error) {
      this.log(`Daily updates migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateDailyUpdatesSettings() {
    try {
      this.log('Starting daily updates settings migration...');
      
      const { data: settings, error } = await this.supabase
        .from('daily_updates_settings')
        .select('*');

      if (error) throw error;

      for (const setting of settings) {
        const transformedSetting = this.transformDailyUpdateSettings(setting);
        await this.mongodb.db.collection('dailyUpdatesSettings').insertOne(transformedSetting);
      }

      this.log(`Migrated ${settings.length} daily update settings`, 'success');
    } catch (error) {
      this.log(`Daily updates settings migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runFullMigration() {
    try {
      this.log('='.repeat(60));
      this.log('Starting Supabase to MongoDB Migration');
      this.log('='.repeat(60));

      // Connect to MongoDB
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Failed to connect to MongoDB');
      }

      // Run migrations in order (respecting foreign key relationships)
      const projectMapping = await this.migrateProjects();
      const userMapping = await this.migrateUsers();
      const taskMapping = await this.migrateTasks(projectMapping);
      await this.migrateSubtasks(taskMapping);
      await this.migrateAnalytics();
      await this.migrateDailyUpdates(userMapping);
      await this.migrateDailyUpdatesSettings();

      this.log('='.repeat(60));
      this.log('Migration completed successfully!', 'success');
      this.log('='.repeat(60));

      // Show final statistics
      const stats = await this.mongodb.getCollectionStats();
      this.log('Final Collection Statistics:');
      Object.entries(stats).forEach(([collection, count]) => {
        this.log(`  ${collection}: ${count} documents`);
      });

    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async saveMigrationLog() {
    const fs = require('fs');
    const logFileName = `migration-log-${new Date().toISOString().split('T')[0]}.json`;
    
    try {
      fs.writeFileSync(logFileName, JSON.stringify(this.migrationLog, null, 2));
      this.log(`Migration log saved to ${logFileName}`, 'success');
    } catch (error) {
      this.log(`Failed to save migration log: ${error.message}`, 'error');
    }
  }
}

// Usage example
async function runMigration() {
  const migration = new SupabaseToMongoMigration();
  
  try {
    await migration.runFullMigration();
    await migration.saveMigrationLog();
  } catch (error) {
    console.error('Migration failed:', error);
    await migration.saveMigrationLog();
    process.exit(1);
  }
}

// Export for use as module
module.exports = SupabaseToMongoMigration;

// Uncomment to run migration
// runMigration(); 