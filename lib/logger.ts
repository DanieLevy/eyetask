interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

interface LogEntry {
  timestamp: string;
  level: keyof LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  executionTime?: number;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel = process.env.LOG_LEVEL || 'info';

  private shouldLog(level: keyof LogLevel): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context ? `[${entry.context}]` : '';
    const message = entry.message;
    
    let logMessage = `${timestamp} ${level} ${context} ${message}`;
    
    if (entry.data) {
      logMessage += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    if (entry.error) {
      logMessage += `\nError: ${entry.error.message}`;
      if (this.isDevelopment && entry.error.stack) {
        logMessage += `\nStack: ${entry.error.stack}`;
      }
    }
    
    return logMessage;
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const logMessage = this.formatLog(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
    }
  }

  error(message: string, context?: string, data?: any, error?: Error): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      data,
      error
    });
  }

  warn(message: string, context?: string, data?: any): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      data
    });
  }

  info(message: string, context?: string, data?: any): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      data
    });
  }

  debug(message: string, context?: string, data?: any): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
      data
    });
  }

  apiLog(req: any, res: any, executionTime?: number, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: error ? 'error' : 'info',
      message: error ? 'API Request Failed' : 'API Request Completed',
      context: 'API',
      endpoint: req.url,
      method: req.method,
      statusCode: res.status,
      executionTime,
      ip: req.headers['x-forwarded-for'] || req.ip,
      userAgent: req.headers['user-agent'],
      error
    };

    if (req.headers.authorization) {
      entry.data = { hasAuth: true };
    }

    this.writeLog(entry);
  }

  dataOperation(operation: string, entity: string, id?: string, data?: any, error?: Error): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: error ? 'error' : 'debug',
      message: `Data ${operation}: ${entity}${id ? ` (${id})` : ''}`,
      context: 'DATA',
      data: this.isDevelopment ? data : undefined,
      error
    });
  }

  authLog(operation: string, username?: string, success: boolean = true, error?: Error): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: success ? 'info' : 'warn',
      message: `Auth ${operation}: ${username || 'unknown'} - ${success ? 'SUCCESS' : 'FAILED'}`,
      context: 'AUTH',
      error
    });
  }
}

export const logger = new Logger();

// Error handling utilities
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public context?: string;

  constructor(message: string, statusCode: number = 500, context?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleAsync = (fn: Function) => (req: any, res: any, next?: any) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    logger.error('Unhandled async error', 'ASYNC', { url: req?.url, method: req?.method }, error);
    if (next) {
      next(error);
    } else {
      throw error;
    }
  });
};

export const validateRequired = (data: any, fields: string[], context: string = 'VALIDATION'): void => {
  const missing = fields.filter(field => !(field in data) || data[field] === null || data[field] === undefined);
  
  if (missing.length > 0) {
    logger.warn(`Missing required fields: ${missing.join(', ')}`, context, { provided: Object.keys(data), required: fields });
    throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400, context);
  }
};

export const safeJsonParse = (jsonString: string, defaultValue: any = null, context: string = 'JSON_PARSE'): any => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.error('JSON parse failed', context, { input: jsonString.substring(0, 100) }, error as Error);
    return defaultValue;
  }
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  context: string = 'RETRY'
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        logger.info(`Operation succeeded on attempt ${attempt}`, context);
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Operation failed on attempt ${attempt}/${maxRetries}`, context, { error: lastError.message });

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  logger.error(`Operation failed after ${maxRetries} attempts`, context, undefined, lastError!);
  throw lastError!;
}; 