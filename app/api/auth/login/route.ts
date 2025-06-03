import { NextRequest, NextResponse } from 'next/server';
import { loginUser, checkRateLimit, clearRateLimit } from '@/lib/auth';
import { incrementPageView } from '@/lib/data';
import { withApiHandler, createSuccessResponse, validateRequestBody } from '@/lib/middleware';
import { logger, AppError } from '@/lib/logger';

const loginSchema = {
  username: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  password: { required: true, type: 'string', minLength: 1, maxLength: 128 }
};

// POST /api/auth/login - Admin authentication with enhanced security
export const POST = withApiHandler(async (req: NextRequest) => {
  try {
    // Validate request body
    const validateBody = validateRequestBody(loginSchema);
    const body = await validateBody(req);
    
    const { username, password } = body;
    const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Check rate limiting
    if (!checkRateLimit(username, 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
      logger.warn('Login rate limit exceeded', 'AUTH', { 
        username, 
        clientId,
        userAgent: req.headers.get('user-agent') 
      });
      
      throw new AppError('Too many login attempts. Please try again later.', 429, 'RATE_LIMIT');
    }
    
    // Additional rate limiting by IP
    if (!checkRateLimit(clientId, 10, 15 * 60 * 1000)) { // 10 attempts per IP per 15 minutes
      logger.warn('IP-based rate limit exceeded', 'AUTH', { 
        clientId,
        userAgent: req.headers.get('user-agent') 
      });
      
      throw new AppError('Too many requests from this IP. Please try again later.', 429, 'RATE_LIMIT');
    }
    
    // Sanitize and validate input
    const sanitizedUsername = username.trim().toLowerCase();
    
    if (!sanitizedUsername || !password) {
      throw new AppError('Username and password are required', 400, 'VALIDATION');
    }
    
    if (sanitizedUsername.length < 1 || sanitizedUsername.length > 50) {
      throw new AppError('Username must be between 1 and 50 characters', 400, 'VALIDATION');
    }
    
    if (password.length < 1 || password.length > 128) {
      throw new AppError('Password must be between 1 and 128 characters', 400, 'VALIDATION');
    }
    
    // Log login attempt
    logger.info('Login attempt', 'AUTH', {
      username: sanitizedUsername,
      clientId,
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });
    
    // Attempt authentication
    const authResult = await loginUser({
      username: sanitizedUsername,
      password
    });
    
    if (!authResult) {
      logger.warn('Authentication failed', 'AUTH', {
        username: sanitizedUsername,
        clientId,
        reason: 'invalid_credentials'
      });
      
      throw new AppError('Invalid username or password', 401, 'AUTH');
    }
    
    // Clear rate limits on successful login
    clearRateLimit(sanitizedUsername);
    clearRateLimit(clientId);
    
    // Track admin login analytics
    try {
      await incrementPageView('admin');
    } catch (error) {
      logger.warn('Failed to track admin login analytics', 'AUTH', { username: sanitizedUsername, error: (error as Error).message });
    }
    
    // Log successful login
    logger.info('Login successful', 'AUTH', {
      username: sanitizedUsername,
      userId: authResult.user.id,
      clientId
    });
    
    // Prepare response data
    const responseData = {
      token: authResult.token,
      user: {
        ...authResult.user,
        // Add additional user info if needed
        lastLoginTime: new Date().toISOString(),
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      expiresIn: '7d',
      tokenType: 'Bearer'
    };
    
    // Debug logging for response data
    console.log('🎯 LOGIN API - Preparing response data:');
    console.log('  Token:', responseData.token);
    console.log('  User:', responseData.user);
    console.log('  User JSON:', JSON.stringify(responseData.user));
    console.log('  Full response data:', responseData);
    
    // Return success response with enhanced data
    const response = createSuccessResponse(responseData, 'Login successful', 200, (req as any).requestId);
    
    console.log('🎯 LOGIN API - Final response object:');
    console.log('  Response:', response);
    
    return response;
    
  } catch (error) {
    // Enhanced error logging
    const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    if (error instanceof AppError) {
      // Log application errors with context
      logger.warn('Login application error', 'AUTH', {
        error: error.message,
        statusCode: error.statusCode,
        context: error.context,
        clientId,
        userAgent: req.headers.get('user-agent')
      });
      
      throw error;
    } else {
      // Log unexpected errors
      logger.error('Login unexpected error', 'AUTH', {
        clientId,
        userAgent: req.headers.get('user-agent'),
        url: req.url,
        method: req.method
      }, error as Error);
      
      throw new AppError('Authentication service temporarily unavailable', 500, 'AUTH');
    }
  }
}); 