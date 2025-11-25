import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listBlobs, listAllBlobs, uploadBlob, deleteBlob, setBlobMetadata } from '@/lib/blob';
import { getDb } from '@/lib/db';

interface UserMapping {
  [key: string]: {
    id: string;
    name?: string;
    email?: string;
  };
}

// GET blobs from a container
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const container = searchParams.get('container');
    const prefix = searchParams.get('prefix') || undefined;
    const flat = searchParams.get('flat') === 'true';
    const search = searchParams.get('search') || '';
    const userFilter = searchParams.get('user') || '';
    
    if (!container) {
      return NextResponse.json({ error: 'Container name is required' }, { status: 400 });
    }
    
    let blobs;
    let directories: string[] = [];
    
    if (flat) {
      blobs = await listAllBlobs(container);
    } else {
      const result = await listBlobs(container, prefix);
      blobs = result.blobs;
      directories = result.directories;
    }
    
    // Fetch users from database for mapping
    const db = getDb();
    let userMapping: UserMapping = {};
    
    try {
      const usersResult = await db.query('SELECT id, name, email FROM users');
      usersResult.rows.forEach((user: any) => {
        // Map by various identifiers
        userMapping[String(user.id)] = user;
        if (user.email) {
          userMapping[user.email.toLowerCase()] = user;
        }
        if (user.name) {
          userMapping[user.name.toLowerCase()] = user;
        }
      });
    } catch (dbError) {
      console.warn('Could not fetch users for mapping:', dbError);
    }
    
    // Enrich blobs with user information
    const enrichedBlobs = blobs.map(blob => {
      let matchedUser = null;
      
      // Try to match user from extracted identifier
      if (blob.userIdentifier) {
        const identifier = blob.userIdentifier.toLowerCase();
        matchedUser = userMapping[identifier] || userMapping[blob.userIdentifier];
      }
      if (!matchedUser && blob.userId) {
        matchedUser = userMapping[blob.userId];
      }
      
      return {
        ...blob,
        matchedUser,
      };
    });
    
    // Apply search filter
    let filteredBlobs = enrichedBlobs;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredBlobs = filteredBlobs.filter(blob => 
        blob.name.toLowerCase().includes(searchLower) ||
        blob.fullPath.toLowerCase().includes(searchLower) ||
        blob.matchedUser?.name?.toLowerCase().includes(searchLower) ||
        blob.matchedUser?.email?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply user filter
    if (userFilter) {
      filteredBlobs = filteredBlobs.filter(blob => 
        blob.matchedUser?.id === userFilter ||
        blob.userId === userFilter ||
        blob.userIdentifier === userFilter
      );
    }
    
    // Get unique users for filter dropdown
    const uniqueUsers = new Map();
    enrichedBlobs.forEach(blob => {
      if (blob.matchedUser) {
        uniqueUsers.set(blob.matchedUser.id, blob.matchedUser);
      } else if (blob.userIdentifier) {
        uniqueUsers.set(blob.userIdentifier, { id: blob.userIdentifier, name: blob.userIdentifier });
      }
    });
    
    return NextResponse.json({ 
      blobs: filteredBlobs,
      directories,
      users: Array.from(uniqueUsers.values()),
      totalCount: enrichedBlobs.length,
      filteredCount: filteredBlobs.length,
    });
  } catch (error: any) {
    console.error('Error listing blobs:', error);
    return NextResponse.json(
      { error: 'Failed to list blobs', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Upload blob
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const container = formData.get('container') as string;
    const path = formData.get('path') as string || '';
    const userId = formData.get('userId') as string || '';
    
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    
    if (!container) {
      return NextResponse.json({ error: 'Container name is required' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const blobName = path ? `${path}/${file.name}` : file.name;
    
    const metadata: Record<string, string> = {};
    if (userId) {
      metadata.userId = userId;
    }
    
    const blob = await uploadBlob(container, blobName, buffer, metadata, file.type);
    
    return NextResponse.json({ blob }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading blob:', error);
    return NextResponse.json(
      { error: 'Failed to upload blob', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete blob
export async function DELETE(request: NextRequest) {
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
    
    await deleteBlob(container, blob);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting blob:', error);
    return NextResponse.json(
      { error: 'Failed to delete blob', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update blob metadata
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { container, blob, metadata } = await request.json();
    
    if (!container || !blob) {
      return NextResponse.json({ error: 'Container and blob name are required' }, { status: 400 });
    }
    
    await setBlobMetadata(container, blob, metadata || {});
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating blob metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update blob metadata', details: error.message },
      { status: 500 }
    );
  }
}

