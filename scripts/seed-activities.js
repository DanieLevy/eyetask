const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'eyetask';

async function seedActivities() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const activities = db.collection('activities');
    
    // Clear existing activities (optional)
    // await activities.deleteMany({});
    
    // Sample activities over the last 30 days
    const now = new Date();
    const sampleActivities = [];
    
    // Create activities over the past 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      // Add some random activities for each day
      const dailyActivities = Math.floor(Math.random() * 8) + 2; // 2-10 activities per day
      
      for (let j = 0; j < dailyActivities; j++) {
        const activityTypes = [
          {
            action: 'יצר משימה חדשה',
            category: 'task',
            severity: 'success',
            target: {
              id: `task_${Date.now()}_${j}`,
              type: 'task',
              title: `משימה לדוגמה ${j + 1}`
            }
          },
          {
            action: 'יצר תת-משימה חדשה', 
            category: 'subtask',
            severity: 'success',
            target: {
              id: `subtask_${Date.now()}_${j}`,
              type: 'subtask',
              title: `תת-משימה לדוגמה ${j + 1}`
            }
          },
          {
            action: 'עדכן משימה',
            category: 'task', 
            severity: 'info',
            target: {
              id: `task_${Date.now()}_${j}`,
              type: 'task',
              title: `משימה מעודכנת ${j + 1}`
            }
          },
          {
            action: 'התחבר למערכת',
            category: 'auth',
            severity: 'success'
          },
          {
            action: 'יצר פרויקט חדש',
            category: 'project',
            severity: 'success',
            target: {
              id: `project_${Date.now()}_${j}`,
              type: 'project',
              title: `פרויקט לדוגמה ${j + 1}`
            }
          },
          {
            action: 'יצר עדכון יומי חדש',
            category: 'daily_update',
            severity: 'success',
            target: {
              id: `update_${Date.now()}_${j}`,
              type: 'daily_update',
              title: `עדכון יומי ${j + 1}`
            }
          }
        ];
        
        const randomActivity = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const activityTime = new Date(date.getTime() + (Math.random() * 24 * 60 * 60 * 1000));
        
        sampleActivities.push({
          timestamp: activityTime,
          userId: `admin_${Math.floor(Math.random() * 3) + 1}`,
          userType: 'admin',
          action: randomActivity.action,
          category: randomActivity.category,
          target: randomActivity.target,
          details: {
            sample: true,
            generatedAt: new Date().toISOString()
          },
          metadata: {
            ip: `192.168.1.${Math.floor(Math.random() * 100) + 1}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Sample',
            device: Math.random() > 0.8 ? 'mobile' : 'desktop'
          },
          severity: randomActivity.severity,
          isVisible: true
        });
      }
    }
    
    // Add some system activities
    for (let i = 0; i < 10; i++) {
      const systemDate = new Date(now.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000));
      
      sampleActivities.push({
        timestamp: systemDate,
        userType: 'system',
        action: 'רישום ביקור באתר',
        category: 'system',
        details: {
          page: Math.random() > 0.5 ? 'homepage' : 'task-view',
          sample: true
        },
        severity: 'info',
        isVisible: false
      });
    }
    
    // Insert all activities
    if (sampleActivities.length > 0) {
      const result = await activities.insertMany(sampleActivities);
      console.log(`Inserted ${result.insertedCount} sample activities`);
    }
    
    // Update analytics collection with some visit data
    const analytics = db.collection('analytics');
    await analytics.updateOne(
      {},
      {
        $set: {
          totalVisits: Math.floor(Math.random() * 500) + 100,
          uniqueVisitors: Math.floor(Math.random() * 300) + 50,
          dailyStats: {
            [now.toISOString().split('T')[0]]: Math.floor(Math.random() * 20) + 5
          },
          pageViews: {
            homepage: Math.floor(Math.random() * 100) + 20,
            admin: Math.floor(Math.random() * 50) + 10,
            tasks: {},
            projects: {}
          },
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log('Updated analytics with sample data');
    console.log('Activity seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding activities:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  seedActivities().catch(console.error);
}

module.exports = { seedActivities }; 