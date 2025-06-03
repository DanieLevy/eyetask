import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { incrementPageView } from '@/lib/data';

// POST /api/auth/login - Admin authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: 'Username and password are required', success: false },
        { status: 400 }
      );
    }
    
    const authResult = await loginUser({
      username: body.username,
      password: body.password,
    });
    
    if (!authResult) {
      return NextResponse.json(
        { error: 'Invalid credentials', success: false },
        { status: 401 }
      );
    }
    
    // Track admin login
    await incrementPageView('admin');
    
    return NextResponse.json({
      token: authResult.token,
      user: authResult.user,
      message: 'Login successful',
      success: true,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 