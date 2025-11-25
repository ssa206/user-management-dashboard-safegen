import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { downloadBlob, getBlobProperties } from '@/lib/blob';
import mammoth from 'mammoth';

// GET - Get preview content for documents
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
    
    // Get blob properties
    const properties = await getBlobProperties(container, blob);
    const ext = properties.name.split('.').pop()?.toLowerCase() || '';
    
    // Download the blob
    const data = await downloadBlob(container, blob);
    
    // Handle .docx files - convert to HTML
    if (ext === 'docx') {
      try {
        const result = await mammoth.convertToHtml({ buffer: data });
        return NextResponse.json({ 
          type: 'html',
          content: result.value,
          messages: result.messages 
        });
      } catch (conversionError: any) {
        return NextResponse.json({ 
          error: 'Failed to convert document', 
          details: conversionError.message 
        }, { status: 500 });
      }
    }
    
    // Handle .doc files (older format) - mammoth doesn't support these well
    if (ext === 'doc') {
      return NextResponse.json({ 
        type: 'unsupported',
        message: 'Legacy .doc format is not supported for preview. Please download the file.' 
      });
    }
    
    // Handle .xlsx and .xls - return as unsupported for now
    if (ext === 'xlsx' || ext === 'xls') {
      return NextResponse.json({ 
        type: 'unsupported',
        message: 'Excel files cannot be previewed. Please download the file.' 
      });
    }
    
    // Handle .pptx and .ppt - return as unsupported for now
    if (ext === 'pptx' || ext === 'ppt') {
      return NextResponse.json({ 
        type: 'unsupported',
        message: 'PowerPoint files cannot be previewed. Please download the file.' 
      });
    }
    
    return NextResponse.json({ 
      type: 'unsupported',
      message: 'This file type cannot be previewed.' 
    });
    
  } catch (error: any) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: error.message },
      { status: 500 }
    );
  }
}

