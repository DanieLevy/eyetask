import { NextRequest, NextResponse } from 'next/server';
import { logger, AppError } from './logger';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId: string;
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// API Error Handler
export function handleApiError<T = unknown>(error: unknown, requestId: string): NextResponse<ApiResponse<T>> {
  if (error instanceof AppError) {
    logger.error(`API Error [${requestId}]`, 'API', {
      statusCode: error.statusCode,
      context: error.context,
      message: error.message
    }, error);

    return NextResponse.json<ApiResponse<T>>({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      requestId
    }, { status: error.statusCode });
  }

  // Handle known error types
  if (error instanceof SyntaxError) {
    logger.error(`JSON Parse Error [${requestId}]`, 'API', { message: error.message }, error);
    
    return NextResponse.json<ApiResponse<T>>({
      success: false,
      error: 'Invalid JSON format',
      timestamp: new Date().toISOString(),
      requestId
    }, { status: 400 });
  }

  // Handle unexpected errors
  logger.error(`Unexpected Error [${requestId}]`, 'API', undefined, error as Error);
  
  return NextResponse.json<ApiResponse<T>>({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId
  }, { status: 500 });
}

// Success Response Helper
export function createSuccessResponse<T>(
  data: T, 
  message?: string, 
  status: number = 200,
  requestId?: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  }, { status });
}

// API Wrapper with logging and error handling
export function withApiHandler<T = unknown>(
  handler: (req: NextRequest, context: Record<string, unknown>) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (req: NextRequest, context: Record<string, unknown>): Promise<NextResponse<ApiResponse<T>>> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const method = req.method;
    const url = req.url;
    
    try {


      // Add request ID to request for use in handlers
      (req as NextRequest & { requestId?: string }).requestId = requestId;

      const response = await handler(req, context);

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error(`API Handler Error [${requestId}]`, 'API', {
        method,
        url,
        executionTime: `${executionTime}ms`
      }, error as Error);

      return handleApiError<T>(error, requestId);
    }
  };
}

// Request validation middleware
export function validateRequestBody(schema: Record<string, { required?: boolean; type?: string; minLength?: number; maxLength?: number; pattern?: RegExp }>) {
  return async (req: NextRequest): Promise<Record<string, unknown>> => {
    try {
      const body = await req.json();
      
      // Basic validation
      for (const [key, rules] of Object.entries(schema)) {
        const value = body[key];
        
        if (rules.required && (value === undefined || value === null)) {
          throw new AppError(`Missing required field: ${key}`, 400, 'VALIDATION');
        }
        
        if (value !== undefined && rules.type && typeof value !== rules.type) {
          throw new AppError(`Invalid type for field ${key}: expected ${rules.type}`, 400, 'VALIDATION');
        }
        
        if (rules.minLength && value && value.length < rules.minLength) {
          throw new AppError(`Field ${key} must be at least ${rules.minLength} characters`, 400, 'VALIDATION');
        }
        
        if (rules.maxLength && value && value.length > rules.maxLength) {
          throw new AppError(`Field ${key} must be no more than ${rules.maxLength} characters`, 400, 'VALIDATION');
        }
        
        if (rules.pattern && value && !rules.pattern.test(value)) {
          throw new AppError(`Invalid format for field ${key}`, 400, 'VALIDATION');
        }
      }
      
      return body;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error instanceof SyntaxError) {
        throw new AppError('Invalid JSON format', 400, 'VALIDATION');
      }
      
      throw new AppError('Request body validation failed', 400, 'VALIDATION');
    }
  };
}

// Rate limiting middleware (enhanced)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return (req: NextRequest): boolean => {
    try {
      const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old entries
      for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetTime < windowStart) {
          rateLimitStore.delete(key);
        }
      }
      
      const current = rateLimitStore.get(clientId) || { count: 0, resetTime: now + windowMs };
      
      if (current.resetTime < now) {
        // Reset window
        current.count = 1;
        current.resetTime = now + windowMs;
      } else {
        current.count++;
      }
      
      rateLimitStore.set(clientId, current);
      
      if (current.count > maxRequests) {
        logger.warn('Rate limit exceeded', 'RATE_LIMIT', {
          clientId,
          count: current.count,
          maxRequests,
          resetTime: new Date(current.resetTime).toISOString()
        });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Rate limit check failed', 'RATE_LIMIT', { clientId: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown' }, error as Error);
      return true; // Allow on error
    }
  };
}

// CORS middleware
export function handleCors(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  return null;
}

// Health check endpoint helper
export function createHealthCheckResponse(): NextResponse<ApiResponse> {
  return createSuccessResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  }, 'Service is healthy');
}

// Generic pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function paginate<T>(
  items: T[],
  params: PaginationParams
): PaginatedResponse<T> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20)); // Max 100 items per page
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  // Sort if requested
  const sortedItems = [...items];
  if (params.sortBy) {
    sortedItems.sort((a, b) => {
      const sortBy = params.sortBy;
      if (!sortBy) return 0;
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      
      // Handle null/undefined values
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      // Convert to comparable values
      const aCompare = typeof aVal === 'string' || typeof aVal === 'number' || aVal instanceof Date
        ? aVal
        : String(aVal);
      const bCompare = typeof bVal === 'string' || typeof bVal === 'number' || bVal instanceof Date
        ? bVal
        : String(bVal);
      
      if (aCompare < bCompare) return params.sortOrder === 'desc' ? 1 : -1;
      if (aCompare > bCompare) return params.sortOrder === 'desc' ? -1 : 1;
      return 0;
    });
  }
  
  const paginatedItems = sortedItems.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Request context helper
export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: { id: string; username: string; email?: string; role: string } | null;
  clientId: string;
}

export function createRequestContext(req: NextRequest): RequestContext {
  return {
    requestId: generateRequestId(),
    startTime: Date.now(),
    clientId: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
  };
} 