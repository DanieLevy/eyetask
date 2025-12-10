import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { logger } from './logger';
import { getUserPermissions } from './permissions';
import { getSupabaseClient } from './supabase';
import { supabaseDb } from './supabase-database';

// Enhanced JWT secret configuration for production
const JWT_SECRET = process.env.JWT_SECRET || 
                   process.env.NEXTAUTH_SECRET || 
                   process.env.SECRET_KEY ||
                   'fallback-secret-key-for-development-only';

// Ensure we have a proper secret in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'fallback-secret-key-for-development-only') {
  logger.error('JWT_SECRET not properly configured for production', 'AUTH_SUPABASE');
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

export class SupabaseAuthService {
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
          iss: 'eyetask-app'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
    } catch (error) {
      logger.error('Error generating JWT token', 'AUTH_SUPABASE', undefined, error as Error);
      throw new Error('Failed to generate authentication token');
    }
  }

  // Enhanced token verification with better error handling
  verifyToken(token: string): AuthUser | null {
    try {
      if (!token || token.trim() === '') {
        return null;
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; email?: string; role: string };
      
      // Validate required fields
      if (!decoded.id || !decoded.username || !decoded.role) {
        logger.warn('Invalid token payload - missing required fields', 'AUTH_SUPABASE');
        return null;
      }
      
      return {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email || '',
        role: decoded.role
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token expired', 'AUTH_SUPABASE');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token format', 'AUTH_SUPABASE');
      } else {
        logger.error('Token verification failed', 'AUTH_SUPABASE', undefined, error as Error);
      }
      return null;
    }
  }

  /**
   * Verify a user's token exists and is active (async)
   */
  async verifyTokenAsync(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const supabase = getSupabaseClient(true); // Use admin client
      
      // Check if user still exists and is active
      const { data: user, error } = await supabase
        .from('app_users')
        .select('id, is_active')
        .eq('id', decoded.id)
        .single();
      
      if (error || !user || user.is_active === false) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user from token with permissions
   */
  async getUserFromToken(token: string): Promise<(AuthUser & { permissions?: Record<string, boolean> }) | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const supabase = getSupabaseClient(true); // Use admin client
      
      // Get user data
      const { data: user, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', decoded.id)
        .single();
      
      if (error || !user || user.is_active === false) {
        return null;
      }
      
      // Get permissions
      const permissions = await getUserPermissions(user.id);
      
      return {
        ...user,
        permissions
      };
    } catch {
      return null;
    }
  }

  /**
   * Login user
   */
  async login(
    username: string, 
    password: string
  ): Promise<{ 
    success: boolean; 
    error?: string; 
    token?: string; 
    user?: AuthUser;
    permissions?: Record<string, boolean>;
  }> {
    logger.info('LOGIN METHOD START', 'AUTH_SERVICE', { username });
    
    try {
      logger.info('Getting Supabase admin client', 'AUTH_SERVICE');
      const supabase = getSupabaseClient(true); // Use admin client to bypass RLS
      
      // Find user by username
      logger.info('Querying database for user', 'AUTH_SERVICE', { username });
      const { data: user, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username)
        .single();
      
      logger.info('Database query result', 'AUTH_SERVICE', { 
        found: !!user, 
        hasError: !!error, 
        errorMessage: error?.message 
      });
      
      if (error || !user) {
        logger.warn('Login failed: User not found', 'AUTH', { username });
        return { success: false, error: 'שם משתמש או סיסמה שגויים' };
      }
      
      logger.info('User found', 'AUTH_SERVICE', { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        isActive: user.is_active 
      });
      
      // Check if user is active
      if (user.is_active === false) {
        logger.warn('Login failed: User is inactive', 'AUTH', { username });
        return { success: false, error: 'החשבון אינו פעיל' };
      }
      
      // Verify password
      logger.info('Verifying password', 'AUTH_SERVICE');
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      logger.info('Password verification result', 'AUTH_SERVICE', { isPasswordValid });
      
      if (!isPasswordValid) {
        logger.warn('Login failed: Invalid password', 'AUTH', { username });
        return { success: false, error: 'שם משתמש או סיסמה שגויים' };
      }
      
      // Update last login
      logger.info('Updating last login timestamp', 'AUTH_SERVICE');
      await supabase
        .from('app_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
      
      // Get user permissions
      logger.info('Fetching user permissions', 'AUTH_SERVICE');
      const permissions = await getUserPermissions(user.id);
      logger.info('Permissions fetched', 'AUTH_SERVICE', { permissionsCount: Object.keys(permissions).length });
      
      // Generate JWT token
      logger.info('Generating JWT token', 'AUTH_SERVICE');
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      logger.info('JWT token generated successfully', 'AUTH_SERVICE');
      
      logger.info('User logged in successfully', 'AUTH', { userId: user.id, username: user.username });
      logger.info('LOGIN METHOD END (SUCCESS)', 'AUTH_SERVICE');
      
      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        permissions
      };
    } catch (error) {
      logger.error('Login error', 'AUTH', { error: (error as Error).message });
      return { success: false, error: 'שגיאה בהתחברות' };
    }
  }

  // Register new user (admin only for now)
  async register(data: RegisterData): Promise<{ user: AuthUser; token: string } | null> {
    try {
      // Check if user already exists
      const existingUserByUsername = await supabaseDb.getUserByUsername(data.username);
      if (existingUserByUsername) {
        logger.warn('Registration attempt with existing username', 'AUTH_SUPABASE', { username: data.username });
        throw new Error('Username already exists');
      }

      const existingUserByEmail = await supabaseDb.getUserByEmail(data.email);
      if (existingUserByEmail) {
        logger.warn('Registration attempt with existing email', 'AUTH_SUPABASE', { email: data.email });
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const userId = await supabaseDb.createUser({
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

      logger.info('User registered successfully', 'AUTH_SUPABASE', { userId, username: data.username });

      return { user: authUser, token };
    } catch (error) {
      logger.error('Registration error', 'AUTH_SUPABASE', undefined, error as Error);
      return null;
    }
  }

  // Logout (client-side will remove token)
  logout(): void {
    // Client-side operation
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
      logger.error('Error extracting user from request', 'AUTH_SUPABASE', undefined, error as Error);
      return null;
    }
  }

  // Check if user is admin
  isAdmin(user: AuthUser | null): boolean {
    return user?.role === 'admin';
  }

  // Check if user is admin (alternative method for consistency)
  checkIsAdmin(user: AuthUser | null): boolean {
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
export const authSupabase = new SupabaseAuthService();

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
  if (!authSupabase.isAdmin(user)) {
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
    
    const user = await authSupabase.getUserFromToken(token);
    if (!user) {
      return { authorized: false, user: null, error: 'Invalid or expired token' };
    }
    
    return { 
      authorized: true, 
      user 
    };
  } catch (error) {
    logger.error('Error in requireAuthEnhanced', 'AUTH_SUPABASE', undefined, error as Error);
    return { authorized: false, user: null, error: 'Authentication error' };
  }
}

export function isAdminEnhanced(user: AuthUser | null): boolean {
  return authSupabase.isAdmin(user);
} 