import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getUserByUsername, User } from './data';
import { logger, AppError, validateRequired } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || '941efef2eb57df7ebdcaae4b62481d14cd53d97e6fc99641e4a3335668732766';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  token: string;
  user: Omit<User, 'passwordHash'>;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

// Hash password with enhanced error handling
export async function hashPassword(password: string): Promise<string> {
  try {
    validateRequired({ password }, ['password'], 'HASH_PASSWORD');
    
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400, 'HASH_PASSWORD');
    }
    
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    logger.debug('Password hashed successfully', 'AUTH');
    return hash;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Failed to hash password', 'AUTH', undefined, error as Error);
    throw new AppError('Password hashing failed', 500, 'HASH_PASSWORD');
  }
}

// Verify password with enhanced error handling
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    validateRequired({ password, hash }, ['password', 'hash'], 'VERIFY_PASSWORD');
    
    const isValid = await bcrypt.compare(password, hash);
    
    logger.debug(`Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`, 'AUTH');
    return isValid;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Password verification failed', 'AUTH', undefined, error as Error);
    return false;
  }
}

// Generate JWT token with enhanced error handling
export function generateToken(user: User): string {
  try {
    validateRequired({ user }, ['user'], 'GENERATE_TOKEN');
    validateRequired(user, ['id', 'username', 'role'], 'GENERATE_TOKEN');
    
    if (!JWT_SECRET || JWT_SECRET.length < 32) {
      logger.error('JWT_SECRET is not set or too short', 'AUTH');
      throw new AppError('JWT configuration error', 500, 'GENERATE_TOKEN');
    }
    
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
    
    // Use a simpler approach for JWT signing
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    
    logger.authLog('token_generated', user.username, true);
    return token;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Token generation failed', 'AUTH', { userId: user?.id }, error as Error);
    throw new AppError('Token generation failed', 500, 'GENERATE_TOKEN');
  }
}

// Verify JWT token with enhanced error handling
export function verifyToken(token: string): JWTPayload | null {
  try {
    validateRequired({ token }, ['token'], 'VERIFY_TOKEN');
    
    if (!JWT_SECRET) {
      logger.error('JWT_SECRET is not set', 'AUTH');
      return null;
    }
    
    // Use a simpler approach for JWT verification
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Additional validation
    if (!payload.userId || !payload.username || !payload.role) {
      logger.warn('Invalid token payload structure', 'AUTH', { payload });
      return null;
    }
    
    logger.debug('Token verified successfully', 'AUTH', { username: payload.username });
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired', 'AUTH', { error: error.message });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token', 'AUTH', { error: error.message });
    } else if (error instanceof AppError) {
      throw error;
    } else {
      logger.error('Token verification failed', 'AUTH', undefined, error as Error);
    }
    
    return null;
  }
}

// Login function with enhanced error handling
export async function loginUser(credentials: LoginCredentials): Promise<AuthToken | null> {
  try {
    validateRequired(credentials, ['username', 'password'], 'LOGIN_USER');
    
    // Sanitize username
    const username = credentials.username.trim().toLowerCase();
    
    if (username.length === 0) {
      throw new AppError('Username cannot be empty', 400, 'LOGIN_USER');
    }
    
    if (credentials.password.length === 0) {
      throw new AppError('Password cannot be empty', 400, 'LOGIN_USER');
    }
    
    logger.authLog('login_attempt', username);
    
    const user = await getUserByUsername(username);
    
    if (!user) {
      logger.authLog('login_failed', username, false, new Error('User not found'));
      // Don't reveal whether user exists or not
      return null;
    }
    
    const isPasswordValid = await verifyPassword(credentials.password, user.passwordHash);
    
    if (!isPasswordValid) {
      logger.authLog('login_failed', username, false, new Error('Invalid password'));
      return null;
    }
    
    const token = generateToken(user);
    
    // Remove password hash from returned user data
    const { passwordHash, ...userWithoutPassword } = user;
    
    logger.authLog('login_success', username, true);
    
    return {
      token,
      user: userWithoutPassword,
    };
  } catch (error) {
    if (error instanceof AppError) {
      logger.authLog('login_error', credentials?.username, false, error);
      throw error;
    }
    
    logger.error('Login error', 'AUTH', { username: credentials?.username }, error as Error);
    return null;
  }
}

// Middleware helper for protected routes with enhanced error handling
export function requireAuth(token?: string): { authorized: boolean; user?: Omit<User, 'passwordHash'>; error?: string } {
  try {
    if (!token) {
      logger.debug('No token provided', 'AUTH');
      return { authorized: false, error: 'No token provided' };
    }
    
    const payload = verifyToken(token);
    
    if (!payload) {
      logger.debug('Invalid token', 'AUTH');
      return { authorized: false, error: 'Invalid token' };
    }
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      logger.debug('Token expired', 'AUTH', { username: payload.username });
      return { authorized: false, error: 'Token expired' };
    }
    
    const user = {
      id: payload.userId,
      username: payload.username,
      email: '', // Would need to fetch from database if needed
      role: payload.role as 'admin',
      createdAt: '',
      lastLogin: null,
    };
    
    logger.debug('Auth successful', 'AUTH', { username: payload.username });
    
    return {
      authorized: true,
      user,
    };
  } catch (error) {
    logger.error('Auth middleware error', 'AUTH', undefined, error as Error);
    return { authorized: false, error: 'Authentication error' };
  }
}

// Extract token from Authorization header with validation
export function extractTokenFromHeader(authHeader?: string | null): string | undefined {
  try {
    if (!authHeader) {
      logger.debug('No authorization header', 'AUTH');
      return undefined;
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      logger.debug('Invalid authorization header format', 'AUTH', { header: authHeader.substring(0, 20) });
      return undefined;
    }
    
    const token = authHeader.substring(7);
    
    if (!token || token.length === 0) {
      logger.debug('Empty token in authorization header', 'AUTH');
      return undefined;
    }
    
    return token;
  } catch (error) {
    logger.error('Error extracting token from header', 'AUTH', { header: authHeader?.substring(0, 20) }, error as Error);
    return undefined;
  }
}

// Check if user is admin with enhanced validation
export function isAdmin(user?: Omit<User, 'passwordHash'>): boolean {
  try {
    if (!user) {
      logger.debug('No user provided for admin check', 'AUTH');
      return false;
    }
    
    if (!user.role) {
      logger.debug('No role defined for user', 'AUTH', { username: user.username });
      return false;
    }
    
    const isAdminUser = user.role === 'admin';
    
    logger.debug(`Admin check: ${isAdminUser}`, 'AUTH', { username: user.username, role: user.role });
    
    return isAdminUser;
  } catch (error) {
    logger.error('Error checking admin status', 'AUTH', { username: user?.username }, error as Error);
    return false;
  }
}

// Logout function (for token invalidation tracking)
export function logoutUser(username?: string): void {
  try {
    logger.authLog('logout', username, true);
  } catch (error) {
    logger.error('Error logging logout', 'AUTH', { username }, error as Error);
  }
}

// Validate password strength
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }
    
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain at least one letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    // Common weak passwords
    const weakPasswords = ['password', '123456', 'admin', 'admin123', 'password123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }
    
    const isValid = errors.length === 0;
    
    logger.debug(`Password validation: ${isValid}`, 'AUTH', { errorCount: errors.length });
    
    return { valid: isValid, errors };
  } catch (error) {
    logger.error('Error validating password strength', 'AUTH', undefined, error as Error);
    return { valid: false, errors: ['Password validation error'] };
  }
}

// Rate limiting helper (basic implementation)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(username: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  try {
    const now = Date.now();
    const key = username.toLowerCase();
    const attempts = loginAttempts.get(key);
    
    if (!attempts || (now - attempts.lastAttempt) > windowMs) {
      // Reset or create new entry
      loginAttempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    if (attempts.count >= maxAttempts) {
      logger.warn(`Rate limit exceeded for user: ${username}`, 'AUTH', { 
        attempts: attempts.count, 
        lastAttempt: new Date(attempts.lastAttempt).toISOString() 
      });
      return false;
    }
    
    // Increment attempt count
    attempts.count++;
    attempts.lastAttempt = now;
    loginAttempts.set(key, attempts);
    
    return true;
  } catch (error) {
    logger.error('Error checking rate limit', 'AUTH', { username }, error as Error);
    return true; // Allow on error to avoid blocking legitimate users
  }
}

// Clear rate limit for user (on successful login)
export function clearRateLimit(username: string): void {
  try {
    const key = username.toLowerCase();
    loginAttempts.delete(key);
    logger.debug(`Rate limit cleared for user: ${username}`, 'AUTH');
  } catch (error) {
    logger.error('Error clearing rate limit', 'AUTH', { username }, error as Error);
  }
} 