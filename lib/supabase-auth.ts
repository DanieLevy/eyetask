import { supabase } from './supabase';
import { logger } from './logger';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

// Sign up admin user (one-time setup)
export async function signUpAdmin(): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@eyetask.com',
      password: 'admin123',
      options: {
        data: {
          username: 'admin',
          role: 'admin'
        }
      }
    });

    if (error) {
      logger.error('Failed to sign up admin', 'SUPABASE_AUTH', { error: error.message });
      return { success: false, error: error.message };
    }

    if (data.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || '',
        username: data.user.user_metadata?.username || 'admin',
        role: data.user.user_metadata?.role || 'admin'
      };

      logger.info('Admin user signed up successfully', 'SUPABASE_AUTH', { userId: authUser.id });
      return { success: true, user: authUser, token: data.session?.access_token };
    }

    return { success: false, error: 'Failed to create user' };
  } catch (error) {
    logger.error('Sign up error', 'SUPABASE_AUTH', undefined, error as Error);
    return { success: false, error: 'Sign up failed' };
  }
}

// Sign in with email/password
export async function signInWithPassword(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.error('Sign in failed', 'SUPABASE_AUTH', { email, error: error.message });
      return { success: false, error: error.message };
    }

    if (data.user && data.session) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || '',
        username: data.user.user_metadata?.username || 'admin',
        role: data.user.user_metadata?.role || 'admin'
      };

      logger.info('User signed in successfully', 'SUPABASE_AUTH', { userId: authUser.id });
      return { success: true, user: authUser, token: data.session.access_token };
    }

    return { success: false, error: 'Invalid credentials' };
  } catch (error) {
    logger.error('Sign in error', 'SUPABASE_AUTH', undefined, error as Error);
    return { success: false, error: 'Sign in failed' };
  }
}

// Login with username (convert to email)
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    // Convert username to email for Supabase Auth
    const email = credentials.username === 'admin' ? 'admin@eyetask.com' : `${credentials.username}@eyetask.com`;
    
    return await signInWithPassword(email, credentials.password);
  } catch (error) {
    logger.error('Login error', 'SUPABASE_AUTH', undefined, error as Error);
    return { success: false, error: 'Login failed' };
  }
}

// Verify JWT token
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      logger.debug('Token verification failed', 'SUPABASE_AUTH', { error: error?.message });
      return null;
    }

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email || '',
      username: data.user.user_metadata?.username || 'admin',
      role: data.user.user_metadata?.role || 'admin'
    };

    return authUser;
  } catch (error) {
    logger.error('Token verification error', 'SUPABASE_AUTH', undefined, error as Error);
    return null;
  }
}

// Sign out
export async function signOut(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Sign out failed', 'SUPABASE_AUTH', { error: error.message });
      return false;
    }

    logger.info('User signed out successfully', 'SUPABASE_AUTH');
    return true;
  } catch (error) {
    logger.error('Sign out error', 'SUPABASE_AUTH', undefined, error as Error);
    return false;
  }
}

// Check if user is admin
export function isAdmin(user?: AuthUser): boolean {
  return user?.role === 'admin';
}

// Initialize admin user (call this once during setup)
export async function initializeAdminUser(): Promise<void> {
  try {
    // Try to sign in first to see if admin exists
    const loginResult = await signInWithPassword('admin@eyetask.com', 'admin123');
    
    if (!loginResult.success) {
      // Admin doesn't exist, create it
      logger.info('Creating admin user', 'SUPABASE_AUTH');
      const signUpResult = await signUpAdmin();
      
      if (signUpResult.success) {
        logger.info('Admin user created successfully', 'SUPABASE_AUTH');
      } else {
        logger.error('Failed to create admin user', 'SUPABASE_AUTH', { error: signUpResult.error });
      }
    } else {
      logger.info('Admin user already exists', 'SUPABASE_AUTH');
    }
  } catch (error) {
    logger.error('Failed to initialize admin user', 'SUPABASE_AUTH', undefined, error as Error);
  }
} 