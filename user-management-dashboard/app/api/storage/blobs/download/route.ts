import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { downloadBlob, getBlobProperties } from '@/lib/blob';

// GET - Download a blob
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const container = searchParams.get('container');
    const blob = searchParams.get('blob');
    
    if (!container || !blob) {
      return NextResponse.json({ error: 'Container and blob name are required' }, { status: 400 });
    }
    
    // Get blob properties for content type
    const properties = await getBlobProperties(container, blob);
    
    // Download the blob
    const data = await downloadBlob(container, blob);
    
    // Return as downloadable file
    const headers = new Headers();
    headers.set('Content-Type', properties.contentType);
    headers.set('Content-Disposition', `attachment; filename="${properties.name}"`);
    headers.set('Content-Length', String(data.length));
    
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

