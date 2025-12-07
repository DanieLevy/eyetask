import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { AuthUser } from '@/lib/auth-supabase';
import { requireAdmin } from '@/lib/auth-utils';

/**
 * API Middleware for authentication and authorization
 * Reduces code duplication across API routes
 */

type ApiHandler<T = unknown> = (
  request: NextRequest,
  user: AuthUser,
  params?: T
) => Promise<Response>;

type ApiHandlerWithParams<T> = (
  request: NextRequest,
  context: { params: Promise<T> }
) => Promise<Response>;

/**
 * Middleware for routes that require any authenticated user
 * @param handler - The route handler function
 * @returns Wrapped handler with authentication
 */
export function withAuth<T = unknown>(
  handler: ApiHandler<T>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    try {
      const user = authService.extractUserFromRequest(request);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required', success: false },
          { status: 401 }
        );
      }

      return await handler(request, user);
    } catch (error) {
      console.error('[API Middleware] Auth error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', success: false },
        { status: 401 }
      );
    }
  };
}

/**
 * Middleware for routes that require admin access
 * @param handler - The route handler function
 * @returns Wrapped handler with admin authentication
 */
export function withAdminAuth<T = unknown>(
  handler: ApiHandler<T>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    try {
      const user = authService.extractUserFromRequest(request);
      const adminUser = requireAdmin(user);

      return await handler(request, adminUser);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        return NextResponse.json(
          { error: error.message, success: false },
          { status: error.message.includes('Admin') ? 403 : 401 }
        );
      }

      console.error('[API Middleware] Admin auth error:', error);
      return NextResponse.json(
        { error: 'Authorization failed', success: false },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for routes with dynamic params that require authentication
 * @param handler - The route handler function with params
 * @returns Wrapped handler with authentication and params support
 */
export function withAuthAndParams<T>(
  handler: (request: NextRequest, user: AuthUser, params: T) => Promise<Response>
): ApiHandlerWithParams<T> {
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    try {
      const user = authService.extractUserFromRequest(request);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required', success: false },
          { status: 401 }
        );
      }

      const params = await context.params;
      return await handler(request, user, params);
    } catch (error) {
      console.error('[API Middleware] Auth with params error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', success: false },
        { status: 401 }
      );
    }
  };
}

/**
 * Middleware for routes with dynamic params that require admin access
 * @param handler - The route handler function with params
 * @returns Wrapped handler with admin authentication and params support
 */
export function withAdminAuthAndParams<T>(
  handler: (request: NextRequest, user: AuthUser, params: T) => Promise<Response>
): ApiHandlerWithParams<T> {
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    try {
      const user = authService.extractUserFromRequest(request);
      const adminUser = requireAdmin(user);

      const params = await context.params;
      return await handler(request, adminUser, params);
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        return NextResponse.json(
          { error: error.message, success: false },
          { status: error.message.includes('Admin') ? 403 : 401 }
        );
      }

      console.error('[API Middleware] Admin auth with params error:', error);
      return NextResponse.json(
        { error: 'Authorization failed', success: false },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to validate required fields in request body
 * @param body - Request body
 * @param requiredFields - Array of required field names
 * @returns Validation error response or null if valid
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): NextResponse | null {
  for (const field of requiredFields) {
    if (!(field in body) || body[field] === undefined || body[field] === null) {
      return NextResponse.json(
        {
          error: `Missing required field: ${field}`,
          field,
          success: false
        },
        { status: 400 }
      );
    }
  }
  return null;
}

/**
 * Helper to create success response
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success format
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      ...data,
      success: true
    },
    { status }
  );
}

/**
 * Helper to create error response
 * @param error - Error message
 * @param status - HTTP status code (default: 500)
 * @param details - Additional error details
 * @returns NextResponse with error format
 */
export function errorResponse(
  error: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error,
      success: false,
      ...details
    },
    { status }
  );
}

