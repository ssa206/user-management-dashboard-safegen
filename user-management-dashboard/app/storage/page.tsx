'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Container {
  name: string;
  lastModified?: string;
  metadata: Record<string, string>;
}

interface BlobInfo {
  name: string;
  containerName: string;
  fullPath: string;
  size: number;
  contentType: string;
  lastModified: string;
  createdOn?: string;
  metadata: Record<string, string>;
  isDirectory: boolean;
  userId?: string;
  userIdentifier?: string;
  matchedUser?: {
    id: string;
    name?: string;
    email?: string;
  };
}

interface UserInfo {
  id: string;
  name?: string;
  email?: string;
}

// File type labels
const getFileTypeInfo = (contentType: string, name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  
  if (contentType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return { label: 'IMAGE', previewable: true };
  }
  if (contentType.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
    return { label: 'VIDEO', previewable: true };
  }
  if (contentType.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
    return { label: 'AUDIO', previewable: true };
  }
  if (['pdf'].includes(ext)) {
    return { label: 'PDF', previewable: true };
  }
  if (['doc', 'docx'].includes(ext)) {
    return { label: 'WORD', previewable: true };
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return { label: 'EXCEL', previewable: true };
  }
  if (['csv'].includes(ext)) {
    return { label: 'CSV', previewable: true };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return { label: 'POWERPOINT', previewable: true };
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'html', 'css', 'scss'].includes(ext)) {
    return { label: 'CODE', previewable: true };
  }
  if (['json', 'xml', 'yaml', 'yml', 'toml'].includes(ext)) {
    return { label: 'DATA', previewable: true };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return { label: 'ARCHIVE', previewable: false };
  }
  if (['txt', 'md', 'rtf', 'log'].includes(ext) || contentType.startsWith('text/')) {
    return { label: 'TEXT', previewable: true };
  }
  return { label: 'FILE', previewable: false };
};

// Check if content is previewable as text
const isTextPreviewable = (contentType: string, name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const textExtensions = ['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'toml', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'html', 'css', 'scss', 'log', 'csv'];
  return contentType.startsWith('text/') || textExtensions.includes(ext) || contentType === 'application/json';
};

// Check if content is an image
const isImagePreviewable = (contentType: string, name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return contentType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
};

// Check if content is a PDF
const isPdfPreviewable = (contentType: string, name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return contentType === 'application/pdf' || ext === 'pdf';
};

// Check if content is a Word document that can be converted to HTML
const isDocxPreviewable = (contentType: string, name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ext === 'docx';
};

// Check if content is an Office document that can't be previewed
const isOfficeNotPreviewable = (contentType: string, name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const notPreviewable = ['doc', 'xls', 'xlsx', 'ppt', 'pptx'];
  return notPreviewable.includes(ext);
};

// Check if content is video
const isVideoPreviewable = (contentType: string, name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return contentType.startsWith('video/') || ['mp4', 'webm', 'ogg'].includes(ext);
};

// Check if content is audio
const isAudioPreviewable = (contentType: string, name: string): boolean => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return contentType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
};

// Format file size
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
};

export default function StoragePage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [blobs, setBlobs] = useState<BlobInfo[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingBlobs, setLoadingBlobs] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [availableUsers, setAvailableUsers] = useState<UserInfo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<BlobInfo | null>(null);
  const [selectedBlob, setSelectedBlob] = useState<BlobInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [flatView, setFlatView] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [jsonData, setJsonData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousBlobUrl = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedContainer) {
      fetchBlobs();
    }
  }, [selectedContainer, currentPath, flatView, searchQuery, userFilter]);

  // Load preview when blob is selected
  useEffect(() => {
    if (selectedBlob) {
      loadPreview(selectedBlob);
    } else {
      setPreviewContent(null);
      setPreviewUrl(null);
    }
  }, [selectedBlob]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      fetchContainers();
    } catch (err) {
      router.push('/login');
    }
  };

  const fetchContainers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/storage/containers');
      const data = await response.json();
      
      if (response.ok) {
        setContainers(data.containers);
        if (data.containers.length > 0 && !selectedContainer) {
          setSelectedContainer(data.containers[0].name);
        }
      } else {
        setError(data.error || 'Failed to fetch containers');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch containers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlobs = async () => {
    if (!selectedContainer) return;
    
    try {
      setLoadingBlobs(true);
      const params = new URLSearchParams({
        container: selectedContainer,
        flat: String(flatView),
        search: searchQuery,
        user: userFilter,
      });
      
      if (currentPath && !flatView) {
        params.set('prefix', currentPath);
      }
      
      const response = await fetch(`/api/storage/blobs?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setBlobs(data.blobs);
        setDirectories(data.directories || []);
        setAvailableUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to fetch blobs');
      }
    } catch (err) {
      setError('Failed to fetch blobs');
    } finally {
      setLoadingBlobs(false);
    }
  };

  // Helper to clean up old blob URL
  const cleanupBlobUrl = () => {
    if (previousBlobUrl.current) {
      URL.revokeObjectURL(previousBlobUrl.current);
      previousBlobUrl.current = null;
    }
  };

  const loadPreview = async (blob: BlobInfo) => {
    // Clean up previous blob URL first
    cleanupBlobUrl();
    
    setPreviewContent(null);
    setPreviewHtml(null);
    setPreviewUrl(null);
    
    // Check file size - don't preview files larger than 5MB for text, 50MB for media
    const maxTextSize = 5 * 1024 * 1024;
    const maxMediaSize = 50 * 1024 * 1024;
    
    if (isTextPreviewable(blob.contentType, blob.name)) {
      if (blob.size > maxTextSize) {
        setPreviewContent('File too large to preview. Download to view.');
        return;
      }
      
      setLoadingPreview(true);
      try {
        const params = new URLSearchParams({
          container: blob.containerName,
          blob: blob.fullPath,
        });
        const response = await fetch(`/api/storage/blobs/download?${params}`);
        if (response.ok) {
          const text = await response.text();
          setPreviewContent(text);
          
          // Try to parse as JSON for the tree viewer
          const ext = blob.name.split('.').pop()?.toLowerCase();
          if (ext === 'json' || blob.contentType === 'application/json') {
            try {
              const parsed = JSON.parse(text);
              setJsonData(parsed);
            } catch {
              setJsonData(null);
            }
          } else {
            setJsonData(null);
          }
        } else {
          setPreviewContent('Failed to load preview');
        }
      } catch (err) {
        setPreviewContent('Failed to load preview');
      } finally {
        setLoadingPreview(false);
      }
    } else if (isDocxPreviewable(blob.contentType, blob.name)) {
      // Convert .docx to HTML using server-side mammoth
      if (blob.size > maxMediaSize) {
        setPreviewContent('File too large to preview. Download to view.');
        return;
      }
      
      setLoadingPreview(true);
      try {
        const params = new URLSearchParams({
          container: blob.containerName,
          blob: blob.fullPath,
        });
        const response = await fetch(`/api/storage/blobs/preview?${params}`);
        const data = await response.json();
        
        if (response.ok && data.type === 'html') {
          setPreviewHtml(data.content);
        } else if (data.type === 'unsupported') {
          setPreviewContent(data.message);
        } else {
          setPreviewContent('Failed to load preview');
        }
      } catch (err) {
        setPreviewContent('Failed to load preview');
      } finally {
        setLoadingPreview(false);
      }
    } else if (isImagePreviewable(blob.contentType, blob.name) || 
               isPdfPreviewable(blob.contentType, blob.name) ||
               isVideoPreviewable(blob.contentType, blob.name) ||
               isAudioPreviewable(blob.contentType, blob.name)) {
      if (blob.size > maxMediaSize) {
        setPreviewContent('File too large to preview. Download to view.');
        return;
      }
      
      // Fetch the file and create a blob URL (works with auth)
      setLoadingPreview(true);
      try {
        const params = new URLSearchParams({
          container: blob.containerName,
          blob: blob.fullPath,
          mode: 'view',
        });
        const response = await fetch(`/api/storage/blobs/download?${params}`);
        if (response.ok) {
          const fileBlob = await response.blob();
          const url = URL.createObjectURL(fileBlob);
          previousBlobUrl.current = url; // Track for cleanup
          setPreviewUrl(url);
        } else {
          setPreviewContent('Failed to load preview');
        }
      } catch (err) {
        setPreviewContent('Failed to load preview');
      } finally {
        setLoadingPreview(false);
      }
    } else if (isOfficeNotPreviewable(blob.contentType, blob.name)) {
      // Other Office files can't be previewed inline
      setPreviewContent('This file type cannot be previewed. Use the Download button to view.');
    }
  };
  
  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      cleanupBlobUrl();
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setTimeout(() => {
      router.push('/login');
    }, 800);
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
    setSelectedBlob(null);
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return [{ name: 'Root', path: '' }];
    
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Root', path: '' }];
    
    let accumulated = '';
    parts.forEach(part => {
      accumulated += part + '/';
      breadcrumbs.push({ name: part, path: accumulated });
    });
    
    return breadcrumbs;
  };

  const handleDownload = async (blob: BlobInfo) => {
    try {
      const params = new URLSearchParams({
        container: blob.containerName,
        blob: blob.fullPath,
      });
      
      const response = await fetch(`/api/storage/blobs/download?${params}`);
      
      if (response.ok) {
        const blobData = await response.blob();
        const url = window.URL.createObjectURL(blobData);
        const a = document.createElement('a');
        a.href = url;
        a.download = blob.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to download file');
      }
    } catch (err) {
      alert('Failed to download file');
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    
    try {
      const params = new URLSearchParams({
        container: showDeleteModal.containerName,
        blob: showDeleteModal.fullPath,
      });
      
      const response = await fetch(`/api/storage/blobs?${params}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setShowDeleteModal(null);
        setSelectedBlob(null);
        fetchBlobs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete file');
      }
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedContainer) return;
    
    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('container', selectedContainer);
        formData.append('path', currentPath.replace(/\/$/, ''));
        
        const response = await fetch('/api/storage/blobs', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }
      }
      
      setShowUploadModal(false);
      fetchBlobs();
    } catch (err: any) {
      alert(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  // Group blobs by user
  const blobsByUser = blobs.reduce((acc, blob) => {
    const userId = blob.matchedUser?.id || blob.userIdentifier || 'unassigned';
    if (!acc[userId]) {
      acc[userId] = {
        user: blob.matchedUser || (blob.userIdentifier ? { id: blob.userIdentifier, name: blob.userIdentifier } : null),
        blobs: [],
      };
    }
    acc[userId].blobs.push(blob);
    return acc;
  }, {} as Record<string, { user: UserInfo | null; blobs: BlobInfo[] }>);

  if (loading && containers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-2xl text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Logout Animation */}
      {loggingOut && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center animate-fade-in">
          <div className="text-center">
            <div className="mb-6 inline-block">
              <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">Logging out...</h2>
            <p className="text-gray-600">See you soon!</p>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden border-b-4 border-black bg-white p-4 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 border-2 border-black rounded-lg font-bold"
        >
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
        <h1 className="text-xl font-bold text-black">File Explorer</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 border-2 border-black rounded-lg font-bold"
        >
          Back
        </button>
      </div>

      {/* Sidebar - Containers */}
      <div 
        className={`${sidebarOpen ? 'block' : 'hidden'} lg:block ${sidebarOpen ? 'w-full lg:w-72' : 'lg:w-16'} border-b-4 lg:border-b-0 lg:border-r-4 border-black bg-gray-50 flex-shrink-0`}
      >
        <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col">
          {/* Sidebar Header */}
          <div className={`hidden lg:flex border-b-4 border-black bg-white items-center ${sidebarOpen ? 'p-4 justify-between' : 'p-2 justify-center'}`}>
            {sidebarOpen && (
              <h2 className="font-bold text-black text-xl">Containers</h2>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors font-bold text-lg"
            >
              {sidebarOpen ? '<' : '>'}
            </button>
          </div>

          {/* Container List */}
          <div className={`flex-1 overflow-y-auto ${sidebarOpen ? 'p-4' : 'p-2'}`}>
            {containers.map((container) => {
              const isSelected = selectedContainer === container.name;
              
              return (
                <button
                  key={container.name}
                  onClick={() => {
                    setSelectedContainer(container.name);
                    setCurrentPath('');
                    setSelectedBlob(null);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full text-left mb-2 border-2 border-black rounded-lg transition-all ${
                    sidebarOpen ? 'p-3' : 'p-2'
                  } ${
                    isSelected 
                      ? 'bg-black text-white' 
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                  title={container.name}
                >
                  {sidebarOpen ? (
                    <div>
                      <div className="font-bold">{container.name}</div>
                      {container.lastModified && (
                        <div className={`text-xs mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                          {formatRelativeTime(container.lastModified)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-[10px] font-bold">
                      {container.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </button>
              );
            })}
            
            {containers.length === 0 && !loading && sidebarOpen && (
              <div className="text-center py-8 text-gray-500">
                No containers found
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className={`border-t-4 border-black bg-white space-y-3 ${sidebarOpen ? 'p-4' : 'p-2'}`}>
            <button
              onClick={() => router.push('/dashboard')}
              className={`w-full border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-xl ${
                sidebarOpen ? 'px-4 py-3' : 'px-2 py-2 text-lg'
              }`}
            >
              {sidebarOpen ? '< Dashboard' : '<'}
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`w-full bg-black text-white font-bold hover:bg-gray-800 transition-colors rounded-xl disabled:opacity-50 ${
                sidebarOpen ? 'px-4 py-3' : 'px-2 py-2 text-lg'
              }`}
            >
              {sidebarOpen ? (loggingOut ? 'Logging out...' : 'Logout') : 'X'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedBlob ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="hidden lg:block border-b-4 border-black bg-white sticky top-0 z-10 shadow-sm">
          <div className="px-4 lg:px-8 py-4 lg:py-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-6">
              <Image
                src="/SafeGenerations-logo.png"
                alt="SafeGenerations logo"
                width={180}
                height={93}
                priority
                className="hidden lg:block grayscale"
              />
              <div className="hidden lg:block border-l-2 border-black pl-6">
                <h1 className="text-2xl font-bold text-black">File Storage</h1>
                <p className="text-sm text-gray-500">
                  {selectedContainer ? selectedContainer : 'Select a container'}
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
              <div className="flex border-2 border-black rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 lg:px-6 py-2 font-bold transition-colors text-sm ${
                    viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 lg:px-6 py-2 font-bold transition-colors text-sm ${
                    viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  List
                </button>
              </div>
              
              <button
                onClick={() => setFlatView(!flatView)}
                className={`px-3 lg:px-6 py-2 border-2 border-black rounded-xl font-bold transition-colors text-sm ${
                  flatView ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                {flatView ? 'Flat' : 'Folders'}
              </button>
              
              {selectedContainer && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 lg:px-8 py-2 lg:py-3 bg-black text-white font-bold hover:bg-gray-800 transition-colors rounded-xl text-sm"
                >
                  + Upload
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="lg:hidden border-b-2 border-black bg-white p-4">
          <div className="flex gap-2 flex-wrap">
            <div className="flex border-2 border-black rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 font-bold text-sm ${
                  viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 font-bold text-sm ${
                  viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                List
              </button>
            </div>
            
            <button
              onClick={() => setFlatView(!flatView)}
              className={`px-3 py-1 border-2 border-black rounded-lg font-bold text-sm ${
                flatView ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              {flatView ? 'Flat' : 'Folders'}
            </button>
            
            {selectedContainer && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3 py-1 bg-black text-white font-bold rounded-lg text-sm"
              >
                + Upload
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        {selectedContainer && (
          <div className="bg-gray-50 border-b-2 border-black px-4 lg:px-8 py-3 lg:py-4">
            <div className="flex flex-col gap-3">
              {/* Breadcrumbs */}
              {!flatView && (
                <div className="flex items-center gap-1 lg:gap-2 flex-wrap text-sm">
                  {getBreadcrumbs().map((crumb, idx) => (
                    <div key={crumb.path} className="flex items-center">
                      {idx > 0 && <span className="text-gray-400 mx-1">/</span>}
                      <button
                        onClick={() => navigateToFolder(crumb.path)}
                        className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                          idx === getBreadcrumbs().length - 1
                            ? 'bg-black text-white'
                            : 'bg-white border border-black text-black hover:bg-gray-100'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border-2 border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 font-medium rounded-lg text-sm"
                />
                
                {availableUsers.length > 0 && (
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="px-3 py-2 border-2 border-black rounded-lg focus:outline-none font-bold bg-white text-sm"
                  >
                    <option value="">All Users</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email || user.id}
                      </option>
                    ))}
                  </select>
                )}
                
                <div className="text-sm font-bold text-black bg-white px-4 py-2 border-2 border-black rounded-lg whitespace-nowrap">
                  {blobs.length} files
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {error && (
            <div className="mb-6 p-4 border-2 border-black bg-gray-100 text-black rounded-xl">
              {error}
            </div>
          )}

          {loadingBlobs ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-xl text-black">Loading files...</div>
            </div>
          ) : !selectedContainer ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center border-4 border-black rounded-2xl p-8 lg:p-12 bg-gray-50">
                <p className="text-xl font-bold text-black mb-2">Select a Container</p>
                <p className="text-gray-600">Choose a container from the sidebar to view files</p>
              </div>
            </div>
          ) : blobs.length === 0 && directories.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center border-4 border-black rounded-2xl p-8 lg:p-12 bg-gray-50">
                <p className="text-xl font-bold text-black mb-2">
                  {searchQuery || userFilter ? 'No matching files' : 'This folder is empty'}
                </p>
                <p className="text-gray-600 mb-6">
                  {searchQuery || userFilter ? 'Try adjusting your search or filters' : 'Upload some files to get started'}
                </p>
                {!searchQuery && !userFilter && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-8 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    + Upload Files
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div>
              {/* Directories */}
              {directories.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wide">Folders</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
                    {directories.map((dir) => {
                      const dirName = dir.split('/').filter(Boolean).pop() || dir;
                      return (
                        <button
                          key={dir}
                          onClick={() => navigateToFolder(dir)}
                          className="p-4 lg:p-6 border-2 border-black rounded-xl bg-white hover:bg-gray-100 transition-all text-left"
                        >
                          <div className="text-xs font-bold text-gray-500 mb-2">FOLDER</div>
                          <div className="font-bold text-black truncate text-sm">{dirName}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files grouped by user */}
              {Object.entries(blobsByUser).map(([userId, group]) => (
                <div key={userId} className="mb-8">
                  {/* User Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-black">
                    {group.user ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                          {(group.user.name || group.user.email || userId).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-black truncate">
                            {group.user.name || group.user.email || userId}
                          </h3>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
                          ?
                        </div>
                        <h3 className="font-bold text-gray-600">Unassigned Files</h3>
                      </>
                    )}
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-300">
                      {group.blobs.length}
                    </span>
                  </div>
                  
                  {/* Files Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
                    {group.blobs.map((blob) => {
                      const fileType = getFileTypeInfo(blob.contentType, blob.name);
                      const isSelected = selectedBlob?.fullPath === blob.fullPath;
                      
                      return (
                        <div
                          key={blob.fullPath}
                          onClick={() => setSelectedBlob(blob)}
                          className={`p-3 lg:p-4 border-2 rounded-xl bg-white cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-black shadow-lg' 
                              : 'border-gray-200 hover:border-black'
                          }`}
                        >
                          <div className="text-xs font-bold text-gray-500 mb-2">{fileType.label}</div>
                          <div className="font-bold text-black truncate text-sm mb-1" title={blob.name}>
                            {blob.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatSize(blob.size)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="border-2 border-black rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-bold uppercase tracking-wider">Name</th>
                      <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-bold uppercase tracking-wider hidden sm:table-cell">User</th>
                      <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Size</th>
                      <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-bold uppercase tracking-wider hidden lg:table-cell">Modified</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Directories */}
                    {directories.map((dir) => {
                      const dirName = dir.split('/').filter(Boolean).pop() || dir;
                      return (
                        <tr 
                          key={dir}
                          onClick={() => navigateToFolder(dir)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-black font-bold">
                            <span className="text-xs text-gray-500 mr-2">FOLDER</span>
                            {dirName}
                          </td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-gray-500 hidden sm:table-cell">-</td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-gray-500 hidden md:table-cell">-</td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-gray-500 hidden lg:table-cell">-</td>
                        </tr>
                      );
                    })}
                    
                    {/* Files */}
                    {blobs.map((blob) => {
                      const fileType = getFileTypeInfo(blob.contentType, blob.name);
                      const isSelected = selectedBlob?.fullPath === blob.fullPath;
                      
                      return (
                        <tr
                          key={blob.fullPath}
                          onClick={() => setSelectedBlob(blob)}
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-gray-100' : ''
                          }`}
                        >
                          <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-black">
                            <div>
                              <span className="text-xs text-gray-500 mr-2">{fileType.label}</span>
                              <span className="font-bold">{blob.name}</span>
                            </div>
                            {flatView && blob.fullPath !== blob.name && (
                              <div className="text-xs text-gray-400 truncate max-w-xs">{blob.fullPath}</div>
                            )}
                          </td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm hidden sm:table-cell">
                            {blob.matchedUser ? (
                              <span className="inline-block px-2 py-1 rounded bg-black text-white text-xs font-bold max-w-[120px] truncate">
                                {blob.matchedUser.name || blob.matchedUser.email}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-gray-600 hidden md:table-cell">{formatSize(blob.size)}</td>
                          <td className="px-3 lg:px-6 py-3 lg:py-4 text-sm text-gray-500 hidden lg:table-cell">{formatRelativeTime(blob.lastModified)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Details Panel */}
      {selectedBlob && (
        <div className="fixed inset-0 lg:relative lg:inset-auto bg-white lg:w-[400px] lg:min-w-[400px] border-l-4 border-black flex-shrink-0 overflow-auto z-20">
          <div className="sticky top-0 bg-white border-b-4 border-black p-4 flex justify-between items-center z-10">
            <h3 className="font-bold text-lg">File Details</h3>
            <button
              onClick={() => setSelectedBlob(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors font-bold border-2 border-black"
            >
              X
            </button>
          </div>
          
          <div className="p-4 lg:p-6">
            {/* Preview Area */}
            <div className="mb-6 border-2 border-black rounded-xl overflow-hidden bg-gray-50">
              {loadingPreview ? (
                <div className="p-8 text-center">
                  <div className="text-sm text-gray-500">Loading preview...</div>
                </div>
              ) : previewUrl && isImagePreviewable(selectedBlob.contentType, selectedBlob.name) ? (
                <img 
                  src={previewUrl} 
                  alt={selectedBlob.name}
                  className="w-full h-auto max-h-80 object-contain bg-white"
                />
              ) : previewUrl && isPdfPreviewable(selectedBlob.contentType, selectedBlob.name) ? (
                <div className="flex flex-col">
                  <embed
                    src={previewUrl}
                    type="application/pdf"
                    className="w-full h-96 bg-white"
                  />
                  <button 
                    onClick={async () => {
                      // Fetch fresh copy for new tab
                      const params = new URLSearchParams({
                        container: selectedBlob.containerName,
                        blob: selectedBlob.fullPath,
                        mode: 'view',
                      });
                      const response = await fetch(`/api/storage/blobs/download?${params}`);
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      }
                    }}
                    className="block w-full text-center py-2 bg-black text-white text-sm font-bold hover:bg-gray-800"
                  >
                    Open PDF in New Tab
                  </button>
                </div>
              ) : previewUrl && isVideoPreviewable(selectedBlob.contentType, selectedBlob.name) ? (
                <video 
                  src={previewUrl}
                  controls
                  className="w-full h-auto max-h-80"
                />
              ) : previewUrl && isAudioPreviewable(selectedBlob.contentType, selectedBlob.name) ? (
                <div className="p-4">
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              ) : previewHtml ? (
                <div 
                  className="p-4 overflow-auto max-h-96 bg-white prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : previewContent ? (
                <div className="flex flex-col">
                  <pre className="p-4 text-xs overflow-auto max-h-72 whitespace-pre-wrap break-words font-mono bg-white">
                    {previewContent.substring(0, 10000)}
                    {previewContent.length > 10000 && '\n\n... (truncated)'}
                  </pre>
                  {jsonData && (
                    <button
                      onClick={() => setShowJsonViewer(true)}
                      className="block w-full text-center py-2 bg-black text-white text-sm font-bold hover:bg-gray-800"
                    >
                      View as Tree
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-sm font-bold text-gray-500 uppercase">
                    {getFileTypeInfo(selectedBlob.contentType, selectedBlob.name).label}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">No preview available</div>
                </div>
              )}
            </div>
            
            {/* File Name */}
            <h4 className="font-bold text-lg text-black mb-4 break-words">{selectedBlob.name}</h4>
            
            {/* User Association */}
            {selectedBlob.matchedUser && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-black">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Assigned To</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
                    {(selectedBlob.matchedUser.name || selectedBlob.matchedUser.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-black">
                      {selectedBlob.matchedUser.name || 'Unknown'}
                    </div>
                    {selectedBlob.matchedUser.email && (
                      <div className="text-sm text-gray-500">{selectedBlob.matchedUser.email}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* File Properties */}
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Size</div>
                <div className="font-medium text-black">{formatSize(selectedBlob.size)}</div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Type</div>
                <div className="font-medium text-black text-sm break-all">{selectedBlob.contentType}</div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Modified</div>
                <div className="font-medium text-black text-sm">
                  {new Date(selectedBlob.lastModified).toLocaleString()}
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Path</div>
                <div className="font-medium text-black text-sm break-all">{selectedBlob.fullPath}</div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleDownload(selectedBlob)}
                className="w-full px-4 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => setShowDeleteModal(selectedBlob)}
                className="w-full px-4 py-3 border-2 border-black text-black font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black rounded-2xl shadow-2xl max-w-lg w-full p-6 lg:p-8">
            <h3 className="text-2xl font-bold text-black mb-6">Upload Files</h3>
            
            <div
              className="border-4 border-dashed border-gray-300 rounded-2xl p-8 lg:p-12 text-center hover:border-black transition-colors cursor-pointer mb-6"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-black', 'bg-gray-50');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-black', 'bg-gray-50');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-black', 'bg-gray-50');
                handleUpload(e.dataTransfer.files);
              }}
            >
              <p className="font-bold text-lg text-black mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-500">
                Uploading to: {selectedContainer}/{currentPath || '(root)'}
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="flex-1 px-6 py-3 border-2 border-black text-black bg-white font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            
            {uploading && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
                <span className="font-bold">Uploading...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black rounded-2xl shadow-2xl max-w-md w-full p-6 lg:p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-black mb-3">Delete File</h3>
              <p className="text-gray-700">
                Are you sure you want to delete <strong>{showDeleteModal.name}</strong>? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                className="flex-1 px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-6 py-3 border-2 border-black text-black bg-white font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Tree Viewer Modal */}
      {showJsonViewer && jsonData && (
        <JsonViewerModal 
          data={jsonData} 
          fileName={selectedBlob?.name || 'data.json'}
          onClose={() => setShowJsonViewer(false)} 
        />
      )}
    </div>
  );
}

// JSON Viewer Modal with Tree and Graph views
function JsonViewerModal({ data, fileName, onClose }: { data: any; fileName: string; onClose: () => void }) {
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('tree');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4">
      <div className="bg-white border-4 border-black rounded-2xl shadow-2xl w-full h-full lg:w-[95vw] lg:h-[95vh] flex flex-col">
        <div className="p-4 border-b-4 border-black flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-black">{fileName}</h3>
            <div className="flex border-2 border-black rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-4 py-1 font-bold text-sm transition-colors ${
                  viewMode === 'tree' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                Tree
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-4 py-1 font-bold text-sm transition-colors ${
                  viewMode === 'graph' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                Graph
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors font-bold border-2 border-black"
          >
            X
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {viewMode === 'tree' ? (
            <div className="h-full overflow-auto p-6">
              <JsonTreeView data={data} />
            </div>
          ) : (
            <JsonGraphView data={data} />
          )}
        </div>
      </div>
    </div>
  );
}

// JSON Tree View Component
function JsonTreeView({ data }: { data: any }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  
  const toggleCollapse = (key: string) => {
    const newCollapsed = new Set(collapsed);
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key);
    } else {
      newCollapsed.add(key);
    }
    setCollapsed(newCollapsed);
  };
  
  const renderValue = (value: any, key: string, path: string): React.ReactNode => {
    const fullPath = path ? `${path}.${key}` : key;
    const isCollapsed = collapsed.has(fullPath);
    
    if (value === null) {
      return <span className="text-gray-400 italic">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-orange-600 font-medium">{value ? 'true' : 'false'}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-blue-600 font-medium">{value}</span>;
    }
    
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return (
          <span className="text-purple-600">
            &quot;{value}&quot;
            <span className="text-gray-400 text-xs ml-2">
              ({new Date(value).toLocaleString()})
            </span>
          </span>
        );
      }
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-green-600 underline hover:text-green-800">
            &quot;{value.length > 50 ? value.substring(0, 50) + '...' : value}&quot;
          </a>
        );
      }
      return <span className="text-green-600">&quot;{value.length > 100 ? value.substring(0, 100) + '...' : value}&quot;</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-500">[ ]</span>;
      }
      
      return (
        <div>
          <button
            onClick={() => toggleCollapse(fullPath)}
            className="text-gray-600 hover:text-black font-mono text-sm"
          >
            {isCollapsed ? '[+]' : '[-]'} Array ({value.length})
          </button>
          {!isCollapsed && (
            <div className="ml-6 border-l-2 border-gray-200 pl-4 mt-1">
              {value.map((item, index) => (
                <div key={index} className="py-1">
                  <span className="text-gray-400 font-mono text-sm mr-2">[{index}]</span>
                  {renderValue(item, String(index), fullPath)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <span className="text-gray-500">{'{ }'}</span>;
      }
      
      return (
        <div>
          <button
            onClick={() => toggleCollapse(fullPath)}
            className="text-gray-600 hover:text-black font-mono text-sm"
          >
            {isCollapsed ? '{+}' : '{-}'} Object ({keys.length} keys)
          </button>
          {!isCollapsed && (
            <div className="ml-6 border-l-2 border-gray-200 pl-4 mt-1">
              {keys.map((k) => (
                <div key={k} className="py-1">
                  <span className="font-bold text-black mr-2">{k}:</span>
                  {renderValue(value[k], k, fullPath)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span className="text-gray-600">{String(value)}</span>;
  };
  
  return (
    <div className="font-mono text-sm">
      {renderValue(data, 'root', '')}
    </div>
  );
}

// JSON Graph/Mindmap View Component
interface GraphNode {
  id: string;
  label: string;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  value?: string;
  x: number;
  y: number;
  children: string[];
  parent?: string;
}

function JsonGraphView({ data }: { data: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Map<string, GraphNode>>(new Map());
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Build graph nodes from JSON data
  useEffect(() => {
    const nodeMap = new Map<string, GraphNode>();
    
    const processValue = (value: any, key: string, path: string, depth: number, index: number, siblingCount: number): string => {
      const id = path || 'root';
      
      let type: GraphNode['type'] = 'null';
      let displayValue: string | undefined;
      let children: string[] = [];
      
      if (value === null) {
        type = 'null';
        displayValue = 'null';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
        displayValue = String(value);
      } else if (typeof value === 'number') {
        type = 'number';
        displayValue = String(value);
      } else if (typeof value === 'string') {
        type = 'string';
        displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
      } else if (Array.isArray(value)) {
        type = 'array';
        displayValue = `[${value.length}]`;
        children = value.map((item, i) => processValue(item, `[${i}]`, `${id}.[${i}]`, depth + 1, i, value.length));
      } else if (typeof value === 'object') {
        type = 'object';
        const keys = Object.keys(value);
        displayValue = `{${keys.length}}`;
        children = keys.map((k, i) => processValue(value[k], k, `${id}.${k}`, depth + 1, i, keys.length));
      }
      
      nodeMap.set(id, {
        id,
        label: key,
        type,
        value: displayValue,
        x: 0,
        y: 0,
        children,
        parent: path ? path.split('.').slice(0, -1).join('.') || 'root' : undefined,
      });
      
      return id;
    };
    
    processValue(data, 'root', '', 0, 0, 1);
    setNodes(nodeMap);
  }, [data]);

  // Calculate positions based on expanded state
  const getVisibleNodes = (): GraphNode[] => {
    const visible: GraphNode[] = [];
    
    const HORIZONTAL_SPACING = 320; // Space between levels
    const VERTICAL_SPACING = 80; // Space between sibling nodes
    const NODE_HEIGHT = 50;
    
    const layoutNode = (nodeId: string, level: number, startY: number): { endY: number } => {
      const node = nodes.get(nodeId);
      if (!node) return { endY: startY };
      
      const x = level * HORIZONTAL_SPACING + 50;
      
      if (expandedNodes.has(nodeId) && node.children.length > 0) {
        // Layout children first to calculate this node's Y position
        let currentY = startY;
        const childPositions: number[] = [];
        
        for (const childId of node.children) {
          const result = layoutNode(childId, level + 1, currentY);
          const childNode = visible.find(n => n.id === childId);
          if (childNode) {
            childPositions.push(childNode.y);
          }
          currentY = result.endY + VERTICAL_SPACING;
        }
        
        // Position this node in the middle of its children
        const minChildY = Math.min(...childPositions);
        const maxChildY = Math.max(...childPositions);
        const y = childPositions.length > 0 ? (minChildY + maxChildY) / 2 : startY;
        
        visible.push({ ...node, x, y });
        return { endY: currentY - VERTICAL_SPACING };
      } else {
        // Leaf node or collapsed
        visible.push({ ...node, x, y: startY });
        return { endY: startY + NODE_HEIGHT };
      }
    };
    
    if (nodes.has('root')) {
      layoutNode('root', 0, 50);
    }
    
    return visible;
  };

  const visibleNodes = getVisibleNodes();

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setZoom(z => Math.min(Math.max(0.3, z + delta), 2));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getNodeColor = (type: GraphNode['type']): string => {
    switch (type) {
      case 'object': return '#000000';
      case 'array': return '#4B5563';
      case 'string': return '#059669';
      case 'number': return '#2563EB';
      case 'boolean': return '#EA580C';
      case 'null': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    nodes.forEach((_, id) => allIds.add(id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  // Calculate SVG dimensions
  const maxX = Math.max(...visibleNodes.map(n => n.x), 800) + 400;
  const maxY = Math.max(...visibleNodes.map(n => n.y), 400) + 200;

  return (
    <div className="h-full flex flex-col" style={{ minHeight: '500px' }}>
      {/* Controls */}
      <div className="p-3 border-b border-gray-200 flex gap-2 flex-wrap flex-shrink-0 bg-gray-50">
        <button onClick={resetView} className="px-3 py-1 border-2 border-black rounded-lg text-sm font-bold hover:bg-gray-100">
          Reset View
        </button>
        <button onClick={expandAll} className="px-3 py-1 border-2 border-black rounded-lg text-sm font-bold hover:bg-gray-100">
          Expand All
        </button>
        <button onClick={collapseAll} className="px-3 py-1 border-2 border-black rounded-lg text-sm font-bold hover:bg-gray-100">
          Collapse All
        </button>
        <span className="ml-auto text-sm text-gray-500 self-center">
          Zoom: {Math.round(zoom * 100)}% | Drag to pan, scroll to zoom
        </span>
      </div>
      
      {/* Graph Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-100 cursor-grab"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', minHeight: '400px' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width={maxX}
          height={maxY}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          {/* Draw connection lines */}
          {visibleNodes.map(node => {
            if (!expandedNodes.has(node.id)) return null;
            const children = node.children
              .map(childId => visibleNodes.find(n => n.id === childId))
              .filter(Boolean) as GraphNode[];
            
            return children.map(child => (
              <path
                key={`${node.id}-${child.id}`}
                d={`M ${node.x + 240} ${node.y + 25} 
                    C ${node.x + 280} ${node.y + 25}, 
                      ${child.x - 40} ${child.y + 25}, 
                      ${child.x} ${child.y + 25}`}
                stroke="#94A3B8"
                strokeWidth="2"
                fill="none"
              />
            ));
          })}
          
          {/* Draw nodes */}
          {visibleNodes.map(node => {
            const hasChildren = node.children.length > 0;
            const isExpanded = expandedNodes.has(node.id);
            const isSelected = selectedNode === node.id;
            
            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                {/* Node shadow */}
                <rect
                  x="3"
                  y="3"
                  width="240"
                  height="50"
                  rx="10"
                  fill="#E5E7EB"
                />
                
                {/* Node background */}
                <rect
                  x="0"
                  y="0"
                  width="240"
                  height="50"
                  rx="10"
                  fill="white"
                  stroke={isSelected ? '#000' : getNodeColor(node.type)}
                  strokeWidth={isSelected ? 3 : 2}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedNode(node.id);
                    if (hasChildren) toggleExpand(node.id);
                  }}
                />
                
                {/* Expand/collapse indicator */}
                {hasChildren && (
                  <g transform="translate(10, 15)">
                    <rect
                      x="0"
                      y="0"
                      width="20"
                      height="20"
                      rx="4"
                      fill={getNodeColor(node.type)}
                      className="cursor-pointer"
                      onClick={() => toggleExpand(node.id)}
                    />
                    <text
                      x="10"
                      y="15"
                      textAnchor="middle"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {isExpanded ? '-' : '+'}
                    </text>
                  </g>
                )}
                
                {/* Node label */}
                <text
                  x={hasChildren ? 40 : 12}
                  y="20"
                  fontSize="13"
                  fontWeight="bold"
                  fill="#1F2937"
                  className="pointer-events-none"
                >
                  {node.label.length > 18 ? node.label.substring(0, 18) + '...' : node.label}
                </text>
                
                {/* Node value */}
                <text
                  x={hasChildren ? 40 : 12}
                  y="38"
                  fontSize="12"
                  fill={getNodeColor(node.type)}
                  className="pointer-events-none"
                >
                  {node.value && node.value.length > 22 ? node.value.substring(0, 22) + '...' : node.value}
                </text>
                
                {/* Type badge */}
                <rect
                  x="185"
                  y="12"
                  width="45"
                  height="24"
                  rx="5"
                  fill={getNodeColor(node.type)}
                />
                <text
                  x="207"
                  y="29"
                  textAnchor="middle"
                  fontSize="10"
                  fill="white"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {node.type.substring(0, 3).toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Selected Node Details */}
      {selectedNode && nodes.get(selectedNode) && (
        <div className="p-3 border-t-2 border-black bg-white flex-shrink-0">
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-bold">Path:</span> {selectedNode}
            </div>
            <div>
              <span className="font-bold">Type:</span> {nodes.get(selectedNode)?.type}
            </div>
            <div>
              <span className="font-bold">Value:</span> {nodes.get(selectedNode)?.value}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
