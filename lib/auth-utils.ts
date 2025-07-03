import { authSupabase } from './auth-supabase';

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Require authentication enhanced - for API routes
 */
export async function requireAuthEnhanced(authHeader: string | null) {
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    throw new Error('No token provided');
  }
  
  const user = await authSupabase.getUserFromToken(token);
  
  if (!user) {
    throw new Error('Invalid token');
  }
  
  return user;
}

/**
 * Check if user is admin enhanced
 */
export function isAdminEnhanced(user: any): boolean {
  return user && (user.role === 'admin' || user.role === 'data_manager');
}

/**
 * Helper function to require authentication
 */
export function requireAuth(user: any) {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Helper function to require admin access
 */
export function requireAdmin(user: any) {
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!authSupabase.isAdmin(user)) {
    throw new Error('Admin access required');
  }
  return user;
} 