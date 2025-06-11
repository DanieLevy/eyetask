import { MongoClient, Db, Collection, ObjectId, Document, ServerApiVersion, MongoClientOptions } from 'mongodb';
import { logger } from './logger';
import { logMongoConnectionDetails, PerformanceTracker, logMemoryUsage } from './enhanced-logging';
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

export interface CachedConnection {
  client: MongoClient | null;
  db: Db | null;
  isConnecting: boolean;
  connectionCount: number;
  lastConnectionTime: number;
  collections: Record<string, Collection>;
  requestsServedByThisConnection: number;
  lastHeartbeat: number;
  pendingOperations: number;
  operationHistory: { timestamp: number, operation: string }[];
  connectionID?: string;
}

/**
 * Convert string to ObjectId
 */
export function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch (error) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
}

/**
 * Convert ObjectId to string
 */
export function fromObjectId(id: ObjectId): string {
  return id.toString();
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
    pendingOperations: 0,
    operationHistory: []
  };
}

// Connection pool configuration
// These settings are optimized for a small team (~10 users) with high reliability
const CONNECTION_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,         // Limit max connections to avoid hitting limits
  minPoolSize: 5,          // Keep a minimum number of connections open for faster response
  connectTimeoutMS: 10000, // 10 seconds connection timeout
  socketTimeoutMS: 45000,  // 45 seconds socket timeout for operations
  waitQueueTimeoutMS: 5000, // 5 seconds max wait time for connection from pool
  maxConnecting: 2,        // Limit concurrent connection attempts (reduced from 5)
  maxIdleTimeMS: 300000,   // Close idle connections after 5 minutes (increased from 2 minutes)
  compressors: ['zlib'],   // Enable network compression
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
};

// Flag to prevent multiple connection monitoring setups
let isConnectionMonitoringSetup = false;

// Last connection check time
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 20; // Only log stats every 20 requests

// Heartbeat and cleanup interval (ms)
const HEARTBEAT_INTERVAL = 60000; // 1 minute
let heartbeatInterval: NodeJS.Timeout | null = null;

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
  // Create a tracker for this operation
  const tracker = new PerformanceTracker('MONGODB_CONNECTION', 'connectToDatabase');
  
  try {
    // If we already have a connection, reuse it
    if (cached && cached.client && cached.db) {
      // Update tracking info
      cached.requestsServedByThisConnection += 1;
      cached.lastHeartbeat = Date.now();
      cached.pendingOperations += 1;
      
      // Add to operation history with timestamp
      if (!cached.operationHistory) {
        cached.operationHistory = [];
      }
      
      // Keep a limited history (max 100 operations)
      if (cached.operationHistory.length >= 100) {
        cached.operationHistory.shift(); // Remove oldest
      }
      
      cached.operationHistory.push({
        timestamp: Date.now(),
        operation: 'connectToDatabase'
      });
      
      tracker.checkpoint('connection_reused');
      
      if (cached.requestsServedByThisConnection % 50 === 0) {
        // Log every 50 requests
        logger.info(`MongoDB connection reused ${cached.requestsServedByThisConnection} times`, 'MONGODB_CONNECTION', {
          connectionAge: `${Math.floor((Date.now() - cached.lastConnectionTime) / 1000)}s`,
          connectionCount: cached.connectionCount,
          pendingOperations: cached.pendingOperations
        });
      }
      
      tracker.finish({ reused: true, requestsServedByThisConnection: cached.requestsServedByThisConnection, pendingOperations: cached.pendingOperations });
      
      return {
        client: cached.client,
        db: cached.db,
        isNewConnection: false,
        connectionCount: cached.connectionCount || 1,
        requestsServedByThisConnection: cached.requestsServedByThisConnection,
        pendingOperations: cached.pendingOperations
      };
    }
    
    // If we reach here, we need a new connection
    return createNewConnection(tracker);
  } catch (error) {
    logger.error('MongoDB connection error', 'MONGODB_CONNECTION', { error: (error as Error).message });
    tracker.finish({ error: (error as Error).message });
    
    // Return null values to indicate connection failure
    return {
      client: null,
      db: null,
      isNewConnection: false,
      connectionCount: 0,
      requestsServedByThisConnection: 0,
      pendingOperations: 0
    };
  }
}

/**
 * Create a new MongoDB connection
 */
async function createNewConnection(tracker: PerformanceTracker): Promise<{
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

    logger.info('Establishing MongoDB connection', 'MONGODB_CONNECTION');
    tracker.checkpoint('connection_start');
    
    const client = new MongoClient(MONGODB_URI, CONNECTION_OPTIONS);
  
    // Time the connection attempt
    const connectStart = Date.now();
    await client.connect();
    const connectTime = Date.now() - connectStart;
    
    tracker.checkpoint('connected_to_server');
    logger.info(`MongoDB connected in ${connectTime}ms`, 'MONGODB_CONNECTION', {
      connectTime: `${connectTime}ms`
    });
  
    const db = client.db(MONGODB_DB_NAME);

    // Set up connection monitoring
    const clientAdmin = db.admin();
    
    // Set up connection monitoring only once
    if (!isConnectionMonitoringSetup) {
      isConnectionMonitoringSetup = true;
      
      setupConnectionMonitoring(client, clientAdmin);
      
      client.on('connectionPoolCreated', (event) => {
        logger.info(`MongoDB connection pool created`, 'MONGODB_POOL', { 
          maxPoolSize: event.options.maxPoolSize,
          minPoolSize: event.options.minPoolSize,
          maxConnecting: event.options.maxConnecting
        });
      });
      
      client.on('connectionPoolClosed', () => {
        logger.info('MongoDB connection pool closed', 'MONGODB_POOL');
      });
      
      client.on('connectionCreated', (event) => {
        logger.debug('MongoDB connection created', 'MONGODB_CONNECTION', {
          connectionId: event.connectionId
        });
      });
      
      client.on('connectionClosed', (event) => {
        // We'll log this but take additional action only if it's an unexpected closure
        logger.debug('MongoDB connection closed', 'MONGODB_CONNECTION', {
          connectionId: event.connectionId,
          reason: event.reason
        });
      });
      
      client.on('connectionCheckOutStarted', () => {
        logger.debug('MongoDB connection checkout started', 'MONGODB_CONNECTION');
      });
      
      client.on('connectionCheckOutFailed', (event) => {
        logger.warn('MongoDB connection checkout failed', 'MONGODB_CONNECTION', {
          reason: event.reason
        });
      });
      
      client.on('connectionPoolCleared', (event) => {
        logger.warn('MongoDB connection pool cleared', 'MONGODB_CONNECTION');
      });
    }

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
      pendingOperations: cached?.pendingOperations || 0,
      operationHistory: []
    };
    
    // Store the updated cache globally
    cached = globalWithMongo.mongo = updatedCache;
    
    // Log connection pool details right after connecting
    logMongoConnectionDetails(client);

    // Log server stats
    try {
      const serverStatus = await clientAdmin.serverStatus();
      logger.info('MongoDB server status', 'MONGODB_SERVER', {
        version: serverStatus.version,
        connections: serverStatus.connections,
        uptime: `${Math.round(serverStatus.uptime / 60 / 60)} hours`,
        opcounters: serverStatus.opcounters
      });
    } catch (error) {
      logger.warn('Failed to get MongoDB server status', 'MONGODB_SERVER', { error: (error as Error).message });
    }

    tracker.checkpoint('setup_complete');
    logger.info('MongoDB connection established successfully', 'MONGODB_CONNECTION');
    tracker.finish({ newConnection: true });

    return {
      client,
      db,
      isNewConnection: true,
      connectionCount: updatedCache.connectionCount,
      requestsServedByThisConnection: updatedCache.requestsServedByThisConnection,
      pendingOperations: updatedCache.pendingOperations
    };
  } catch (error) {
    logger.error('MongoDB connection failed', 'MONGODB_CONNECTION', { errorMessage: (error as Error).message });
    tracker.finish({ error: (error as Error).message });
    throw error;
  }
}

/**
 * Setup heartbeat to keep connection alive and monitor for stale connections
 */
function setupHeartbeat() {
  if (heartbeatInterval) {
    // Heartbeat already set up
    return;
  }

  heartbeatInterval = setInterval(async () => {
    try {
      // Check if cached is defined
      if (!cached) {
        return;
      }
      
      // If we have active pending operations, don't interfere
      if (cached.pendingOperations > 0) {
        return;
      }

      // If no activity for a while, ping to keep alive
      const timeSinceLastHeartbeat = Date.now() - cached.lastHeartbeat;
      if (timeSinceLastHeartbeat > HEARTBEAT_INTERVAL && cached.client && cached.db) {
        try {
          logger.debug('Sending MongoDB heartbeat ping', 'MONGODB_HEARTBEAT', {
            timeSinceLastActivity: `${Math.round(timeSinceLastHeartbeat / 1000)}s`
          });
          
          await cached.db.admin().ping();
          cached.lastHeartbeat = Date.now();
          
          // Log memory usage on heartbeat
          logMemoryUsage('MONGODB_HEARTBEAT');
        } catch (error) {
          logger.warn('MongoDB heartbeat failed', 'MONGODB_HEARTBEAT', {
            error: (error as Error).message
          });
        }
      }
    } catch (e) {
      // Do nothing on errors in the heartbeat
    }
  }, HEARTBEAT_INTERVAL);
  
  // Make sure the interval doesn't keep the process alive
  if (heartbeatInterval.unref) {
    heartbeatInterval.unref();
  }
}

/**
 * Setup connection monitoring
 */
async function setupConnectionMonitoring(client: MongoClient, admin: any) {
  // This would be used to set up any specialized monitoring
  try {
    // Periodically log connection pool statistics
    if (typeof setInterval !== 'undefined') {
      const monitorInterval = setInterval(async () => {
        try {
          if (!cached || !cached.client) {
            // Connection closed, clear interval
            clearInterval(monitorInterval);
            return;
          }
          
          logMongoConnectionDetails(client);
          logMemoryUsage();
          
          const status = await admin.serverStatus();
          logger.debug('MongoDB server status', 'MONGODB_SERVER', {
            connections: status.connections,
            network: status.network
          });
          
          // Analyze memory and connection usage to identify issues
          analyzeSystemState();
        } catch (error) {
          // Just silently fail for monitoring
        }
      }, 60000); // Every minute
      
      // Don't keep the process alive just for monitoring
      if (monitorInterval.unref) {
        monitorInterval.unref();
      }
    }
  } catch (error) {
    logger.warn('Failed to setup connection monitoring', 'MONGODB_CONNECTION', {
      error: (error as Error).message
    });
  }
}

/**
 * Analyze the current system state and log any issues
 */
function analyzeSystemState() {
  try {
    const memoryUsage = process.memoryUsage();
    
    // Check for potential memory leaks
    if (memoryUsage.arrayBuffers > 500 * 1024 * 1024) { // More than 500MB in array buffers
      logger.warn('High memory usage detected in arrayBuffers', 'MEMORY_WARNING', {
        arrayBuffers: `${(memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
      });
    }
    
    // If connection is being frequently recycled, log warning
    if (cached && cached.connectionCount > 20) {
      const timeSinceFirstConnection = Date.now() - cached.lastConnectionTime + (cached.connectionCount * 60000);
      const connectionsPerHour = cached.connectionCount / (timeSinceFirstConnection / 1000 / 60 / 60);
      
      if (connectionsPerHour > 10) { // More than 10 new connections per hour
        logger.warn('High connection turnover detected', 'CONNECTION_WARNING', {
          connectionsPerHour: connectionsPerHour.toFixed(2),
          totalConnections: cached.connectionCount
        });
      }
    }
  } catch (error) {
    // Ignore errors in analysis
  }
}

/**
 * Handle MongoDB errors with standardized logging
 */
export function handleMongoError(error: any, operation: string): void {
  const isNetworkError = error.message?.includes('network') || 
                         error.name === 'MongoNetworkError' ||
                         error.message?.includes('topology');
  
  if (isNetworkError) {
    logger.error(`MongoDB network error in ${operation}`, 'MONGODB_ERROR', {
      operation,
      errorType: 'network',
      errorMessage: error.message
    });
  } else {
    logger.error(`MongoDB error in ${operation}`, 'MONGODB_ERROR', {
      operation,
      errorType: error.name || 'unknown',
      errorMessage: error.message,
      errorCode: error.code
    });
  }
}

/**
 * Get the database from the connection
 */
export async function getDatabase(): Promise<Db> {
  const connection = await connectToDatabase();
  if (!connection || !connection.db) {
    throw new Error('Could not get database from connection.');
  }
  return connection.db;
}

/**
 * Get a collection with caching to avoid repeated lookups
 */
export async function getCollection<T extends Document = Document>(collectionName: string): Promise<Collection<T>> {
  // Get the MongoDB connection
  const { client, db } = await connectToDatabase();
  
  // Make sure we have a valid connection
  if (!client || !db) {
    throw new Error(`Failed to connect to MongoDB`);
  }
  
  // Access the cached connection to get collections
  if (!cached || !cached.collections) {
    // Initialize collections object if it doesn't exist
    if (cached) {
      cached.collections = {};
    }
  }
  
  // Check if collection is already cached
  if (cached && cached.collections[collectionName]) {
    // Use unknown as an intermediate type to avoid TypeScript errors
    return cached.collections[collectionName] as unknown as Collection<T>;
  }
  
  // Get the collection and cache it
  const collection = db.collection<T>(collectionName);
  if (!collection) {
    throw new Error(`Could not get collection: ${collectionName}`);
  }
  
  // Cache the collection for future use
  if (cached) {
    cached.collections[collectionName] = collection as unknown as Collection;
  }
  
  return collection;
}

/**
 * Get all collections needed for database operations
 */
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
    feedbackTickets: db.collection('feedbackTickets')
    };
  }

/**
 * Disconnect from MongoDB
 */
export async function disconnect(): Promise<void> {
  if (cached && cached.client) {
    // Clear heartbeat interval
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    await cached.client.close();
    cached.client = null;
    cached.db = null;
    cached.isConnecting = false;
    cached.collections = {};
      logger.info('MongoDB disconnected', 'MONGODB_CONNECTION');
    }
  }

/**
 * Test MongoDB connection
 */
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

// MongoDB Analytics Utilities
export interface AnalyticsEvent {
  _id?: string;
  timestamp?: Date;
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
  timestamp?: Date;
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

// Collection interfaces
export interface Project {
  _id?: ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  _id?: ObjectId;
  title: string;
  subtitle?: string;
  images?: string[];
  datacoNumber: string;
  description?: {
    main?: string;
    howToExecute?: string;
  };
  projectId: ObjectId;
  type: string[];
  locations: string[];
  amountNeeded?: number;
  targetCar: string[];
  lidar?: boolean;
  dayTime: string[];
  priority: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
    }

export interface Subtask {
  _id?: ObjectId;
  taskId: ObjectId;
  title: string;
  subtitle?: string;
  images?: string[];
  datacoNumber: string;
  type: 'events' | 'hours';
  amountNeeded?: number;
  labels: string[];
  targetCar: string[];
  weather?: 'Clear' | 'Fog' | 'Overcast' | 'Rain' | 'Snow' | 'Mixed';
  scene?: 'Highway' | 'Urban' | 'Rural' | 'Sub-Urban' | 'Test Track' | 'Mixed';
  dayTime: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  _id?: ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin';
  createdAt: Date;
  lastLogin?: Date;
    }

export interface Analytics {
  _id?: ObjectId;
  totalVisits: number;
  uniqueVisitors: number;
  dailyStats: Record<string, any>;
  pageViews: {
    admin: number;
    tasks: Record<string, any>;
    homepage: number;
    projects: Record<string, any>;
  };
  lastUpdated: Date;
}

export interface DailyUpdate {
  _id?: ObjectId;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: number;
  durationType: 'hours' | 'days' | 'permanent';
  durationValue?: number;
  expiresAt?: Date;
  isActive: boolean;
  isPinned: boolean;
  isHidden: boolean;
  targetAudience: string[];
  createdBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyUpdateSetting {
  _id?: ObjectId;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Handle MongoDB operation completion
 * Call this when your DB operation is complete to release the operation hold
 */
export function completeOperation(operation: string): void {
  if (cached && cached.client && cached.db) {
    // Always decrement by exactly 1 to prevent going negative
    cached.pendingOperations = Math.max(0, (cached.pendingOperations || 1) - 1);
    
    // Add to operation history
    if (cached.operationHistory) {
      // Keep a limited history (max 100 operations)
      if (cached.operationHistory.length >= 100) {
        cached.operationHistory.shift(); // Remove oldest
      }
      
      cached.operationHistory.push({
        timestamp: Date.now(),
        operation: `${operation}_completed`
      });
    }
    
    // Log when pendingOperations gets very high as that indicates a potential issue
    if ((cached.pendingOperations % 20) === 0 && cached.pendingOperations > 50) {
      logger.warn('High number of pending MongoDB operations', 'MONGODB_CONNECTION', {
        pendingOperations: cached.pendingOperations,
        connectionAge: `${Math.floor((Date.now() - cached.lastConnectionTime) / 1000)}s`
      });
    }
  }
}

/**
 * Get the current connection status
 */
export function getConnectionStatus(): {
  isConnected: boolean;
  lastHeartbeat: number | null;
  connectionAge: number | null;
  requestsServed: number;
  pendingOperations: number;
  connectionID?: string;
} {
  if (!cached || !cached.client) {
    return {
      isConnected: false,
      lastHeartbeat: null,
      connectionAge: null,
      requestsServed: 0,
      pendingOperations: 0
    };
  }
  
  return {
    isConnected: true,
    lastHeartbeat: cached.lastHeartbeat,
    connectionAge: cached.lastConnectionTime ? Date.now() - cached.lastConnectionTime : null,
    requestsServed: cached.requestsServedByThisConnection,
    pendingOperations: cached.pendingOperations,
    connectionID: cached.connectionID
  };
}

/**
 * Maintain connection health
 * This sends a heartbeat command to prevent idle timeout and connection cycling
 */
export async function maintainConnection(): Promise<boolean> {
  if (!cached || !cached.client || !cached.db) {
    return false;
  }
  
  try {
    // Skip if there are active operations
    if (cached.pendingOperations > 0) {
      cached.lastHeartbeat = Date.now(); // Update heartbeat time anyway
      return true;
    }
    
    // Calculate time since last heartbeat
    const idleTime = Date.now() - cached.lastHeartbeat;
    
    // If idle for more than 4 minutes, send a ping to keep the connection alive
    // This helps prevent the idle timeout (which is often 5-10 minutes)
    if (idleTime > 4 * 60 * 1000) {
      logger.debug('Sending MongoDB heartbeat to maintain connection', 'MONGODB_HEARTBEAT', {
        idleTime: `${Math.floor(idleTime / 1000)}s`,
        connectionAge: `${Math.floor((Date.now() - cached.lastConnectionTime) / 1000)}s`
      });
      
      // Send a lightweight ping command
      await cached.db.command({ ping: 1 });
      
      // Update heartbeat time
      cached.lastHeartbeat = Date.now();
      
      return true;
    }
    
    return true;
  } catch (error) {
    logger.warn('Failed to maintain MongoDB connection', 'MONGODB_HEARTBEAT', {
      error: (error as Error).message
    });
    return false;
  }
} 