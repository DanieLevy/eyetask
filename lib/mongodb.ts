import { MongoClient, Db, Collection, ObjectId, Document, ServerApiVersion, MongoClientOptions } from 'mongodb';
import { logger } from './logger';
import { cache } from './cache';

export interface Collections {
  projects: Collection;
  tasks: Collection;
  subtasks: Collection;
  appUsers: Collection;
  analytics: Collection;
  dailyUpdates: Collection;
  dailyUpdatesSettings: Collection;
  activities: Collection;
  feedbackTickets: Collection;
  userSessions: Collection;
  activityLogs: Collection;
}



// Enhanced MongoDB connection with retry logic
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connectionPromise: Promise<{ client: MongoClient; db: Db }> | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function connectWithRetry(): Promise<{ client: MongoClient; db: Db }> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'drivershub';

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    logger.info('Attempting MongoDB connection...', 'MONGODB_CONNECTION', { 
      attempt: retryCount + 1,
      maxRetries: MAX_RETRIES 
    });

    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority'
    });

    await client.connect();
    const db = client.db(dbName);
    
    // Test the connection
    await db.admin().ping();
    
    logger.info('MongoDB connected successfully', 'MONGODB_CONNECTION', {
      database: dbName,
      poolSize: 10
    });

    retryCount = 0; // Reset retry count on success
    return { client, db };
  } catch (error) {
    const err = error as Error;
    logger.error('MongoDB connection attempt failed', 'MONGODB_CONNECTION', {
      attempt: retryCount + 1,
      error: err.message,
      errorCode: (error as any).code
    });

    if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      logger.error('DNS resolution error detected', 'MONGODB_CONNECTION', {
        troubleshooting: [
          'Check internet connection',
          'Verify MongoDB Atlas cluster name',
          'Check firewall/proxy settings',
          'Try alternative DNS servers'
        ]
      });
    }

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      logger.info(`Retrying MongoDB connection in ${RETRY_DELAY}ms...`, 'MONGODB_CONNECTION');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectWithRetry();
    }

    throw new Error(`MongoDB connection failed after ${MAX_RETRIES} attempts: ${err.message}`);
  }
}

/**
 * Connect to the MongoDB database
 */
export async function connectToDatabase(): Promise<{
  client: MongoClient | null;
  db: Db | null;
}> {
  // In production, always create new connections
  if (process.env.NODE_ENV === 'production') {
    try {
      const { client, db } = await connectWithRetry();
      return { db, client };
    } catch (error) {
      logger.error('Production MongoDB connection failed', 'MONGODB_CONNECTION', { 
        errorMessage: (error as Error).message 
      });
      throw error;
    }
  }

  // In development, use connection pooling
  if (cachedClient && cachedDb) {
    try {
      // Verify the connection is still alive
      await cachedDb.admin().ping();
      return { db: cachedDb, client: cachedClient };
    } catch (error) {
      logger.warn('Cached MongoDB connection lost, reconnecting...', 'MONGODB_CONNECTION');
      cachedClient = null;
      cachedDb = null;
      connectionPromise = null;
    }
  }

  // If a connection is already in progress, wait for it
  if (connectionPromise) {
    try {
      const result = await connectionPromise;
      return { db: result.db, client: result.client };
    } catch (error) {
      // Connection failed, will retry below
      connectionPromise = null;
    }
  }

  // Create a new connection promise to prevent duplicate connections
  connectionPromise = connectWithRetry();

  try {
    const { client, db } = await connectionPromise;
    cachedClient = client;
    cachedDb = db;

    // Handle connection events
    client.on('close', () => {
      logger.warn('MongoDB connection closed', 'MONGODB_CONNECTION');
      cachedClient = null;
      cachedDb = null;
      connectionPromise = null;
    });

    client.on('error', (error) => {
      logger.error('MongoDB connection error', 'MONGODB_CONNECTION', { 
        errorMessage: error.message 
      });
    });

    return { db: cachedDb, client: cachedClient };
  } catch (error) {
    logger.error('MongoDB connection failed', 'MONGODB_CONNECTION', { 
      errorMessage: (error as Error).message 
    });
    connectionPromise = null;
    throw error;
  }
}



/**
 * Get a MongoDB collection by name
 */
export async function getCollection<T extends Document = Document>(
  collectionName: keyof Collections
): Promise<Collection<T>> {
  const { db } = await connectToDatabase();
  
  if (!db) {
    throw new Error('Database connection not available');
  }

  return db.collection<T>(collectionName as string);
}

/**
 * Get all collections as an object
 */
export async function getCollections(): Promise<Collections> {
  const { db } = await connectToDatabase();
  
  if (!db) {
    throw new Error('Database connection not available');
  }

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
    userSessions: db.collection('userSessions'),
    activityLogs: db.collection('activityLogs')
  };
}

/**
 * Get connection status for health checks
 */
export function getConnectionStatus(): {
  isConnected: boolean;
} {
  if (!cachedClient || !cachedDb) {
    return {
      isConnected: false
    };
  }

  return {
    isConnected: true
  };
}



// Utility functions for ObjectId handling
export { ObjectId } from 'mongodb';

export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export function createObjectId(id?: string): ObjectId {
  return new ObjectId(id);
}

// Connection health check
export async function checkConnection(): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    if (!db) {
      throw new Error('Database connection not established');
    }
    await db.admin().ping();
    return true;
  } catch (error) {
    logger.error('MongoDB health check failed', 'MONGODB_CONNECTION', {
      error: (error as Error).message
    });
    return false;
  }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  if (cachedClient) {
    try {
      await cachedClient.close();
      logger.info('MongoDB connection closed gracefully', 'MONGODB_CONNECTION');
    } catch (error) {
      logger.error('Error closing MongoDB connection', 'MONGODB_CONNECTION', {
        error: (error as Error).message
      });
    } finally {
      cachedClient = null;
      cachedDb = null;
    }
  }
} 