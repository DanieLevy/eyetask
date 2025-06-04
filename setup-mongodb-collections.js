// MongoDB Collections Setup Script
const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://daniellofficial:daniel123@drivershubcluster.rxun1vo.mongodb.net/?retryWrites=true&w=majority&appName=drivershubcluster';
const DATABASE_NAME = 'drivershub';

async function setupCollections() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(DATABASE_NAME);
    
    console.log('🏗️ Setting up MongoDB collections...\n');

    // =============================================================================
    // 1. PROJECTS COLLECTION
    // =============================================================================
    console.log('📁 Creating projects collection...');
    await db.createCollection("projects", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["name"],
          properties: {
            _id: { bsonType: "objectId" },
            name: { 
              bsonType: "string",
              description: "Project name is required and must be unique"
            },
            description: { 
              bsonType: "string",
              description: "Project description"
            },
            createdAt: { 
              bsonType: "date",
              description: "Creation timestamp"
            },
            updatedAt: { 
              bsonType: "date",
              description: "Last update timestamp"
            }
          }
        }
      }
    });

    await db.collection('projects').createIndex({ "name": 1 }, { unique: true });
    await db.collection('projects').createIndex({ "createdAt": -1 });
    console.log('✅ Projects collection created');

    // =============================================================================
    // 2. TASKS COLLECTION
    // =============================================================================
    console.log('📋 Creating tasks collection...');
    await db.createCollection("tasks", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["title", "datacoNumber", "projectId", "type", "locations", "targetCar", "dayTime", "priority"],
          properties: {
            _id: { bsonType: "objectId" },
            title: { 
              bsonType: "string",
              description: "Task title is required"
            },
            subtitle: { 
              bsonType: "string",
              description: "Task subtitle"
            },
            images: { 
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Array of image URLs or paths"
            },
            datacoNumber: { 
              bsonType: "string",
              description: "Unique dataco number"
            },
            description: {
              bsonType: "object",
              properties: {
                main: { bsonType: "string" },
                howToExecute: { bsonType: "string" }
              }
            },
            projectId: { 
              bsonType: "objectId",
              description: "Reference to project"
            },
            type: { 
              bsonType: "array",
              items: { 
                bsonType: "string",
                enum: ["events", "hours"]
              },
              description: "Task types"
            },
            locations: { 
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Task locations"
            },
            amountNeeded: { 
              bsonType: "number",
              minimum: 0,
              description: "Amount needed for task"
            },
            targetCar: { 
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Target car types"
            },
            lidar: { 
              bsonType: "bool",
              description: "LiDAR requirement"
            },
            dayTime: { 
              bsonType: "array",
              items: { 
                bsonType: "string",
                enum: ["day", "night", "dusk", "dawn"]
              },
              description: "Day time requirements"
            },
            priority: { 
              bsonType: "number",
              minimum: 1,
              maximum: 10,
              description: "Task priority (1-10)"
            },
            isVisible: { 
              bsonType: "bool",
              description: "Task visibility"
            },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
          }
        }
      }
    });

    await db.collection('tasks').createIndex({ "datacoNumber": 1 }, { unique: true });
    await db.collection('tasks').createIndex({ "projectId": 1 });
    await db.collection('tasks').createIndex({ "priority": -1 });
    await db.collection('tasks').createIndex({ "isVisible": 1 });
    await db.collection('tasks').createIndex({ "createdAt": -1 });
    console.log('✅ Tasks collection created');

    // =============================================================================
    // 3. SUBTASKS COLLECTION
    // =============================================================================
    console.log('📝 Creating subtasks collection...');
    await db.createCollection("subtasks", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["taskId", "title", "datacoNumber", "type"],
          properties: {
            _id: { bsonType: "objectId" },
            taskId: { 
              bsonType: "objectId",
              description: "Reference to parent task"
            },
            title: { 
              bsonType: "string",
              description: "Subtask title is required"
            },
            subtitle: { 
              bsonType: "string",
              description: "Subtask subtitle"
            },
            images: { 
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Array of image URLs or paths"
            },
            datacoNumber: { 
              bsonType: "string",
              description: "Unique dataco number"
            },
            type: { 
              bsonType: "string",
              enum: ["events", "hours"],
              description: "Subtask type"
            },
            amountNeeded: { 
              bsonType: "number",
              minimum: 0,
              description: "Amount needed for subtask"
            },
            labels: { 
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Subtask labels"
            },
            targetCar: { 
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Target car types"
            },
            weather: { 
              bsonType: "string",
              enum: ["Clear", "Fog", "Overcast", "Rain", "Snow", "Mixed"],
              description: "Weather condition"
            },
            scene: { 
              bsonType: "string",
              enum: ["Highway", "Urban", "Rural", "Sub-Urban", "Test Track", "Mixed"],
              description: "Scene type"
            },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
          }
        }
      }
    });

    await db.collection('subtasks').createIndex({ "datacoNumber": 1 }, { unique: true });
    await db.collection('subtasks').createIndex({ "taskId": 1 });
    await db.collection('subtasks').createIndex({ "type": 1 });
    await db.collection('subtasks').createIndex({ "weather": 1 });
    await db.collection('subtasks').createIndex({ "scene": 1 });
    await db.collection('subtasks').createIndex({ "createdAt": -1 });
    console.log('✅ Subtasks collection created');

    // =============================================================================
    // 4. APP_USERS COLLECTION
    // =============================================================================
    console.log('👥 Creating appUsers collection...');
    await db.createCollection("appUsers", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["username", "email", "passwordHash"],
          properties: {
            _id: { bsonType: "objectId" },
            username: { 
              bsonType: "string",
              description: "Username is required and must be unique"
            },
            email: { 
              bsonType: "string",
              pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
              description: "Valid email is required and must be unique"
            },
            passwordHash: { 
              bsonType: "string",
              description: "Password hash is required"
            },
            role: { 
              bsonType: "string",
              enum: ["admin"],
              description: "User role"
            },
            createdAt: { bsonType: "date" },
            lastLogin: { bsonType: "date" }
          }
        }
      }
    });

    await db.collection('appUsers').createIndex({ "username": 1 }, { unique: true });
    await db.collection('appUsers').createIndex({ "email": 1 }, { unique: true });
    await db.collection('appUsers').createIndex({ "createdAt": -1 });
    console.log('✅ AppUsers collection created');

    // =============================================================================
    // 5. ANALYTICS COLLECTION
    // =============================================================================
    console.log('📊 Creating analytics collection...');
    await db.createCollection("analytics", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          properties: {
            _id: { bsonType: "objectId" },
            totalVisits: { 
              bsonType: "int",
              minimum: 0,
              description: "Total visit count"
            },
            uniqueVisitors: { 
              bsonType: "int",
              minimum: 0,
              description: "Unique visitor count"
            },
            dailyStats: { 
              bsonType: "object",
              description: "Daily statistics object"
            },
            pageViews: { 
              bsonType: "object",
              properties: {
                admin: { bsonType: "int" },
                tasks: { bsonType: "object" },
                homepage: { bsonType: "int" },
                projects: { bsonType: "object" }
              },
              description: "Page view statistics"
            },
            lastUpdated: { bsonType: "date" }
          }
        }
      }
    });

    await db.collection('analytics').createIndex({ "lastUpdated": -1 });
    console.log('✅ Analytics collection created');

    // =============================================================================
    // 6. DAILY_UPDATES COLLECTION
    // =============================================================================
    console.log('📢 Creating dailyUpdates collection...');
    await db.createCollection("dailyUpdates", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["title", "content"],
          properties: {
            _id: { bsonType: "objectId" },
            title: { 
              bsonType: "string",
              description: "Update title is required"
            },
            content: { 
              bsonType: "string",
              description: "Update content is required"
            },
            type: { 
              bsonType: "string",
              enum: ["info", "warning", "success", "error", "announcement"],
              description: "Update type"
            },
            priority: { 
              bsonType: "int",
              minimum: 1,
              maximum: 10,
              description: "Priority level (1-10)"
            },
            durationType: { 
              bsonType: "string",
              enum: ["hours", "days", "permanent"],
              description: "Duration type"
            },
            durationValue: { 
              bsonType: "int",
              minimum: 1,
              description: "Duration value"
            },
            expiresAt: { 
              bsonType: "date",
              description: "Expiration date"
            },
            isActive: { 
              bsonType: "bool",
              description: "Whether update is active"
            },
            isPinned: { 
              bsonType: "bool",
              description: "Whether update is pinned"
            },
            targetAudience: { 
              bsonType: "array",
              description: "Target audience array"
            },
            createdBy: { 
              bsonType: "objectId",
              description: "User who created the update"
            },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
          }
        }
      }
    });

    await db.collection('dailyUpdates').createIndex({ "type": 1 });
    await db.collection('dailyUpdates').createIndex({ "priority": -1 });
    await db.collection('dailyUpdates').createIndex({ "isActive": 1 });
    await db.collection('dailyUpdates').createIndex({ "isPinned": -1 });
    await db.collection('dailyUpdates').createIndex({ "expiresAt": 1 });
    await db.collection('dailyUpdates').createIndex({ "createdAt": -1 });
    await db.collection('dailyUpdates').createIndex({ "createdBy": 1 });
    console.log('✅ DailyUpdates collection created');

    // =============================================================================
    // 7. DAILY_UPDATES_SETTINGS COLLECTION
    // =============================================================================
    console.log('⚙️ Creating dailyUpdatesSettings collection...');
    await db.createCollection("dailyUpdatesSettings", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["key", "value"],
          properties: {
            _id: { bsonType: "objectId" },
            key: { 
              bsonType: "string",
              description: "Setting key is required and must be unique"
            },
            value: { 
              bsonType: "string",
              description: "Setting value is required"
            },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
          }
        }
      }
    });

    await db.collection('dailyUpdatesSettings').createIndex({ "key": 1 }, { unique: true });
    await db.collection('dailyUpdatesSettings').createIndex({ "createdAt": -1 });
    console.log('✅ DailyUpdatesSettings collection created');

    console.log('\n🎉 All collections created successfully!');
    console.log('\n📥 Inserting sample data...');

    // Insert sample data
    const sampleProject = await db.collection('projects').insertOne({
      name: "Sample Autonomous Vehicle Data Collection",
      description: "Data collection project for autonomous vehicle development",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ Sample project inserted with ID: ${sampleProject.insertedId}`);

    const sampleTask = await db.collection('tasks').insertOne({
      title: "Highway Driving Data Collection",
      subtitle: "Collect highway driving scenarios",
      datacoNumber: "DC001",
      description: {
        main: "Collect various highway driving scenarios for ML training",
        howToExecute: "Drive on designated highway routes with data collection equipment"
      },
      projectId: sampleProject.insertedId,
      type: ["data_collection", "highway"],
      locations: ["I-405", "I-101", "US-1"],
      amountNeeded: 100,
      targetCar: ["sedan", "suv"],
      lidar: true,
      dayTime: ["morning", "afternoon"],
      priority: 7,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ Sample task inserted with ID: ${sampleTask.insertedId}`);

    await db.collection('subtasks').insertOne({
      taskId: sampleTask.insertedId,
      title: "Clear Weather Highway Driving",
      subtitle: "Highway data in clear weather conditions",
      datacoNumber: "DC001-01",
      type: "hours",
      amountNeeded: 25,
      labels: ["highway", "clear_weather", "daytime"],
      targetCar: ["sedan"],
      weather: "Clear",
      scene: "Highway",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Sample subtask inserted');

    await db.collection('analytics').insertOne({
      totalVisits: 0,
      uniqueVisitors: 0,
      dailyStats: {},
      pageViews: {
        admin: 0,
        tasks: {},
        homepage: 0,
        projects: {}
      },
      lastUpdated: new Date()
    });
    console.log('✅ Analytics record inserted');

    await db.collection('dailyUpdates').insertOne({
      title: "System Migration Complete",
      content: "Successfully migrated from Supabase to MongoDB. All data structures have been preserved.",
      type: "success",
      priority: 8,
      durationType: "days",
      durationValue: 7,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
      isPinned: true,
      targetAudience: ["admin"],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Sample daily update inserted');

    console.log('\n🎊 MongoDB Database Setup Complete!');
    console.log('='.repeat(50));
    console.log('Collections created:');
    console.log('- projects');
    console.log('- tasks');
    console.log('- subtasks');
    console.log('- appUsers');
    console.log('- analytics');
    console.log('- dailyUpdates');
    console.log('- dailyUpdatesSettings');
    console.log('\nAll collections have proper validation schemas and indexes.');
    console.log('Sample data has been inserted for testing.');

  } catch (error) {
    console.error('❌ Error setting up collections:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run the setup
setupCollections().catch(console.error); 