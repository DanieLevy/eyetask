import { NextRequest, NextResponse } from 'next/server';

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

    // Here you could store the shared content in database
    // or process it according to your app's needs

    console.log('Received shared content:', sharedContent);

    // If there's a file, you might want to store it
    if (file) {
      // Example: store file temporarily or process it
      const buffer = await file.arrayBuffer();
      // Store buffer or process file content...
    }

    // Redirect to the app with shared content parameters
    const redirectUrl = new URL('/admin/tasks/new', request.url);
    redirectUrl.searchParams.set('shared', 'true');
    
    if (title) redirectUrl.searchParams.set('title', title);
    if (text) redirectUrl.searchParams.set('text', text);
    if (url) redirectUrl.searchParams.set('shared_url', url);
    if (file) redirectUrl.searchParams.set('has_file', 'true');

    return NextResponse.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('Error handling shared content:', error);
    
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