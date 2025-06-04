import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './database';
import { logger } from './logger';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-here';
const COOKIE_NAME = 'auth-token';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'admin';
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export class AuthService {
  // Hash password
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  private generateToken(user: AuthUser): string {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Verify JWT token
  verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      logger.error('Token verification failed', 'AUTH', undefined, error as Error);
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

      logger.info('User logged in successfully', 'AUTH', { 
        username: user.username,
        email: user.email 
      });

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

      logger.info('User registered successfully', 'AUTH', { 
        username: data.username,
        email: data.email 
      });

      return { user: authUser, token };
    } catch (error) {
      logger.error('Registration error', 'AUTH', undefined, error as Error);
      return null;
    }
  }

  // Get user from token
  async getUserFromToken(token: string): Promise<AuthUser | null> {
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
  }

  // Logout (client-side will remove token)
  logout(): void {
    logger.info('User logged out', 'AUTH');
  }

  // Middleware helper to extract user from request
  extractUserFromRequest(req: Request): AuthUser | null {
    try {
      // Try to get token from Authorization header
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return this.verifyToken(token);
      }

      // Try to get token from cookie
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

        const token = cookies[COOKIE_NAME];
        if (token) {
          return this.verifyToken(token);
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

  // Generate cookie string for setting auth token
  generateAuthCookie(token: string): string {
    const maxAge = 24 * 60 * 60; // 24 hours
    return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`;
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

// Helper functions for API routes
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function requireAuthEnhanced(token: string | null): Promise<{ authorized: boolean; user: AuthUser | null }> {
  if (!token) {
    return { authorized: false, user: null };
  }
  
  const user = await auth.getUserFromToken(token);
  return { 
    authorized: user !== null, 
    user 
  };
}

export function isAdminEnhanced(user: AuthUser | null): boolean {
  return auth.isAdmin(user);
} 