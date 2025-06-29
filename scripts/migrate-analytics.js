const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function migrateAnalytics() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    
    // Step 1: Backup old analytics data (optional)
    console.log('Backing up old analytics data...');
    const analytics = db.collection('analytics');
    const oldData = await analytics.findOne({});
    if (oldData) {
      await db.collection('analytics_backup').insertOne({
        ...oldData,
        backupDate: new Date()
      });
      console.log('Old analytics data backed up');
    }

    // Step 2: Clear old analytics collection
    console.log('Clearing old analytics collection...');
    await analytics.deleteMany({});

    // Step 3: Initialize new analytics structure
    console.log('Initializing new analytics structure...');
    const newAnalytics = {
      visits: {
        total: 0,
        today: 0,
        last7Days: 0,
        last30Days: 0
      },
      uniqueVisitors: {
        total: 0,
        today: [],
        last7Days: [],
        last30Days: []
      },
      dailyStats: {},
      counters: {
        projects: await db.collection('projects').countDocuments({}),
        tasks: await db.collection('tasks').countDocuments({}),
        subtasks: await db.collection('subtasks').countDocuments({}),
        users: await db.collection('appUsers').countDocuments({}),
        activeUsers: 0
      },
      lastUpdated: new Date()
    };

    await analytics.insertOne(newAnalytics);
    console.log('New analytics structure initialized');

    // Step 4: Create indexes for new collections
    console.log('Creating indexes...');
    
    // User sessions indexes
    await db.collection('userSessions').createIndex({ userId: 1 });
    await db.collection('userSessions').createIndex({ isActive: 1 });
    await db.collection('userSessions').createIndex({ lastActivity: -1 });

    // Activity logs indexes
    await db.collection('activityLogs').createIndex({ timestamp: -1 });
    await db.collection('activityLogs').createIndex({ userId: 1 });
    await db.collection('activityLogs').createIndex({ category: 1 });
    await db.collection('activityLogs').createIndex({ 'target.id': 1 });

    console.log('Indexes created successfully');

    // Step 5: Migrate existing activities to new format
    console.log('Migrating existing activities...');
    const activities = db.collection('activities');
    const existingActivities = await activities.find({}).toArray();
    
    if (existingActivities.length > 0) {
      const activityLogs = db.collection('activityLogs');
      const migratedActivities = existingActivities.map(activity => ({
        timestamp: activity.timestamp || new Date(),
        userId: activity.userId?.toString() || 'unknown',
        username: activity.userType === 'system' ? 'System' : 'Unknown',
        userRole: activity.userType || 'user',
        action: activity.action || 'Unknown action',
        category: activity.category || 'system',
        target: activity.target,
        metadata: activity.details || {},
        severity: activity.severity || 'info'
      }));

      await activityLogs.insertMany(migratedActivities);
      console.log(`Migrated ${migratedActivities.length} activities`);
    }

    console.log('Analytics migration completed successfully!');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the migration
migrateAnalytics(); 