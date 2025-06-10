import { MongoClient, Db, Collection, ObjectId, Document } from 'mongodb';
import { logger } from './logger';

export interface DatabaseCollections {
  projects: Collection;
  tasks: Collection;
  subtasks: Collection;
  appUsers: Collection;
  analytics: Collection;
  dailyUpdates: Collection;
  dailyUpdatesSettings: Collection;
  activities: Collection;
  feedbackTickets: Collection;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
interface CachedConnection {
  client: MongoClient | null;
  db: Db | null;
}

const globalWithMongo = global as typeof global & {
  mongo: CachedConnection | null;
};

let cached = globalWithMongo.mongo;

if (!cached) {
  cached = globalWithMongo.mongo = { client: null, db: null };
}

export async function connectToDatabase() {
  if (cached && cached.client && cached.db) {
    return cached;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (!MONGODB_DB_NAME) {
    throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
  }

  const client = new MongoClient(MONGODB_URI);
  
  await client.connect();
  
  const db = client.db(MONGODB_DB_NAME);

  cached = { client, db };

  console.log("New MongoDB connection established.");

  return cached;
}

export async function getDatabase(): Promise<Db> {
  const connection = await connectToDatabase();
  if (!connection || !connection.db) {
    throw new Error('Could not get database from connection.');
  }
  return connection.db;
}

export async function getCollections(): Promise<DatabaseCollections> {
  const db = await getDatabase();
    
    return {
      projects: db.collection('projects'),
      tasks: db.collection('tasks'),
      subtasks: db.collection('subtasks'),
      appUsers: db.collection('appUsers'),
      analytics: db.collection('analytics'),
      dailyUpdates: db.collection('dailyUpdates'),
      dailyUpdatesSettings: db.collection('dailyUpdatesSettings'),
      activities: db.collection('activities'),
      feedbackTickets: db.collection('feedbackTickets'),
    };
  }

export async function disconnect(): Promise<void> {
  if (cached && cached.client) {
    await cached.client.close();
    cached.client = null;
    cached.db = null;
      logger.info('MongoDB disconnected', 'MONGODB_CONNECTION');
    }
  }

export async function testConnection(): Promise<boolean> {
    try {
    const db = await getDatabase();
      await db.admin().ping();
      logger.info('MongoDB connection test successful', 'MONGODB_TEST');
      return true;
    } catch (error) {
      logger.error('MongoDB connection test failed', 'MONGODB_TEST', undefined, error as Error);
      return false;
  }
}

// Create a singleton instance
const mongodb = { connect: connectToDatabase };

// Export the singleton and utilities
export { mongodb };
export { ObjectId };

// Helper function to convert string ID to ObjectId
export function toObjectId(id: string): ObjectId {
  try {
    if (!id || id === 'undefined') {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }
    return new ObjectId(id);
  } catch (error) {
    throw new Error(`Invalid ObjectId format: ${id}`);
  }
}

// Helper function to safely convert ObjectId to string
export function fromObjectId(id: ObjectId | string): string {
  return typeof id === 'string' ? id : id.toString();
}

// Error handling helper
export function handleMongoError(error: any, operation: string) {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  const errorCode = error?.code || 'UNKNOWN';
  
  logger.error(
    `MongoDB ${operation} failed`,
    'MONGODB_ERROR',
    {
      operation,
      errorCode,
      errorMessage
    },
    error
  );
  
  throw error;
}

// Helper function to get a collection
async function getCollection<T extends Document = Document>(collectionName: string) {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

// Analytics and logging collections
export interface AnalyticsEvent {
  _id?: string;
  timestamp?: Date;  // Optional since it's added automatically
  event: string;
  userId?: string;
  projectId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

export interface UserActivity {
  _id?: string;
  userId: string;
  action: string;
  timestamp?: Date;  // Optional since it's added automatically
  projectId?: string;
  taskId?: string;
  details?: Record<string, any>;
}

export interface SystemLog {
  _id?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  source?: string;
  metadata?: Record<string, any>;
}

// Helper functions for common operations
export class MongoAnalytics {
  static async logEvent(event: AnalyticsEvent) {
    try {
      const collection = await getCollection<AnalyticsEvent>('analytics_events');
      await collection.insertOne({
        ...event,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log analytics event:', error);
    }
  }

  static async logUserActivity(activity: UserActivity) {
    try {
      const collection = await getCollection<UserActivity>('user_activities');
      await collection.insertOne({
        ...activity,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log user activity:', error);
    }
  }

  static async logSystem(log: SystemLog) {
    try {
      const collection = await getCollection<SystemLog>('system_logs');
      await collection.insertOne({
        ...log,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log system event:', error);
    }
  }

  static async getAnalytics(timeRange: { start: Date; end: Date }) {
    try {
      const eventsCollection = await getCollection<AnalyticsEvent>('analytics_events');
      const activitiesCollection = await getCollection<UserActivity>('user_activities');

      const [events, activities] = await Promise.all([
        eventsCollection.find({
          timestamp: { $gte: timeRange.start, $lte: timeRange.end }
        }).toArray(),
        activitiesCollection.find({
          timestamp: { $gte: timeRange.start, $lte: timeRange.end }
        }).toArray()
      ]);

      return { events, activities };
    } catch (error) {
      console.error('Failed to get analytics:', error);
      return { events: [], activities: [] };
    }
  }

  static async getTopEvents(limit: number = 10, timeRange?: { start: Date; end: Date }) {
    try {
      const collection = await getCollection<AnalyticsEvent>('analytics_events');
      const matchStage = timeRange 
        ? { timestamp: { $gte: timeRange.start, $lte: timeRange.end } }
        : {};

      const pipeline = [
        { $match: matchStage },
        { $group: { _id: '$event', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ];

      return await collection.aggregate(pipeline).toArray();
    } catch (error) {
      console.error('Failed to get top events:', error);
      return [];
    }
  }

  static async getUserStats(userId: string, timeRange?: { start: Date; end: Date }) {
    try {
      const collection = await getCollection<UserActivity>('user_activities');
      const matchStage = {
        userId,
        ...(timeRange ? { timestamp: { $gte: timeRange.start, $lte: timeRange.end } } : {})
      };

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalActions: { $sum: 1 },
            actions: { $push: '$action' },
            firstActivity: { $min: '$timestamp' },
            lastActivity: { $max: '$timestamp' }
          }
        }
      ];

      const result = await collection.aggregate(pipeline).toArray();
      return result[0] || { totalActions: 0, actions: [], firstActivity: null, lastActivity: null };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return { totalActions: 0, actions: [], firstActivity: null, lastActivity: null };
    }
  }
}

// Remove the default export if it exists
// export default connectToDatabase; // This line should be removed or commented out 