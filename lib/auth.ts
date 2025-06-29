import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './database';
import { logger } from './logger';

// Enhanced JWT secret configuration for production
const JWT_SECRET = process.env.JWT_SECRET || 
                   process.env.NEXTAUTH_SECRET || 
                   process.env.SECRET_KEY ||
                   'fallback-secret-key-for-development-only';

// Ensure we have a proper secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'fallback-secret-key-for-development-only') {
  logger.error('JWT_SECRET not properly configured for production', 'AUTH');
}

const COOKIE_NAME = 'auth-token';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export class AuthService {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token with enhanced payload
  private generateToken(user: AuthUser): string {
    try {
      return jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role,
          iat: Math.floor(Date.now() / 1000),
          iss: 'drivertasks-app'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
    } catch (error) {
      logger.error('Error generating JWT token', 'AUTH', undefined, error as Error);
      throw new Error('Failed to generate authentication token');
    }
  }

  // Enhanced token verification with better error handling
  verifyToken(token: string): AuthUser | null {
    try {
      if (!token || token.trim() === '') {
        return null;
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Validate required fields
      if (!decoded.id || !decoded.username || !decoded.role) {
        logger.warn('Invalid token payload - missing required fields', 'AUTH');
        return null;
      }

      return {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token expired', 'AUTH');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token format', 'AUTH');
      } else {
        logger.error('Token verification failed', 'AUTH', undefined, error as Error);
      }
      return null;
    }
  }

  // Login with credentials
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string } | null> {
    try {
      const user = await db.getUserByUsername(credentials.username);
      
      if (!user) {
        logger.warn('Login attempt with unknown username', 'AUTH', { username: credentials.username });
        return null;
      }

      const isValidPassword = await this.verifyPassword(credentials.password, user.passwordHash);
      
      if (!isValidPassword) {
        logger.warn('Invalid password attempt', 'AUTH', { username: credentials.username });
        return null;
      }

      const authUser: AuthUser = {
        id: user._id!.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      };

      const token = this.generateToken(authUser);



      return { user: authUser, token };
    } catch (error) {
      logger.error('Login error', 'AUTH', undefined, error as Error);
      return null;
    }
  }

  // Register new user (admin only for now)
  async register(data: RegisterData): Promise<{ user: AuthUser; token: string } | null> {
    try {
      // Check if user already exists
      const existingUserByUsername = await db.getUserByUsername(data.username);
      if (existingUserByUsername) {
        logger.warn('Registration attempt with existing username', 'AUTH', { username: data.username });
        throw new Error('Username already exists');
      }

      const existingUserByEmail = await db.getUserByEmail(data.email);
      if (existingUserByEmail) {
        logger.warn('Registration attempt with existing email', 'AUTH', { email: data.email });
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const userId = await db.createUser({
        username: data.username,
        email: data.email,
        passwordHash,
        role: 'admin' // For now, all users are admin
      });

      const authUser: AuthUser = {
        id: userId,
        username: data.username,
        email: data.email,
        role: 'admin'
      };

      const token = this.generateToken(authUser);



      return { user: authUser, token };
    } catch (error) {
      logger.error('Registration error', 'AUTH', undefined, error as Error);
      return null;
    }
  }

  // Get user from token with database validation
  async getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
      const user = this.verifyToken(token);
      if (!user) {
        return null;
      }

      // Verify user still exists in database
      const dbUser = await db.getUserByUsername(user.username);
      if (!dbUser) {
        logger.warn('Token user no longer exists in database', 'AUTH', { username: user.username });
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Error getting user from token', 'AUTH', undefined, error as Error);
      return null;
    }
  }

  // Logout (client-side will remove token)
  logout(): void {
  }

  // Enhanced middleware helper to extract user from request
  extractUserFromRequest(req: Request): AuthUser | null {
    try {
      // Try to get token from Authorization header first (preferred for API calls)
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token && token.trim() !== '') {
          const user = this.verifyToken(token);
          if (user) {
            return user;
          }
        }
      }

      // Try to get token from cookie as fallback
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>);

        const token = cookies[COOKIE_NAME];
        if (token && token.trim() !== '') {
          const user = this.verifyToken(token);
          if (user) {
            return user;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error extracting user from request', 'AUTH', undefined, error as Error);
      return null;
    }
  }

  // Check if user is admin
  isAdmin(user: AuthUser | null): boolean {
    return user?.role === 'admin';
  }

  // Check if user is data manager
  isDataManager(user: AuthUser | null): boolean {
    return user?.role === 'data_manager';
  }

  // Check if user is driver manager
  isDriverManager(user: AuthUser | null): boolean {
    return user?.role === 'driver_manager';
  }

  // Check if user has access to data management features
  canManageData(user: AuthUser | null): boolean {
    return user?.role === 'admin' || user?.role === 'data_manager';
  }

  // Check if user can manage daily updates only
  canManageDailyUpdates(user: AuthUser | null): boolean {
    return user?.role === 'admin' || user?.role === 'driver_manager';
  }

  // Check if user has access to restricted admin features
  hasRestrictedAccess(user: AuthUser | null): boolean {
    // Only admins can access: analytics, cache management, feedback management, user management
    return user?.role === 'admin';
  }

  // Generate cookie string for setting auth token
  generateAuthCookie(token: string): string {
    const maxAge = 24 * 60 * 60; // 24 hours
    const isProduction = process.env.NODE_ENV === 'production';
    return `${COOKIE_NAME}=${token}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Max-Age=${maxAge}; Path=/`;
  }

  // Generate cookie string for clearing auth token
  clearAuthCookie(): string {
    return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
  }
}

// Export singleton instance
export const auth = new AuthService();

// Helper function for API routes to require authentication
export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

// Helper function for API routes to require admin authentication
export function requireAdmin(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!auth.isAdmin(user)) {
    throw new Error('Admin access required');
  }
  return user;
}

// Enhanced helper functions for API routes
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return token && token.trim() !== '' ? token : null;
}

export async function requireAuthEnhanced(token: string | null): Promise<{ authorized: boolean; user: AuthUser | null; error?: string }> {
  try {
    if (!token || token.trim() === '') {
      return { authorized: false, user: null, error: 'No token provided' };
    }
    
    const user = await auth.getUserFromToken(token);
    if (!user) {
      return { authorized: false, user: null, error: 'Invalid or expired token' };
    }
    
    return { 
      authorized: true, 
      user 
    };
  } catch (error) {
    logger.error('Error in requireAuthEnhanced', 'AUTH', undefined, error as Error);
    return { authorized: false, user: null, error: 'Authentication error' };
  }
}

export function isAdminEnhanced(user: AuthUser | null): boolean {
  return auth.isAdmin(user);
} 