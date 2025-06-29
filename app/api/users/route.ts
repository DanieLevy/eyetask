import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { auth, requireAdmin } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { createObjectId } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = auth.extractUserFromRequest(request);
    requireAdmin(user);
    
    const users = await db.getAllUsers();
    
    // Remove password hashes from response
    const sanitizedUsers = users.map(u => ({
      _id: u._id?.toString(),
      username: u.username,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      lastLogin: u.lastLogin?.toISOString(),
      createdBy: u.createdBy?.toString(),
      lastModifiedBy: u.lastModifiedBy?.toString(),
      lastModifiedAt: u.lastModifiedAt?.toISOString()
    }));
    
    return NextResponse.json({
      users: sanitizedUsers,
      total: users.length,
      success: true
    });
  } catch (error) {
    logger.error('Error fetching users', 'USERS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch users', success: false },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = auth.extractUserFromRequest(request);
    const adminUser = requireAdmin(user);
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.username || !body.email || !body.password || !body.role) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      );
    }
    
    // Validate role
    if (!['admin', 'data_manager'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Invalid role', success: false },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUserByEmail = await db.getUserByEmail(body.email);
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'Email already exists', success: false },
        { status: 400 }
      );
    }
    
    const existingUserByUsername = await db.getUserByUsername(body.username);
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'Username already exists', success: false },
        { status: 400 }
      );
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);
    
    // Create user
    const userId = await db.createUser({
      username: body.username,
      email: body.email,
      passwordHash,
      role: body.role,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdBy: createObjectId(adminUser.id)
    });
    
    logger.info('User created successfully', 'USERS_API', {
      userId,
      username: body.username,
      role: body.role,
      createdBy: adminUser.id
    });
    
    return NextResponse.json({
      userId,
      message: 'User created successfully',
      success: true
    }, { status: 201 });
    
  } catch (error) {
    logger.error('Error creating user', 'USERS_API', undefined, error as Error);
    return NextResponse.json(
      { error: 'Failed to create user', success: false },
      { status: 500 }
    );
  }
} 