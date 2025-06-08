const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function optimizeDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri || !dbName) {
    console.error('Missing MONGODB_URI or MONGODB_DB_NAME environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    // Create indexes for better query performance
    console.log('Creating database indexes...');

    // Projects collection indexes
    const projectsCollection = db.collection('projects');
    await projectsCollection.createIndex({ name: 1 }, { unique: true });
    await projectsCollection.createIndex({ createdAt: -1 });
    console.log('✓ Projects indexes created');

    // Tasks collection indexes
    const tasksCollection = db.collection('tasks');
    await tasksCollection.createIndex({ projectId: 1, isVisible: 1 });
    await tasksCollection.createIndex({ isVisible: 1, priority: 1, createdAt: -1 });
    await tasksCollection.createIndex({ projectId: 1, isVisible: 1, priority: 1 });
    await tasksCollection.createIndex({ dayTime: 1 });
    await tasksCollection.createIndex({ targetCar: 1 });
    await tasksCollection.createIndex({ locations: 1 });
    await tasksCollection.createIndex({ datacoNumber: 1 });
    
    // Text search index for tasks
    await tasksCollection.createIndex({
      title: 'text',
      subtitle: 'text',
      datacoNumber: 'text',
      'description.main': 'text',
      'description.howToExecute': 'text'
    }, {
      name: 'tasks_text_search',
      weights: {
        title: 10,
        subtitle: 5,
        datacoNumber: 8,
        'description.main': 3,
        'description.howToExecute': 2
      }
    });
    console.log('✓ Tasks indexes created');

    // Subtasks collection indexes
    const subtasksCollection = db.collection('subtasks');
    await subtasksCollection.createIndex({ taskId: 1 });
    await subtasksCollection.createIndex({ taskId: 1, createdAt: -1 });
    await subtasksCollection.createIndex({ type: 1 });
    await subtasksCollection.createIndex({ weather: 1 });
    await subtasksCollection.createIndex({ scene: 1 });
    await subtasksCollection.createIndex({ dayTime: 1 });
    await subtasksCollection.createIndex({ targetCar: 1 });
    console.log('✓ Subtasks indexes created');

    // Analytics collection indexes
    const analyticsCollection = db.collection('analytics');
    await analyticsCollection.createIndex({ lastUpdated: -1 });
    console.log('✓ Analytics indexes created');

    // Daily Updates collection indexes
    const dailyUpdatesCollection = db.collection('dailyUpdates');
    await dailyUpdatesCollection.createIndex({ 
      isActive: 1, 
      expiresAt: 1, 
      isHidden: 1 
    });
    await dailyUpdatesCollection.createIndex({ 
      isPinned: -1, 
      priority: 1, 
      createdAt: -1 
    });
    console.log('✓ Daily Updates indexes created');

    // Activities collection indexes (for logging)
    const activitiesCollection = db.collection('activities');
    await activitiesCollection.createIndex({ timestamp: -1 });
    await activitiesCollection.createIndex({ userId: 1, timestamp: -1 });
    await activitiesCollection.createIndex({ action: 1, timestamp: -1 });
    console.log('✓ Activities indexes created');

    // Feedback collection indexes
    const feedbackCollection = db.collection('feedbackTickets');
    await feedbackCollection.createIndex({ createdAt: -1 });
    await feedbackCollection.createIndex({ status: 1, createdAt: -1 });
    await feedbackCollection.createIndex({ priority: 1, createdAt: -1 });
    console.log('✓ Feedback indexes created');

    // App Users collection indexes
    const usersCollection = db.collection('appUsers');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    console.log('✓ Users indexes created');

    console.log('\n🎉 Database optimization completed successfully!');
    
    // Show index statistics
    console.log('\n📊 Index Statistics:');
    const collections = ['projects', 'tasks', 'subtasks', 'analytics', 'dailyUpdates', 'activities', 'feedbackTickets', 'appUsers'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      console.log(`${collectionName}: ${indexes.length} indexes`);
    }

  } catch (error) {
    console.error('Error optimizing database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the optimization
optimizeDatabase().catch(console.error); 