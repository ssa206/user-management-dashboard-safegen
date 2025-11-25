import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { downloadBlob, getBlobProperties } from '@/lib/blob';

// GET - Download or view a blob
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const container = searchParams.get('container');
    const blob = searchParams.get('blob');
    const mode = searchParams.get('mode') || 'download'; // 'download' or 'view'
    
    if (!container || !blob) {
      return NextResponse.json({ error: 'Container and blob name are required' }, { status: 400 });
    }
    
    // Get blob properties for content type
    const properties = await getBlobProperties(container, blob);
    
    // Download the blob
    const data = await downloadBlob(container, blob);
    
    // Set headers based on mode
    const headers = new Headers();
    headers.set('Content-Type', properties.contentType);
    headers.set('Content-Length', String(data.length));
    
    if (mode === 'view') {
      // For viewing inline (PDFs, images, etc.)
      headers.set('Content-Disposition', `inline; filename="${properties.name}"`);
    } else {
      // For downloading
      headers.set('Content-Disposition', `attachment; filename="${properties.name}"`);
    }
    
    return new NextResponse(data, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Error downloading blob:', error);
    return NextResponse.json(
      { error: 'Failed to download blob', details: error.message },
      { status: 500 }
    );
  }
}
