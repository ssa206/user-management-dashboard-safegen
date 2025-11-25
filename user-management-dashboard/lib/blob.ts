import { BlobServiceClient, ContainerClient, BlobItem, ContainerItem } from '@azure/storage-blob';

let blobServiceClient: BlobServiceClient | null = null;

export function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    let connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }
    
    // Auto-append EndpointSuffix if missing
    if (!connectionString.includes('EndpointSuffix=')) {
      connectionString = connectionString.replace(/;?\s*$/, '') + ';EndpointSuffix=core.windows.net';
    }
    
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

export function getContainerClient(containerName: string): ContainerClient {
  return getBlobServiceClient().getContainerClient(containerName);
}

export interface BlobInfo {
  name: string;
  containerName: string;
  fullPath: string;
  size: number;
  contentType: string;
  lastModified: Date;
  createdOn?: Date;
  metadata: Record<string, string>;
  isDirectory: boolean;
  userId?: string; // Extracted user ID if found
  userIdentifier?: string; // Could be ID, email, or name
}

export interface ContainerInfo {
  name: string;
  lastModified?: Date;
  metadata: Record<string, string>;
}

// List all containers
export async function listContainers(): Promise<ContainerInfo[]> {
  const client = getBlobServiceClient();
  const containers: ContainerInfo[] = [];
  
  for await (const container of client.listContainers({ includeMetadata: true })) {
    containers.push({
      name: container.name,
      lastModified: container.properties.lastModified,
      metadata: container.metadata || {},
    });
  }
  
  return containers;
}

// Extract potential user identifier from blob path or metadata
function extractUserIdentifier(blob: BlobItem, containerName: string): { userId?: string; userIdentifier?: string } {
  const result: { userId?: string; userIdentifier?: string } = {};
  
  // Check metadata first
  if (blob.metadata) {
    if (blob.metadata.userid || blob.metadata.userId || blob.metadata.user_id) {
      result.userId = blob.metadata.userid || blob.metadata.userId || blob.metadata.user_id;
      result.userIdentifier = result.userId;
    }
    if (blob.metadata.useremail || blob.metadata.userEmail || blob.metadata.email) {
      result.userIdentifier = blob.metadata.useremail || blob.metadata.userEmail || blob.metadata.email;
    }
    if (blob.metadata.username || blob.metadata.userName || blob.metadata.user) {
      result.userIdentifier = result.userIdentifier || blob.metadata.username || blob.metadata.userName || blob.metadata.user;
    }
  }
  
  // Try to extract from path patterns like:
  // - users/{userId}/...
  // - user_{userId}/...
  // - {userId}/...
  // - profiles/{email}/...
  const pathParts = blob.name.split('/');
  
  // Pattern: users/{id}/... or user/{id}/...
  const userFolderIndex = pathParts.findIndex(p => 
    p.toLowerCase() === 'users' || p.toLowerCase() === 'user'
  );
  if (userFolderIndex !== -1 && pathParts[userFolderIndex + 1]) {
    result.userId = result.userId || pathParts[userFolderIndex + 1];
    result.userIdentifier = result.userIdentifier || pathParts[userFolderIndex + 1];
  }
  
  // Pattern: user_{id}_... (underscore separated at start of filename)
  const fileName = pathParts[pathParts.length - 1];
  const userPrefixMatch = fileName.match(/^user[_-](\w+)[_-]/i);
  if (userPrefixMatch) {
    result.userId = result.userId || userPrefixMatch[1];
    result.userIdentifier = result.userIdentifier || userPrefixMatch[1];
  }
  
  // UUID pattern in first folder (common for user-specific storage)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (pathParts[0] && uuidPattern.test(pathParts[0])) {
    result.userId = result.userId || pathParts[0];
    result.userIdentifier = result.userIdentifier || pathParts[0];
  }
  
  // Numeric ID at start of path
  if (pathParts[0] && /^\d+$/.test(pathParts[0])) {
    result.userId = result.userId || pathParts[0];
    result.userIdentifier = result.userIdentifier || pathParts[0];
  }
  
  return result;
}

// List blobs in a container with optional prefix (for folder navigation)
export async function listBlobs(
  containerName: string, 
  prefix?: string,
  includeDeleted: boolean = false
): Promise<{ blobs: BlobInfo[]; directories: string[] }> {
  const containerClient = getContainerClient(containerName);
  const blobs: BlobInfo[] = [];
  const directories = new Set<string>();
  
  const options: any = {
    includeMetadata: true,
    includeDeleted,
  };
  
  if (prefix) {
    options.prefix = prefix;
  }
  
  // Use listBlobsByHierarchy for folder-like navigation
  for await (const item of containerClient.listBlobsByHierarchy('/', options)) {
    if (item.kind === 'prefix') {
      // This is a virtual directory
      directories.add(item.name);
    } else {
      // This is a blob
      const userInfo = extractUserIdentifier(item, containerName);
      blobs.push({
        name: item.name.split('/').pop() || item.name,
        containerName,
        fullPath: item.name,
        size: item.properties.contentLength || 0,
        contentType: item.properties.contentType || 'application/octet-stream',
        lastModified: item.properties.lastModified || new Date(),
        createdOn: item.properties.createdOn,
        metadata: item.metadata || {},
        isDirectory: false,
        ...userInfo,
      });
    }
  }
  
  return { blobs, directories: Array.from(directories) };
}

// List ALL blobs in a container (flat view)
export async function listAllBlobs(containerName: string): Promise<BlobInfo[]> {
  const containerClient = getContainerClient(containerName);
  const blobs: BlobInfo[] = [];
  
  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    const userInfo = extractUserIdentifier(blob, containerName);
    blobs.push({
      name: blob.name.split('/').pop() || blob.name,
      containerName,
      fullPath: blob.name,
      size: blob.properties.contentLength || 0,
      contentType: blob.properties.contentType || 'application/octet-stream',
      lastModified: blob.properties.lastModified || new Date(),
      createdOn: blob.properties.createdOn,
      metadata: blob.metadata || {},
      isDirectory: false,
      ...userInfo,
    });
  }
  
  return blobs;
}

// Get blob download URL (SAS URL for temporary access)
export async function getBlobDownloadUrl(containerName: string, blobName: string): Promise<string> {
  const containerClient = getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  
  // Generate a SAS URL valid for 1 hour
  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + 60 * 60 * 1000); // 1 hour
  
  // For simpler approach without SAS (if public access or using connection string directly)
  return blobClient.url;
}

// Upload a blob
export async function uploadBlob(
  containerName: string, 
  blobName: string, 
  data: Buffer | Blob | ArrayBuffer,
  metadata?: Record<string, string>,
  contentType?: string
): Promise<BlobInfo> {
  const containerClient = getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  const uploadOptions: any = {
    blobHTTPHeaders: {
      blobContentType: contentType || 'application/octet-stream',
    },
  };
  
  if (metadata) {
    uploadOptions.metadata = metadata;
  }
  
  await blockBlobClient.uploadData(data as Buffer, uploadOptions);
  
  // Get properties to return
  const properties = await blockBlobClient.getProperties();
  
  return {
    name: blobName.split('/').pop() || blobName,
    containerName,
    fullPath: blobName,
    size: properties.contentLength || 0,
    contentType: properties.contentType || 'application/octet-stream',
    lastModified: properties.lastModified || new Date(),
    createdOn: properties.createdOn,
    metadata: properties.metadata || {},
    isDirectory: false,
  };
}

// Delete a blob
export async function deleteBlob(containerName: string, blobName: string): Promise<void> {
  const containerClient = getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  await blobClient.delete();
}

// Get blob properties/metadata
export async function getBlobProperties(containerName: string, blobName: string): Promise<BlobInfo> {
  const containerClient = getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  const properties = await blobClient.getProperties();
  
  return {
    name: blobName.split('/').pop() || blobName,
    containerName,
    fullPath: blobName,
    size: properties.contentLength || 0,
    contentType: properties.contentType || 'application/octet-stream',
    lastModified: properties.lastModified || new Date(),
    createdOn: properties.createdOn,
    metadata: properties.metadata || {},
    isDirectory: false,
  };
}

// Create a container
export async function createContainer(containerName: string): Promise<void> {
  const containerClient = getContainerClient(containerName);
  await containerClient.createIfNotExists();
}

// Delete a container
export async function deleteContainer(containerName: string): Promise<void> {
  const containerClient = getContainerClient(containerName);
  await containerClient.delete();
}

// Download blob as buffer
export async function downloadBlob(containerName: string, blobName: string): Promise<Buffer> {
  const containerClient = getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  const downloadResponse = await blobClient.download();
  
  const chunks: Buffer[] = [];
  if (downloadResponse.readableStreamBody) {
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
  }
  
  return Buffer.concat(chunks);
}

// Set blob metadata
export async function setBlobMetadata(
  containerName: string, 
  blobName: string, 
  metadata: Record<string, string>
): Promise<void> {
  const containerClient = getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  await blobClient.setMetadata(metadata);
}

