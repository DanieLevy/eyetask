import { MongoClient, Db, Collection, ObjectId, Document, ServerApiVersion, MongoClientOptions } from 'mongodb';
import { logger } from './logger';
import { cache } from './cache';

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

interface CachedConnection {
  client: MongoClient | null;
  db: Db | null;
  isConnecting: boolean;
  connectionCount: number;
  lastConnectionTime: number;
  requestsServedByThisConnection: number;
  collections: Partial<DatabaseCollections>;
  lastHeartbeat: number;
  pendingOperations: number;
}

const globalWithMongo = global as typeof global & {
  mongo: CachedConnection | null;
};

let cached = globalWithMongo.mongo;

if (!cached) {
  cached = globalWithMongo.mongo = { 
    client: null, 
    db: null, 
    isConnecting: false,
    connectionCount: 0,
    lastConnectionTime: 0,
    requestsServedByThisConnection: 0,
    collections: {},
    lastHeartbeat: Date.now(),
    pendingOperations: 0
  };
}

// Connection pool configuration
const CONNECTION_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  waitQueueTimeoutMS: 5000,
  maxConnecting: 2,
  maxIdleTimeMS: 300000,
  compressors: ['zlib'],
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
};

// Flag to prevent multiple connection monitoring setups


/**
 * Connect to the MongoDB database
 */
export async function connectToDatabase(): Promise<{
  client: MongoClient | null;
  db: Db | null;
  isNewConnection: boolean;
  connectionCount: number;
  requestsServedByThisConnection: number;
  pendingOperations: number;
}> {
  try {
    // If we already have a connection, reuse it
    if (cached && cached.client && cached.db) {
      // Update tracking info
      cached.requestsServedByThisConnection += 1;
      cached.lastHeartbeat = Date.now();
      cached.pendingOperations += 1;
      
      return {
        client: cached.client,
        db: cached.db,
        isNewConnection: false,
        connectionCount: cached.connectionCount,
        requestsServedByThisConnection: cached.requestsServedByThisConnection,
        pendingOperations: cached.pendingOperations
      };
    }

    // If another connection is in progress, wait for it
    if (cached && cached.isConnecting) {
      // Wait for the connection to complete
      let attempts = 0;
      while (cached.isConnecting && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // If still connecting after 5 seconds, proceed with new connection
      if (cached.isConnecting || !cached.client || !cached.db) {
        cached.isConnecting = false; // Reset the flag
      } else {
        // Connection completed, return it
        cached.requestsServedByThisConnection += 1;
        cached.pendingOperations += 1;
        return {
          client: cached.client,
          db: cached.db,
          isNewConnection: false,
          connectionCount: cached.connectionCount,
          requestsServedByThisConnection: cached.requestsServedByThisConnection,
          pendingOperations: cached.pendingOperations
        };
      }
    }

    // Create a new connection
    return await createNewConnection();
  } catch (error) {
    logger.error('MongoDB connection failed', 'MONGODB_CONNECTION', { errorMessage: (error as Error).message });
    throw error;
  }
}

/**
 * Create a new MongoDB connection
 */
async function createNewConnection(): Promise<{
  client: MongoClient | null;
  db: Db | null;
  isNewConnection: boolean;
  connectionCount: number;
  requestsServedByThisConnection: number;
  pendingOperations: number;
}> {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    if (!MONGODB_DB_NAME) {
      throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
    }

    if (cached) {
      cached.isConnecting = true;
    }
    
    const client = new MongoClient(MONGODB_URI, CONNECTION_OPTIONS);
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);

    // Set up basic error handling  
    client.on('connectionCheckOutFailed', (event) => {
      logger.error('MongoDB connection checkout failed', 'MONGODB_CONNECTION', {
        reason: event.reason
      });
    });
    
    client.on('connectionPoolCleared', (event) => {
      logger.error('MongoDB connection pool cleared', 'MONGODB_CONNECTION');
    });

    // Update connection info
    const updatedCache: CachedConnection = { 
      client, 
      db, 
      isConnecting: false,
      connectionCount: (cached?.connectionCount || 0) + 1,
      lastConnectionTime: Date.now(),
      requestsServedByThisConnection: 1,
      collections: {},
      lastHeartbeat: Date.now(),
      pendingOperations: cached?.pendingOperations || 0
    };
    
    // Store the updated cache globally
    cached = globalWithMongo.mongo = updatedCache;

    return {
      client,
      db,
      isNewConnection: true,
      connectionCount: updatedCache.connectionCount,
      requestsServedByThisConnection: updatedCache.requestsServedByThisConnection,
      pendingOperations: updatedCache.pendingOperations
    };
  } catch (error) {
    if (cached) {
      cached.isConnecting = false;
    }
    logger.error('MongoDB connection failed', 'MONGODB_CONNECTION', { errorMessage: (error as Error).message });
    throw error;
  }
}

/**
 * Get a MongoDB collection by name
 */
export async function getCollection<T extends Document = Document>(
  collectionName: keyof DatabaseCollections
): Promise<Collection<T>> {
  const { db } = await connectToDatabase();
  
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Check if we already have the collection cached
  if (cached && cached.collections[collectionName]) {
    return cached.collections[collectionName] as Collection<T>;
  }

  // Get the collection and cache it
  const collection = db.collection<T>(collectionName as string);
  
  if (cached) {
    cached.collections[collectionName] = collection;
  }

  return collection;
}

/**
 * Get all collections as an object
 */
export async function getCollections(): Promise<DatabaseCollections> {
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
    feedbackTickets: db.collection('feedbackTickets')
  };
}

/**
 * Get connection status for monitoring
 */
export function getConnectionStatus(): {
  isConnected: boolean;
  connectionAge: number | null;
  requestsServed: number;
  connectionCount: number;
} {
  if (!cached || !cached.client || !cached.db) {
    return {
      isConnected: false,
      connectionAge: null,
      requestsServed: 0,
      connectionCount: 0
    };
  }

  return {
    isConnected: true,
    connectionAge: Date.now() - cached.lastConnectionTime,
    requestsServed: cached.requestsServedByThisConnection,
    connectionCount: cached.connectionCount
  };
}

/**
 * Handle MongoDB operation completion
 * Call this when your DB operation is complete to release the operation hold
 */
export function completeOperation(operation: string): void {
  if (cached && cached.client && cached.db) {
    cached.pendingOperations = Math.max(0, (cached.pendingOperations || 1) - 1);
  }
}

/**
 * Close the MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  try {
    if (cached && cached.client) {
      await cached.client.close();
      cached.client = null;
      cached.db = null;
      cached.isConnecting = false;
    }
  } catch (error) {
    logger.error('Error closing MongoDB connection', 'MONGODB_CONNECTION', { errorMessage: (error as Error).message });
  }
}

// Utility functions for ObjectId handling
export { ObjectId } from 'mongodb';

export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export function createObjectId(id?: string): ObjectId {
  return new ObjectId(id);
} 