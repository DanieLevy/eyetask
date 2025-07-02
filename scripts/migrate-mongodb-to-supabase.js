import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// Supabase connection
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// MongoDB to Supabase ID mapping
const idMapping = {
  projects: new Map(),
  users: new Map(),
  tasks: new Map(),
  subtasks: new Map(),
  feedbackTickets: new Map(),
};

// Helper function to safely convert MongoDB ObjectId to string
function safeObjectIdToString(id) {
  if (!id) return null;
  return id.toString ? id.toString() : String(id);
}

// Helper function to convert MongoDB date to ISO string
function safeToISOString(date) {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') return new Date(date).toISOString();
  return null;
}

// Helper function to ensure array format
function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

// Helper function to handle description object for tasks
function parseTaskDescription(desc) {
  if (!desc) return {};
  if (typeof desc === 'string') return { main: desc };
  return {
    main: desc.main || null,
    howToExecute: desc.howToExecute || null
  };
}

async function migrateProjects(mongoDb) {
  console.log('\n📦 Migrating Projects...');
  const collection = mongoDb.collection('projects');
  const projects = await collection.find({}).toArray();
  
  for (const project of projects) {
    const mongoId = safeObjectIdToString(project._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Project already migrated: ${project.name}`);
      idMapping.projects.set(mongoId, existing.id);
      continue;
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        description: project.description || '',
        is_active: project.isActive !== undefined ? project.isActive : true,
        color: project.color || '#3B82F6',
        priority: project.priority || 1,
        client_name: project.clientName || null,
        client_email: project.clientEmail || null,
        client_phone: project.clientPhone || null,
        notes: project.notes || null,
        image: project.image || null,
        created_at: safeToISOString(project.createdAt),
        updated_at: safeToISOString(project.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating project ${project.name}:`, error);
    } else {
      console.log(`✅ Migrated project: ${project.name}`);
      idMapping.projects.set(mongoId, data.id);
    }
  }
  
  console.log(`✅ Migrated ${projects.length} projects`);
}

async function migrateUsers(mongoDb) {
  console.log('\n👥 Migrating Users...');
  const collection = mongoDb.collection('appUsers');
  const users = await collection.find({}).toArray();
  
  for (const user of users) {
    const mongoId = safeObjectIdToString(user._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ User already migrated: ${user.username}`);
      idMapping.users.set(mongoId, existing.id);
      continue;
    }
    
    // Get created_by and last_modified_by references if they exist
    const createdById = user.createdBy ? idMapping.users.get(safeObjectIdToString(user.createdBy)) : null;
    const lastModifiedById = user.lastModifiedBy ? idMapping.users.get(safeObjectIdToString(user.lastModifiedBy)) : null;
    
    const { data, error } = await supabase
      .from('app_users')
      .insert({
        username: user.username,
        email: user.email,
        password_hash: user.passwordHash,
        role: user.role,
        is_active: user.isActive !== undefined ? user.isActive : true,
        last_login: safeToISOString(user.lastLogin),
        created_by: createdById,
        last_modified_by: lastModifiedById,
        last_modified_at: safeToISOString(user.lastModifiedAt),
        created_at: safeToISOString(user.createdAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating user ${user.username}:`, error);
    } else {
      console.log(`✅ Migrated user: ${user.username}`);
      idMapping.users.set(mongoId, data.id);
    }
  }
  
  console.log(`✅ Migrated ${users.length} users`);
}

async function migrateTasks(mongoDb) {
  console.log('\n📋 Migrating Tasks...');
  const collection = mongoDb.collection('tasks');
  const tasks = await collection.find({}).toArray();
  
  for (const task of tasks) {
    const mongoId = safeObjectIdToString(task._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Task already migrated: ${task.title}`);
      idMapping.tasks.set(mongoId, existing.id);
      continue;
    }
    
    const projectId = idMapping.projects.get(safeObjectIdToString(task.projectId));
    if (!projectId) {
      console.error(`❌ Project not found for task: ${task.title}`);
      continue;
    }
    
    const description = parseTaskDescription(task.description);
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: task.title,
        subtitle: task.subtitle || null,
        images: ensureArray(task.images),
        dataco_number: task.datacoNumber,
        description: description,
        project_id: projectId,
        type: ensureArray(task.type),
        locations: ensureArray(task.locations),
        amount_needed: task.amountNeeded || null,
        target_car: ensureArray(task.targetCar),
        lidar: task.lidar || false,
        day_time: ensureArray(task.dayTime),
        priority: task.priority || 0,
        is_visible: task.isVisible !== undefined ? task.isVisible : true,
        created_at: safeToISOString(task.createdAt),
        updated_at: safeToISOString(task.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating task ${task.title}:`, error);
    } else {
      console.log(`✅ Migrated task: ${task.title}`);
      idMapping.tasks.set(mongoId, data.id);
    }
  }
  
  console.log(`✅ Migrated ${tasks.length} tasks`);
}

async function migrateSubtasks(mongoDb) {
  console.log('\n📝 Migrating Subtasks...');
  const collection = mongoDb.collection('subtasks');
  const subtasks = await collection.find({}).toArray();
  
  for (const subtask of subtasks) {
    const mongoId = safeObjectIdToString(subtask._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('subtasks')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Subtask already migrated: ${subtask.title}`);
      idMapping.subtasks.set(mongoId, existing.id);
      continue;
    }
    
    const taskId = idMapping.tasks.get(safeObjectIdToString(subtask.taskId));
    if (!taskId) {
      console.error(`❌ Task not found for subtask: ${subtask.title}`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        title: subtask.title,
        subtitle: subtask.subtitle || null,
        images: ensureArray(subtask.images),
        dataco_number: subtask.datacoNumber,
        type: subtask.type,
        amount_needed: subtask.amountNeeded || null,
        labels: ensureArray(subtask.labels),
        target_car: ensureArray(subtask.targetCar),
        weather: subtask.weather || null,
        scene: subtask.scene || null,
        day_time: ensureArray(subtask.dayTime),
        is_visible: subtask.isVisible !== undefined ? subtask.isVisible : true,
        created_at: safeToISOString(subtask.createdAt),
        updated_at: safeToISOString(subtask.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating subtask ${subtask.title}:`, error);
    } else {
      console.log(`✅ Migrated subtask: ${subtask.title}`);
      idMapping.subtasks.set(mongoId, data.id);
    }
  }
  
  console.log(`✅ Migrated ${subtasks.length} subtasks`);
}

async function migrateAnalytics(mongoDb) {
  console.log('\n📊 Migrating Analytics...');
  const collection = mongoDb.collection('analytics');
  const analytics = await collection.find({}).toArray();
  
  for (const analytic of analytics) {
    const mongoId = safeObjectIdToString(analytic._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('analytics')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Analytics already migrated`);
      continue;
    }
    
    // Convert Sets to Arrays for unique visitors
    const uniqueVisitors = {
      total: analytic.uniqueVisitors?.total || 0,
      today: Array.from(analytic.uniqueVisitors?.today || []),
      last7Days: Array.from(analytic.uniqueVisitors?.last7Days || []),
      last30Days: Array.from(analytic.uniqueVisitors?.last30Days || [])
    };
    
    const { data, error } = await supabase
      .from('analytics')
      .insert({
        visits: analytic.visits || { total: 0, today: 0, last7Days: 0, last30Days: 0 },
        unique_visitors: uniqueVisitors,
        daily_stats: analytic.dailyStats || {},
        counters: analytic.counters || { projects: 0, tasks: 0, subtasks: 0, users: 0, activeUsers: 0 },
        last_updated: safeToISOString(analytic.lastUpdated),
        created_at: safeToISOString(analytic.createdAt),
        updated_at: safeToISOString(analytic.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating analytics:`, error);
    } else {
      console.log(`✅ Migrated analytics`);
    }
  }
  
  console.log(`✅ Migrated ${analytics.length} analytics records`);
}

async function migrateDailyUpdates(mongoDb) {
  console.log('\n📅 Migrating Daily Updates...');
  const collection = mongoDb.collection('dailyUpdates');
  const updates = await collection.find({}).toArray();
  
  for (const update of updates) {
    const mongoId = safeObjectIdToString(update._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('daily_updates')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Daily update already migrated: ${update.title}`);
      continue;
    }
    
    const projectId = update.projectId ? idMapping.projects.get(safeObjectIdToString(update.projectId)) : null;
    const createdById = update.createdBy ? idMapping.users.get(safeObjectIdToString(update.createdBy)) : null;
    
    const { data, error } = await supabase
      .from('daily_updates')
      .insert({
        title: update.title,
        content: update.content,
        type: update.type || 'info',
        priority: update.priority || 0,
        duration_type: update.durationType || null,
        duration_value: update.durationValue || null,
        expires_at: safeToISOString(update.expiresAt),
        is_active: update.isActive !== undefined ? update.isActive : true,
        is_pinned: update.isPinned || false,
        is_hidden: update.isHidden || false,
        target_audience: ensureArray(update.targetAudience),
        project_id: projectId,
        is_general: update.isGeneral || false,
        created_by: createdById,
        created_at: safeToISOString(update.createdAt),
        updated_at: safeToISOString(update.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating daily update ${update.title}:`, error);
    } else {
      console.log(`✅ Migrated daily update: ${update.title}`);
    }
  }
  
  console.log(`✅ Migrated ${updates.length} daily updates`);
}

async function migrateDailyUpdateSettings(mongoDb) {
  console.log('\n⚙️ Migrating Daily Update Settings...');
  const collection = mongoDb.collection('dailyUpdatesSettings');
  const settings = await collection.find({}).toArray();
  
  for (const setting of settings) {
    const mongoId = safeObjectIdToString(setting._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('daily_update_settings')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Setting already migrated: ${setting.key}`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('daily_update_settings')
      .insert({
        key: setting.key,
        value: setting.value,
        created_at: safeToISOString(setting.createdAt),
        updated_at: safeToISOString(setting.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating setting ${setting.key}:`, error);
    } else {
      console.log(`✅ Migrated setting: ${setting.key}`);
    }
  }
  
  console.log(`✅ Migrated ${settings.length} settings`);
}

async function migrateUserSessions(mongoDb) {
  console.log('\n🔐 Migrating User Sessions...');
  const collection = mongoDb.collection('userSessions');
  const sessions = await collection.find({}).toArray();
  
  for (const session of sessions) {
    const mongoId = safeObjectIdToString(session._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Session already migrated for user: ${session.username}`);
      continue;
    }
    
    const userId = session.userId ? idMapping.users.get(safeObjectIdToString(session.userId)) : null;
    
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        username: session.username,
        email: session.email,
        role: session.role,
        session_start: safeToISOString(session.sessionStart),
        session_end: safeToISOString(session.sessionEnd),
        ip_address: session.ipAddress || null,
        user_agent: session.userAgent || null,
        actions: session.actions || 0,
        last_activity: safeToISOString(session.lastActivity),
        is_active: session.isActive || false,
        created_at: safeToISOString(session.createdAt),
        updated_at: safeToISOString(session.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating session for ${session.username}:`, error);
    } else {
      console.log(`✅ Migrated session for: ${session.username}`);
    }
  }
  
  console.log(`✅ Migrated ${sessions.length} user sessions`);
}

async function migrateActivityLogs(mongoDb) {
  console.log('\n📋 Migrating Activity Logs...');
  const collection = mongoDb.collection('activityLogs');
  const logs = await collection.find({}).toArray();
  
  for (const log of logs) {
    const mongoId = safeObjectIdToString(log._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Activity log already migrated`);
      continue;
    }
    
    const userId = log.userId ? idMapping.users.get(safeObjectIdToString(log.userId)) : null;
    
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        timestamp: safeToISOString(log.timestamp),
        user_id: userId,
        username: log.username,
        user_role: log.userRole,
        action: log.action,
        category: log.category,
        target: log.target || null,
        metadata: log.metadata || null,
        severity: log.severity || 'info',
        created_at: safeToISOString(log.createdAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating activity log:`, error);
    } else {
      console.log(`✅ Migrated activity log`);
    }
  }
  
  console.log(`✅ Migrated ${logs.length} activity logs`);
}

async function migrateFeedbackTickets(mongoDb) {
  console.log('\n🎫 Migrating Feedback Tickets...');
  const collection = mongoDb.collection('feedbackTickets');
  const tickets = await collection.find({}).toArray();
  
  for (const ticket of tickets) {
    const mongoId = safeObjectIdToString(ticket._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('feedback_tickets')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Feedback ticket already migrated: ${ticket.ticketNumber}`);
      idMapping.feedbackTickets.set(mongoId, existing.id);
      continue;
    }
    
    const assignedToId = ticket.assignedTo ? idMapping.users.get(safeObjectIdToString(ticket.assignedTo)) : null;
    
    // Map the MongoDB feedback category/priority/status to Supabase enums
    const mapCategory = (cat) => {
      const categoryMap = {
        'general_support': 'other',
        'technical_issue': 'bug',
        'feature_request': 'feature_request',
        'bug_report': 'bug',
        'task_related': 'other',
        'subtask_related': 'other',
        'project_related': 'other',
        'account_help': 'other',
        'feedback': 'other',
        'complaint': 'other',
        'suggestion': 'improvement'
      };
      return categoryMap[cat] || 'other';
    };
    
    const mapPriority = (priority) => {
      const priorityMap = {
        'low': 'low',
        'normal': 'medium',
        'high': 'high',
        'urgent': 'urgent',
        'critical': 'urgent'
      };
      return priorityMap[priority] || 'medium';
    };
    
    const mapStatus = (status) => {
      const statusMap = {
        'new': 'new',
        'assigned': 'in_progress',
        'in_progress': 'in_progress',
        'pending_user': 'in_progress',
        'resolved': 'resolved',
        'closed': 'closed',
        'cancelled': 'closed'
      };
      return statusMap[status] || 'new';
    };
    
    const { data, error } = await supabase
      .from('feedback_tickets')
      .insert({
        ticket_number: ticket.ticketNumber,
        user_name: ticket.userName,
        user_email: ticket.userEmail || null,
        user_phone: ticket.userPhone || null,
        title: ticket.title,
        description: ticket.description,
        category: mapCategory(ticket.category),
        priority: mapPriority(ticket.priority),
        issue_type: ticket.issueType || null,
        related_to: ticket.relatedTo || null,
        status: mapStatus(ticket.status),
        assigned_to: assignedToId,
        tags: ensureArray(ticket.tags),
        resolved_at: safeToISOString(ticket.resolvedAt),
        closed_at: safeToISOString(ticket.closedAt),
        user_agent: ticket.userAgent || null,
        ip_address: ticket.ipAddress || null,
        browser_info: ticket.browserInfo || null,
        is_urgent: ticket.isUrgent || false,
        customer_satisfaction: ticket.customerSatisfaction || null,
        created_at: safeToISOString(ticket.createdAt),
        updated_at: safeToISOString(ticket.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating feedback ticket ${ticket.ticketNumber}:`, error);
    } else {
      console.log(`✅ Migrated feedback ticket: ${ticket.ticketNumber}`);
      idMapping.feedbackTickets.set(mongoId, data.id);
      
      // Migrate responses and internal notes for this ticket
      if (ticket.responses && ticket.responses.length > 0) {
        await migrateFeedbackResponses(ticket.responses, data.id);
      }
      
      if (ticket.internalNotes && ticket.internalNotes.length > 0) {
        await migrateFeedbackInternalNotes(ticket.internalNotes, data.id);
      }
    }
  }
  
  console.log(`✅ Migrated ${tickets.length} feedback tickets`);
}

async function migrateFeedbackResponses(responses, ticketId) {
  for (const response of responses) {
    const authorId = response.authorId ? idMapping.users.get(safeObjectIdToString(response.authorId)) : null;
    
    const { error } = await supabase
      .from('feedback_responses')
      .insert({
        ticket_id: ticketId,
        response_id: response.responseId,
        author_type: response.authorType,
        author_name: response.authorName,
        author_id: authorId,
        content: response.content,
        is_public: response.isPublic !== undefined ? response.isPublic : true,
        attachments: ensureArray(response.attachments),
        edited_at: safeToISOString(response.editedAt),
        created_at: safeToISOString(response.createdAt)
      });
    
    if (error) {
      console.error(`❌ Error migrating feedback response:`, error);
    }
  }
}

async function migrateFeedbackInternalNotes(notes, ticketId) {
  for (const note of notes) {
    const authorId = idMapping.users.get(safeObjectIdToString(note.authorId));
    
    if (!authorId) {
      console.error(`❌ Author not found for internal note`);
      continue;
    }
    
    const { error } = await supabase
      .from('feedback_internal_notes')
      .insert({
        ticket_id: ticketId,
        note_id: note.noteId,
        author_name: note.authorName,
        author_id: authorId,
        content: note.content,
        edited_at: safeToISOString(note.editedAt),
        created_at: safeToISOString(note.createdAt)
      });
    
    if (error) {
      console.error(`❌ Error migrating internal note:`, error);
    }
  }
}

async function migratePushSubscriptions(mongoDb) {
  console.log('\n🔔 Migrating Push Subscriptions...');
  const collection = mongoDb.collection('pushSubscriptions');
  const subscriptions = await collection.find({}).toArray();
  
  for (const sub of subscriptions) {
    const mongoId = safeObjectIdToString(sub._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Push subscription already migrated for: ${sub.username}`);
      continue;
    }
    
    const userId = sub.userId ? idMapping.users.get(safeObjectIdToString(sub.userId)) : null;
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        username: sub.username,
        email: sub.email || null,
        role: sub.role || null,
        subscription: sub.subscription,
        user_agent: sub.userAgent || null,
        device_type: sub.deviceType || null,
        last_active: safeToISOString(sub.lastActive),
        is_active: sub.isActive !== undefined ? sub.isActive : true,
        created_at: safeToISOString(sub.createdAt),
        updated_at: safeToISOString(sub.updatedAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating push subscription for ${sub.username}:`, error);
    } else {
      console.log(`✅ Migrated push subscription for: ${sub.username}`);
    }
  }
  
  console.log(`✅ Migrated ${subscriptions.length} push subscriptions`);
}

async function migratePushNotifications(mongoDb) {
  console.log('\n📨 Migrating Push Notifications...');
  const collection = mongoDb.collection('pushNotifications');
  const notifications = await collection.find({}).toArray();
  
  for (const notif of notifications) {
    const mongoId = safeObjectIdToString(notif._id);
    
    // Check if already migrated
    const { data: existing } = await supabase
      .from('push_notifications')
      .select('id')
      .eq('mongodb_id', mongoId)
      .single();
    
    if (existing) {
      console.log(`✅ Push notification already migrated: ${notif.title}`);
      continue;
    }
    
    const sentById = notif.sentBy ? idMapping.users.get(safeObjectIdToString(notif.sentBy)) : null;
    
    // Convert target users to UUID array
    const targetUsers = notif.targetUsers ? 
      notif.targetUsers.map(userId => idMapping.users.get(safeObjectIdToString(userId))).filter(Boolean) : 
      null;
    
    const { data, error } = await supabase
      .from('push_notifications')
      .insert({
        title: notif.title,
        body: notif.body,
        icon: notif.icon || null,
        badge: notif.badge || null,
        image: notif.image || null,
        url: notif.url || null,
        tag: notif.tag || null,
        require_interaction: notif.requireInteraction || false,
        target_roles: ensureArray(notif.targetRoles),
        target_users: targetUsers,
        sent_by: sentById,
        sent_at: safeToISOString(notif.sentAt),
        delivery_stats: notif.deliveryStats || {
          sent: 0,
          delivered: 0,
          failed: 0,
          clicked: 0
        },
        status: notif.status || 'pending',
        created_at: safeToISOString(notif.createdAt),
        mongodb_id: mongoId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error migrating push notification ${notif.title}:`, error);
    } else {
      console.log(`✅ Migrated push notification: ${notif.title}`);
    }
  }
  
  console.log(`✅ Migrated ${notifications.length} push notifications`);
}

async function main() {
  console.log('🚀 Starting MongoDB to Supabase migration...\n');
  
  const mongoClient = new MongoClient(MONGODB_URI);
  
  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    
    const mongoDb = mongoClient.db(MONGODB_DB_NAME);
    
    // Test Supabase connection
    const { data, error } = await supabase.from('projects').select('count').single();
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    console.log('✅ Connected to Supabase\n');
    
    // Migrate in order of dependencies
    await migrateUsers(mongoDb);
    await migrateProjects(mongoDb);
    await migrateTasks(mongoDb);
    await migrateSubtasks(mongoDb);
    await migrateAnalytics(mongoDb);
    await migrateDailyUpdates(mongoDb);
    await migrateDailyUpdateSettings(mongoDb);
    await migrateUserSessions(mongoDb);
    await migrateActivityLogs(mongoDb);
    await migrateFeedbackTickets(mongoDb);
    await migratePushSubscriptions(mongoDb);
    await migratePushNotifications(mongoDb);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Projects: ${idMapping.projects.size} migrated`);
    console.log(`   - Users: ${idMapping.users.size} migrated`);
    console.log(`   - Tasks: ${idMapping.tasks.size} migrated`);
    console.log(`   - Subtasks: ${idMapping.subtasks.size} migrated`);
    console.log(`   - Feedback Tickets: ${idMapping.feedbackTickets.size} migrated`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
    console.log('\n👋 Closed MongoDB connection');
  }
}

// Run the migration
main().catch(console.error); 