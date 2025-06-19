import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, requireAuthEnhanced, isAdminEnhanced } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getCloudinaryStats, cloudinary } from '@/lib/cloudinary-server';

// GET /api/admin/cloudinary - Get Cloudinary usage statistics and resource info
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        return await getStats();
      
      case 'resources':
        return await getResources(searchParams);
      
      case 'usage':
        return await getUsage();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action', success: false },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Cloudinary admin API error', 'CLOUDINARY_ADMIN', {}, error as Error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// POST /api/admin/cloudinary - Perform Cloudinary management actions
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'cleanup':
        return await cleanupUnusedResources(data);
      
      case 'delete':
        return await deleteResources(data);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action', success: false },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Cloudinary admin POST error', 'CLOUDINARY_ADMIN', {}, error as Error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

/**
 * Get comprehensive Cloudinary statistics
 */
async function getStats() {
  try {
    const [usage, resources, folders] = await Promise.all([
      cloudinary.api.usage(),
      cloudinary.api.resources({ max_results: 1 }),
      cloudinary.api.root_folders()
    ]);

    const stats = {
      usage: {
        plan: usage.plan,
        credits: {
          used: usage.credits?.usage || 0,
          limit: usage.credits?.limit || 0,
          used_percent: usage.credits?.used_percent || 0
        },
        objects: {
          used: usage.objects?.usage || 0,
          limit: usage.objects?.limit || 0,
          used_percent: usage.objects?.used_percent || 0
        },
        bandwidth: {
          used: usage.bandwidth?.usage || 0,
          limit: usage.bandwidth?.limit || 0,
          used_percent: usage.bandwidth?.used_percent || 0
        },
        storage: {
          used: usage.storage?.usage || 0,
          limit: usage.storage?.limit || 0,
          used_percent: usage.storage?.used_percent || 0
        },
        transformations: {
          used: usage.transformations?.usage || 0,
          limit: usage.transformations?.limit || 0,
          used_percent: usage.transformations?.used_percent || 0
        }
      },
      resources: {
        total: resources.total_count,
        folders: folders.folders?.length || 0
      },
      folders: folders.folders || []
    };

    logger.info('Cloudinary stats retrieved', 'CLOUDINARY_ADMIN', {
      totalResources: stats.resources.total,
      folders: stats.resources.folders,
      storageUsed: stats.usage.storage.used
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get Cloudinary stats', 'CLOUDINARY_ADMIN', {}, error as Error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics', success: false },
      { status: 500 }
    );
  }
}

/**
 * Get Cloudinary resources with filtering
 */
async function getResources(searchParams: URLSearchParams) {
  try {
    const folder = searchParams.get('folder') || '';
    const maxResults = parseInt(searchParams.get('max_results') || '50');
    const nextCursor = searchParams.get('next_cursor') || undefined;
    const resourceType = searchParams.get('resource_type') || 'image';
    const tags = searchParams.get('tags')?.split(',') || undefined;

    const options: any = {
      resource_type: resourceType,
      max_results: Math.min(maxResults, 500), // Limit to prevent abuse
      next_cursor: nextCursor
    };

    if (folder) {
      options.prefix = folder;
    }

    if (tags) {
      options.tags = true;
    }

    const result = await cloudinary.api.resources(options);

    // Enhance resources with additional info
    const enhancedResources = result.resources.map((resource: any) => ({
      ...resource,
      size_mb: (resource.bytes / 1024 / 1024).toFixed(2),
      created_date: new Date(resource.created_at).toLocaleDateString(),
      folder_path: resource.public_id.includes('/') ? resource.public_id.substring(0, resource.public_id.lastIndexOf('/')) : 'root',
      optimized_url: cloudinary.url(resource.public_id, {
        quality: 'auto:good',
        format: 'auto'
      })
    }));

    logger.info('Cloudinary resources retrieved', 'CLOUDINARY_ADMIN', {
      count: result.resources.length,
      folder,
      hasNextCursor: !!result.next_cursor
    });

    return NextResponse.json({
      success: true,
      data: {
        resources: enhancedResources,
        total_count: result.total_count,
        next_cursor: result.next_cursor,
        rate_limit_remaining: result.rate_limit_remaining
      }
    });

  } catch (error) {
    logger.error('Failed to get Cloudinary resources', 'CLOUDINARY_ADMIN', {}, error as Error);
    return NextResponse.json(
      { error: 'Failed to retrieve resources', success: false },
      { status: 500 }
    );
  }
}

/**
 * Get detailed usage information
 */
async function getUsage() {
  try {
    const usage = await cloudinary.api.usage();
    
    return NextResponse.json({
      success: true,
      data: usage
    });

  } catch (error) {
    logger.error('Failed to get Cloudinary usage', 'CLOUDINARY_ADMIN', {}, error as Error);
    return NextResponse.json(
      { error: 'Failed to retrieve usage', success: false },
      { status: 500 }
    );
  }
}

/**
 * Clean up unused Cloudinary resources
 */
async function cleanupUnusedResources(data: any) {
  try {
    const { dryRun = true, olderThan = 30, folder = '' } = data;
    
    logger.info('Starting Cloudinary cleanup', 'CLOUDINARY_CLEANUP', {
      dryRun,
      olderThan,
      folder
    });

    // Get all resources in the specified folder
    const resources = await cloudinary.api.resources({
      resource_type: 'image',
      prefix: folder,
      max_results: 500
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThan);

    const candidatesForDeletion = resources.resources.filter((resource: any) => {
      const createdDate = new Date(resource.created_at);
      return createdDate < cutoffDate;
    });

    if (dryRun) {
      logger.info('Dry run cleanup results', 'CLOUDINARY_CLEANUP', {
        totalResources: resources.resources.length,
        candidatesForDeletion: candidatesForDeletion.length,
        estimatedSavings: candidatesForDeletion.reduce((acc: number, r: any) => acc + r.bytes, 0)
      });

      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          totalResources: resources.resources.length,
          candidatesForDeletion: candidatesForDeletion.length,
          candidates: candidatesForDeletion.map((r: any) => ({
            public_id: r.public_id,
            created_at: r.created_at,
            bytes: r.bytes,
            url: r.secure_url
          })),
          estimatedSavings: candidatesForDeletion.reduce((acc: number, r: any) => acc + r.bytes, 0)
        }
      });
    }

    // Perform actual cleanup (implement with caution)
    const deletionResults = [];
    for (const resource of candidatesForDeletion) {
      try {
        const result = await cloudinary.uploader.destroy(resource.public_id);
        deletionResults.push({
          public_id: resource.public_id,
          result: result.result,
          success: result.result === 'ok'
        });
      } catch (error) {
        deletionResults.push({
          public_id: resource.public_id,
          result: 'error',
          success: false,
          error: (error as Error).message
        });
      }
    }

    const successfulDeletions = deletionResults.filter(r => r.success).length;

    logger.info('Cleanup completed', 'CLOUDINARY_CLEANUP', {
      totalCandidates: candidatesForDeletion.length,
      successfulDeletions,
      failedDeletions: deletionResults.length - successfulDeletions
    });

    return NextResponse.json({
      success: true,
      data: {
        dryRun: false,
        totalCandidates: candidatesForDeletion.length,
        successfulDeletions,
        failedDeletions: deletionResults.length - successfulDeletions,
        results: deletionResults
      }
    });

  } catch (error) {
    logger.error('Cloudinary cleanup failed', 'CLOUDINARY_CLEANUP', {}, error as Error);
    return NextResponse.json(
      { error: 'Cleanup operation failed', success: false },
      { status: 500 }
    );
  }
}

/**
 * Delete specific resources
 */
async function deleteResources(data: any) {
  try {
    const { publicIds = [], confirm = false } = data;

    if (!confirm) {
      return NextResponse.json(
        { error: 'Deletion must be confirmed', success: false },
        { status: 400 }
      );
    }

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return NextResponse.json(
        { error: 'No public IDs provided', success: false },
        { status: 400 }
      );
    }

    logger.info('Deleting specific resources', 'CLOUDINARY_DELETE', {
      count: publicIds.length,
      publicIds: publicIds.slice(0, 5) // Log first 5 for reference
    });

    const results = [];
    for (const publicId of publicIds) {
      try {
        const result = await cloudinary.uploader.destroy(publicId);
        results.push({
          publicId,
          result: result.result,
          success: result.result === 'ok'
        });
      } catch (error) {
        results.push({
          publicId,
          result: 'error',
          success: false,
          error: (error as Error).message
        });
      }
    }

    const successful = results.filter(r => r.success).length;

    logger.info('Resource deletion completed', 'CLOUDINARY_DELETE', {
      total: results.length,
      successful,
      failed: results.length - successful
    });

    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        successful,
        failed: results.length - successful,
        results
      }
    });

  } catch (error) {
    logger.error('Resource deletion failed', 'CLOUDINARY_DELETE', {}, error as Error);
    return NextResponse.json(
      { error: 'Deletion operation failed', success: false },
      { status: 500 }
    );
  }
}

 