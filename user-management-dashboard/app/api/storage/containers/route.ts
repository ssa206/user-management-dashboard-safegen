import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listContainers, createContainer } from '@/lib/blob';

// GET all containers
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if connection string is configured
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      console.error('AZURE_STORAGE_CONNECTION_STRING is not set');
      return NextResponse.json(
        { error: 'Azure Storage not configured. Please set AZURE_STORAGE_CONNECTION_STRING in .env.local' },
        { status: 500 }
      );
    }

    const containers = await listContainers();
    
    return NextResponse.json({ containers });
  } catch (error: any) {
    console.error('Error listing containers:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to list containers';
    if (error.code === 'AuthenticationFailed') {
      errorMessage = 'Azure authentication failed. Check your connection string.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Cannot connect to Azure Storage. Check your network connection.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage, code: error.code },
      { status: 500 }
    );
  }
}

// POST - Create new container
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Container name is required' }, { status: 400 });
    }
    
    await createContainer(name);
    
    return NextResponse.json({ success: true, containerName: name }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating container:', error);
    return NextResponse.json(
      { error: 'Failed to create container', details: error.message },
      { status: 500 }
    );
  }
}

