import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Parse form data from share target
    const formData = await request.formData();
    
    const title = formData.get('title') as string || '';
    const text = formData.get('text') as string || '';
    const url = formData.get('url') as string || '';
    const file = formData.get('file') as File || null;

    // Process shared content
    const sharedContent = {
      title: title.trim(),
      text: text.trim(),
      url: url.trim(),
      hasFile: file !== null,
      fileInfo: file ? {
        name: file.name,
        type: file.type,
        size: file.size
      } : null,
      timestamp: new Date().toISOString()
    };

    logger.info('Received shared content', 'SHARE_API', {
      hasTitle: !!title,
      hasText: !!text,
      hasUrl: !!url,
      hasFile: !!file
    });

    // Redirect to the app with shared content parameters
    const redirectUrl = new URL('/admin/tasks/new', request.url);
    redirectUrl.searchParams.set('shared', 'true');
    
    if (title) redirectUrl.searchParams.set('title', title);
    if (text) redirectUrl.searchParams.set('text', text);
    if (url) redirectUrl.searchParams.set('shared_url', url);
    if (file) {
      redirectUrl.searchParams.set('has_file', 'true');
      redirectUrl.searchParams.set('file_name', file.name);
      redirectUrl.searchParams.set('file_type', file.type);
      // Note: We can't pass the file content in a URL parameter
      // The receiving page will need to handle this limitation
    }

    return NextResponse.redirect(redirectUrl.toString());
    
  } catch (error) {
    logger.error('Error handling shared content', 'SHARE_API', {}, error as Error);
    
    // Fallback redirect to main app
    const fallbackUrl = new URL('/', request.url);
    return NextResponse.redirect(fallbackUrl.toString());
  }
}

// Handle GET requests (for debugging)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Share endpoint is working',
    method: 'POST',
    description: 'This endpoint receives shared content from the PWA share target'
  });
} 