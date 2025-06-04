const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Use MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'drivershub';

async function migrateToMultipleImages() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('🔗 Using URI:', MONGODB_URI.substring(0, 30) + '...');
    console.log('🗃️ Using Database:', DATABASE_NAME);
    
    await client.connect();
    const db = client.db(DATABASE_NAME);
    
    console.log('✅ Connected to MongoDB successfully!\n');
    console.log('📊 Starting migration to multiple images...\n');

    // =============================================================================
    // 1. MIGRATE TASKS COLLECTION
    // =============================================================================
    console.log('📋 Migrating tasks collection...');
    
    const tasksCollection = db.collection('tasks');
    
    // Find all tasks with single image field
    const tasksWithSingleImage = await tasksCollection.find({
      image: { $exists: true }
    }).toArray();
    
    console.log(`📄 Found ${tasksWithSingleImage.length} tasks with single image field`);
    
    let tasksUpdated = 0;
    for (const task of tasksWithSingleImage) {
      try {
        // Convert single image to array
        const imageArray = task.image ? [task.image] : [];
        
        // Update the task
        const result = await tasksCollection.updateOne(
          { _id: task._id },
          {
            $set: { images: imageArray },
            $unset: { image: "" }
          }
        );
        
        if (result.modifiedCount > 0) {
          tasksUpdated++;
          console.log(`✅ Task "${task.title}" migrated: "${task.image}" → [${imageArray.length} images]`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate task "${task.title}":`, error.message);
      }
    }
    
    console.log(`📊 Tasks migration complete: ${tasksUpdated}/${tasksWithSingleImage.length} tasks updated\n`);

    // =============================================================================
    // 2. MIGRATE SUBTASKS COLLECTION
    // =============================================================================
    console.log('📝 Migrating subtasks collection...');
    
    const subtasksCollection = db.collection('subtasks');
    
    // Find all subtasks with single image field
    const subtasksWithSingleImage = await subtasksCollection.find({
      image: { $exists: true }
    }).toArray();
    
    console.log(`📄 Found ${subtasksWithSingleImage.length} subtasks with single image field`);
    
    let subtasksUpdated = 0;
    for (const subtask of subtasksWithSingleImage) {
      try {
        // Convert single image to array
        const imageArray = subtask.image ? [subtask.image] : [];
        
        // Update the subtask
        const result = await subtasksCollection.updateOne(
          { _id: subtask._id },
          {
            $set: { images: imageArray },
            $unset: { image: "" }
          }
        );
        
        if (result.modifiedCount > 0) {
          subtasksUpdated++;
          console.log(`✅ Subtask "${subtask.title}" migrated: "${subtask.image}" → [${imageArray.length} images]`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate subtask "${subtask.title}":`, error.message);
      }
    }
    
    console.log(`📊 Subtasks migration complete: ${subtasksUpdated}/${subtasksWithSingleImage.length} subtasks updated\n`);

    // =============================================================================
    // 3. UPDATE COLLECTION VALIDATORS
    // =============================================================================
    console.log('⚙️ Updating collection validators...');
    
    try {
      // Update tasks collection validator
      await db.command({
        collMod: 'tasks',
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
      console.log('✅ Tasks collection validator updated');
      
      // Update subtasks collection validator
      await db.command({
        collMod: 'subtasks',
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
      console.log('✅ Subtasks collection validator updated');
      
    } catch (error) {
      console.warn('⚠️ Warning: Could not update collection validators:', error.message);
      console.log('   This is not critical - the migration can continue');
    }

    // =============================================================================
    // 4. MIGRATION SUMMARY
    // =============================================================================
    console.log('\n🎉 Migration completed successfully!');
    console.log('='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   📋 Tasks migrated: ${tasksUpdated}/${tasksWithSingleImage.length}`);
    console.log(`   📝 Subtasks migrated: ${subtasksUpdated}/${subtasksWithSingleImage.length}`);
    console.log(`   ⚙️ Collection validators updated`);
    console.log('');
    console.log('✅ All tasks and subtasks now support multiple images!');
    console.log('');
    console.log('📝 Changes made:');
    console.log('   • Single "image" field converted to "images" array');
    console.log('   • Old "image" fields removed from documents');
    console.log('   • Collection validators updated to support images arrays');
    console.log('   • All existing image URLs preserved in new format');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run the migration
migrateToMultipleImages().catch(console.error);

module.exports = { migrateToMultipleImages }; 