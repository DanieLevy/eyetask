import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByUsername, User } from './data';

const JWT_SECRET = process.env.JWT_SECRET || 'eyetask-mobileye-secret-key-2025';
const JWT_EXPIRES_IN = '7d';

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

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Login function
export async function loginUser(credentials: LoginCredentials): Promise<AuthToken | null> {
  try {
    const user = await getUserByUsername(credentials.username);
    
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await verifyPassword(credentials.password, user.passwordHash);
    
    if (!isPasswordValid) {
      return null;
    }
    
    const token = generateToken(user);
    
    // Remove password hash from returned user data
    const { passwordHash, ...userWithoutPassword } = user;
    
    return {
      token,
      user: userWithoutPassword,
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Middleware helper for protected routes
export function requireAuth(token?: string): { authorized: boolean; user?: Omit<User, 'passwordHash'> } {
  if (!token) {
    return { authorized: false };
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return { authorized: false };
  }
  
  return {
    authorized: true,
    user: {
      id: payload.userId,
      username: payload.username,
      email: '', // Would need to fetch from database if needed
      role: payload.role as 'admin',
      createdAt: '',
      lastLogin: null,
    },
  };
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

// Check if user is admin
export function isAdmin(user?: Omit<User, 'passwordHash'>): boolean {
  return user?.role === 'admin';
} 