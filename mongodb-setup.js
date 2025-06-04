// MongoDB Setup Script - Recreating Supabase Structure
// Run this script in MongoDB Shell or MongoDB Compass

// Connect to your database (replace 'drivershub' with your preferred database name)
use drivershub;

// =============================================================================
// 1. PROJECTS COLLECTION
// =============================================================================
db.createCollection("projects", {
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

// Create unique index on project name
db.projects.createIndex({ "name": 1 }, { unique: true });
db.projects.createIndex({ "createdAt": -1 });

// =============================================================================
// 2. TASKS COLLECTION
// =============================================================================
db.createCollection("tasks", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "datacoNumber", "projectId"],
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
        datacoNumber: { 
          bsonType: "string",
          description: "Unique dataco number"
        },
        description: {
          bsonType: "object",
          properties: {
            main: { bsonType: "string" },
            howToExecute: { bsonType: "string" }
          },
          additionalProperties: false
        },
        projectId: { 
          bsonType: "objectId",
          description: "Reference to project"
        },
        type: { 
          bsonType: "array",
          items: { bsonType: "string" },
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
          description: "Whether LIDAR is required"
        },
        dayTime: { 
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Day time requirements"
        },
        priority: { 
          bsonType: "int",
          minimum: 0,
          maximum: 10,
          description: "Task priority (0-10)"
        },
        isVisible: { 
          bsonType: "bool",
          description: "Whether task is visible"
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

// Create indexes for tasks
db.tasks.createIndex({ "datacoNumber": 1 }, { unique: true });
db.tasks.createIndex({ "projectId": 1 });
db.tasks.createIndex({ "priority": -1 });
db.tasks.createIndex({ "isVisible": 1 });
db.tasks.createIndex({ "createdAt": -1 });

// =============================================================================
// 3. SUBTASKS COLLECTION
// =============================================================================
db.createCollection("subtasks", {
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
        image: { 
          bsonType: "string",
          description: "Image URL or path"
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

// Create indexes for subtasks
db.subtasks.createIndex({ "datacoNumber": 1 }, { unique: true });
db.subtasks.createIndex({ "taskId": 1 });
db.subtasks.createIndex({ "type": 1 });
db.subtasks.createIndex({ "weather": 1 });
db.subtasks.createIndex({ "scene": 1 });
db.subtasks.createIndex({ "createdAt": -1 });

// =============================================================================
// 4. APP_USERS COLLECTION
// =============================================================================
db.createCollection("appUsers", {
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

// Create indexes for app users
db.appUsers.createIndex({ "username": 1 }, { unique: true });
db.appUsers.createIndex({ "email": 1 }, { unique: true });
db.appUsers.createIndex({ "createdAt": -1 });

// =============================================================================
// 5. ANALYTICS COLLECTION
// =============================================================================
db.createCollection("analytics", {
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

db.analytics.createIndex({ "lastUpdated": -1 });

// =============================================================================
// 6. DAILY_UPDATES COLLECTION
// =============================================================================
db.createCollection("dailyUpdates", {
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

// Create indexes for daily updates
db.dailyUpdates.createIndex({ "type": 1 });
db.dailyUpdates.createIndex({ "priority": -1 });
db.dailyUpdates.createIndex({ "isActive": 1 });
db.dailyUpdates.createIndex({ "isPinned": -1 });
db.dailyUpdates.createIndex({ "expiresAt": 1 });
db.dailyUpdates.createIndex({ "createdAt": -1 });
db.dailyUpdates.createIndex({ "createdBy": 1 });

// =============================================================================
// 7. DAILY_UPDATES_SETTINGS COLLECTION
// =============================================================================
db.createCollection("dailyUpdatesSettings", {
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

// Create unique index on setting key
db.dailyUpdatesSettings.createIndex({ "key": 1 }, { unique: true });
db.dailyUpdatesSettings.createIndex({ "createdAt": -1 });

// =============================================================================
// INSERT SAMPLE DATA
// =============================================================================

print("Creating collections and indexes completed!");
print("Inserting sample data...");

// Insert sample project
const sampleProject = db.projects.insertOne({
  name: "Sample Autonomous Vehicle Data Collection",
  description: "Data collection project for autonomous vehicle development",
  createdAt: new Date(),
  updatedAt: new Date()
});

print("Sample project inserted with ID: " + sampleProject.insertedId);

// Insert sample task
const sampleTask = db.tasks.insertOne({
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

print("Sample task inserted with ID: " + sampleTask.insertedId);

// Insert sample subtask
db.subtasks.insertOne({
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

// Insert analytics record
db.analytics.insertOne({
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

// Insert sample daily update
db.dailyUpdates.insertOne({
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

print("Sample data insertion completed!");
print("=============================================================================");
print("MongoDB Database Setup Complete!");
print("=============================================================================");
print("Collections created:");
print("- projects");
print("- tasks");
print("- subtasks");
print("- appUsers");
print("- analytics");
print("- dailyUpdates");
print("- dailyUpdatesSettings");
print("");
print("All collections have proper validation schemas and indexes.");
print("Sample data has been inserted for testing."); 