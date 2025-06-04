import { MongoClient, Db, Collection, Document } from 'mongodb';

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || process.env.MDB_MCP_CONNECTION_STRING;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'eyetask';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI or MDB_MCP_CONNECTION_STRING environment variable');
}

// Global MongoDB connection (for serverless environments)
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the client across module reloads
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new client
  const client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(MONGODB_DB_NAME);
}

export async function getCollection<T extends Document = Document>(collectionName: string): Promise<Collection<T>> {
  const db = await getMongoDb();
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

export default clientPromise; 