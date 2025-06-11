import { MongoClient, Db, Collection, ObjectId, Document, ServerApiVersion, MongoClientOptions } from 'mongodb';
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
  isConnecting: boolean;
}

const globalWithMongo = global as typeof global & {
  mongo: CachedConnection | null;
};

let cached = globalWithMongo.mongo;

if (!cached) {
  cached = globalWithMongo.mongo = { client: null, db: null, isConnecting: false };
}

// Connection pool configuration
// These settings are optimized for a small team (~10 users) with high reliability
const CONNECTION_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,      // Limit max connections to avoid hitting limits (adjust based on your MongoDB plan)
  minPoolSize: 3,       // Keep a minimum number of connections open for faster response
  connectTimeoutMS: 10000,  // 10 seconds connection timeout
  socketTimeoutMS: 45000,   // 45 seconds socket timeout for operations
  waitQueueTimeoutMS: 5000, // 5 seconds max wait time for connection from pool
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
};

export async function connectToDatabase() {
  // If we already have a connection, return it
  if (cached?.client && cached?.db) {
    return cached;
  }

  // If a connection is already being established, wait for it
  if (cached?.isConnecting) {
    // Wait for connection to complete (retry every 100ms for up to 10 seconds)
    let retries = 100;
    while (cached.isConnecting && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries--;
    }
    
    // If connection established during wait, return it
    if (cached?.client && cached?.db) {
      return cached;
    }
  }
  
  try {
    // Mark that we're establishing a connection
    if (cached) {
      cached.isConnecting = true;
    }

    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    if (!MONGODB_DB_NAME) {
      throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
    }

    logger.info('Establishing MongoDB connection', 'MONGODB_CONNECTION');
    
    const client = new MongoClient(MONGODB_URI, CONNECTION_OPTIONS);
    
    await client.connect();
    
    const db = client.db(MONGODB_DB_NAME);
    
    // Set up connection monitoring
    const clientAdmin = db.admin();
    client.on('connectionPoolCreated', (event) => {
      logger.info(`MongoDB connection pool created`, 'MONGODB_POOL', { maxPoolSize: event.options.maxPoolSize });
    });
    
    client.on('connectionPoolClosed', () => {
      logger.info('MongoDB connection pool closed', 'MONGODB_POOL');
    });

    // Monitor connection pool stats periodically
    setupConnectionMonitoring(client, clientAdmin);

    cached = { client, db, isConnecting: false };

    logger.info('MongoDB connection established successfully', 'MONGODB_CONNECTION');
    
    return cached;
  } catch (error) {
    logger.error('MongoDB connection failed', 'MONGODB_CONNECTION', { errorMessage: (error as Error).message });
    
    // Reset connecting flag on error
    if (cached) {
      cached.isConnecting = false;
    }
    
    throw error;
  }
}

// Monitor connection pool statistics
function setupConnectionMonitoring(client: MongoClient, admin: any) {
  // Check connection stats every 5 minutes
  const interval = setInterval(async () => {
    try {
      if (!client.topology?.isConnected()) {
        return;
      }
      
      const status = await admin.serverStatus();
      const connections = status.connections;
      
      if (connections) {
        const connectionPercent = connections.current / connections.available * 100;
        
        logger.info('MongoDB connection pool stats', 'MONGODB_POOL_STATS', {
          current: connections.current,
          available: connections.available,
          percent: connectionPercent.toFixed(2) + '%'
        });
        
        // Warn if connection usage is high
        if (connectionPercent > 70) {
          logger.warn(`MongoDB connections at ${connectionPercent.toFixed(2)}% of limit`, 'MONGODB_CONNECTION_WARNING', {
            current: connections.current,
            available: connections.available
          });
        }
      }
    } catch (error) {
      logger.error('Failed to check MongoDB connection stats', 'MONGODB_MONITORING', { error: (error as Error).message });
    }
  }, 5 * 60 * 1000); // Every 5 minutes
  
  // Clear interval on client close
  client.on('close', () => {
    clearInterval(interval);
  });
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
    cached.isConnecting = false;
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