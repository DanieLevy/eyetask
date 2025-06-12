import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get a specific project by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid project ID', success: false },
        { status: 400 }
      );
    }
    
    const project = await db.getProjectById(id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', success: false },
        { status: 404 }
      );
    }

    // Ensure all fields are properly returned
    const projectResponse = {
      _id: project._id?.toString(),
      name: project.name,
      description: project.description,
      isActive: project.isActive !== undefined ? project.isActive : true,
      color: project.color || '#3B82F6',
      priority: project.priority || 1,
      clientName: project.clientName || '',
      clientEmail: project.clientEmail || '',
      clientPhone: project.clientPhone || '',
      notes: project.notes || '',
      image: project.image || '',
      createdAt: project.createdAt?.toISOString(),
      updatedAt: project.updatedAt?.toISOString()
    };

    return NextResponse.json({
      project: projectResponse,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', success: false },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project (admin only)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);

    if (!authorized || !isAdminEnhanced(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }

    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Project name is required', success: false },
        { status: 400 }
      );
    }
    
    const updated = await db.updateProject(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Project not found or not updated', success: false },
        { status: 404 }
      );
    }
    
    // Get the updated project to return
    const project = await db.getProjectById(id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found after update', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      project, 
      message: 'Project updated successfully',
      success: true 
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project', success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const { authorized, user } = await requireAuthEnhanced(token);

    if (!authorized || !isAdminEnhanced(user)) {
      return NextResponse.json(
        { error: 'Unauthorized access', success: false },
        { status: 401 }
      );
    }

    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    const deleted = await db.deleteProject(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Project not found', success: false },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Project deleted successfully', 
      success: true 
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', success: false },
      { status: 500 }
    );
  }
} 