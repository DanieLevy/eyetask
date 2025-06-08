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
}

class MongoDBConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionPromise: Promise<MongoClient> | null = null;

  constructor() {
    this.validateEnvironment();
  }

  private validateEnvironment() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    if (!dbName) {
      throw new Error('MONGODB_DB_NAME environment variable is not set');
    }
  }

  async connect(): Promise<MongoClient> {
    if (this.client) {
      try {
        // Test if the connection is still alive
        await this.client.db('admin').command({ ping: 1 });
        return this.client;
      } catch (error) {
        // Connection is dead, reset and reconnect
        this.client = null;
        this.db = null;
      }
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }

  private async establishConnection(): Promise<MongoClient> {
    try {
      const uri = process.env.MONGODB_URI!;
      const dbName = process.env.MONGODB_DB_NAME!;

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(dbName);

      logger.info('MongoDB connected successfully', 'MONGODB_CONNECTION', {
        database: dbName,
        collections: await this.db.listCollections().toArray().then(cols => cols.length)
      });

      return this.client;
    } catch (error) {
      this.connectionPromise = null;
      logger.error('Failed to connect to MongoDB', 'MONGODB_CONNECTION', undefined, error as Error);
      throw error;
    }
  }

  async getDatabase(): Promise<Db> {
    // Ensure the client is connected.
    // this.connect() handles establishing or verifying the connection.
    // If establishConnection is called within connect(), it sets this.db.
    // If connect() uses an existing client (after a successful ping), this.db should ideally already be valid.
    await this.connect();

    // After connect() resolves, check if this.db is populated.
    // This handles the edge case where connect() might succeed (e.g., ping success)
    // but this.db was null or became null.
    if (!this.db) {
      logger.warn(
        'MongoDBConnection: this.db is null after connect(). Attempting to re-initialize from client.',
        'MONGODB_RECOVERY'
      );
      if (this.client) {
        const dbName = process.env.MONGODB_DB_NAME;
        if (!dbName) {
          logger.error(
            'MongoDBConnection: MONGODB_DB_NAME is not set. Cannot re-initialize db.',
            'MONGODB_CRITICAL'
          );
          throw new Error(
            'MONGODB_DB_NAME environment variable is not set for DB re-initialization.'
          );
        }
        this.db = this.client.db(dbName); // Attempt to re-initialize db from the existing client.
        
        if (!this.db) {
          // If still null, the client might be in a strange state or dbName is invalid.
          logger.error(
            'MongoDBConnection: Failed to re-initialize this.db from existing client. Forcing full reconnect.',
            'MONGODB_CRITICAL'
          );
          this.client = null; // Force full reconnect path
          this.connectionPromise = null;
          await this.connect(); // Try one more full connection attempt
        }
      } else {
        // If there's no client either, a full connect was needed but might have failed to set db.
        logger.error(
          'MongoDBConnection: this.db and this.client are null after connect(). This indicates a connection failure.',
          'MONGODB_CRITICAL'
        );
      }
    }

    // Final check after all recovery attempts
    if (!this.db) {
      logger.error(
        'MongoDBConnection: Unable to obtain a valid DB instance after all attempts.',
        'MONGODB_CRITICAL'
      );
      throw new Error('Failed to get a valid database instance.');
    }
    
    return this.db; // Now this.db should be valid, or an error would have been thrown.
  }

  async getCollections(): Promise<DatabaseCollections> {
    const db = await this.getDatabase();
    
    return {
      projects: db.collection('projects'),
      tasks: db.collection('tasks'),
      subtasks: db.collection('subtasks'),
      appUsers: db.collection('appUsers'),
      analytics: db.collection('analytics'),
      dailyUpdates: db.collection('dailyUpdates'),
      dailyUpdatesSettings: db.collection('dailyUpdatesSettings'),
      activities: db.collection('activities'),
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connectionPromise = null;
      logger.info('MongoDB disconnected', 'MONGODB_CONNECTION');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      await db.admin().ping();
      logger.info('MongoDB connection test successful', 'MONGODB_TEST');
      return true;
    } catch (error) {
      logger.error('MongoDB connection test failed', 'MONGODB_TEST', undefined, error as Error);
      return false;
    }
  }
}

// Create a singleton instance
const mongodb = new MongoDBConnection();

// Export the singleton and utilities
export { mongodb };
export { ObjectId };

// Helper function to convert string ID to ObjectId
export function toObjectId(id: string): ObjectId {
  try {
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
  const db = await mongodb.getDatabase();
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

export default mongodb.connect(); 