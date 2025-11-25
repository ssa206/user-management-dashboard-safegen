'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  [key: string]: any;
}

interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [schema, setSchema] = useState<SchemaColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, totalCount: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; user: User | null }>({ show: false, user: null });
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (pagination.page > 0) {
      fetchUsers();
    }
  }, [pagination.page, pagination.limit, searchQuery, sortBy, sortOrder]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      fetchUsers();
      fetchSchema();
    } catch (err) {
      router.push('/login');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchQuery,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async () => {
    try {
      const response = await fetch('/api/users/schema');
      const data = await response.json();
      
      if (response.ok) {
        setSchema(data.schema);
      }
    } catch (err) {
      console.error('Failed to fetch schema');
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    // Wait a moment for the animation to show
    setTimeout(() => {
      router.push('/login');
    }, 800);
  };

  const handleDelete = async (user: User) => {
    setDeleteConfirm({ show: true, user });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.user) return;

    try {
      const response = await fetch(`/api/users/${deleteConfirm.user.id}`, { method: 'DELETE' });
      
      if (response.ok) {
        setDeleteConfirm({ show: false, user: null });
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
        setDeleteConfirm({ show: false, user: null });
      }
    } catch (err) {
      setError('Failed to delete user');
      setDeleteConfirm({ show: false, user: null });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, user: null });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({});
    setShowAddForm(true);
  };

  const handleSave = async () => {
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setEditingUser(null);
        setShowAddForm(false);
        setFormData({});
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save user');
      }
    } catch (err) {
      alert('Failed to save user');
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setShowAddForm(false);
    setFormData({});
  };

  const getColumns = () => {
    let columns;
    if (users.length > 0) {
      columns = Object.keys(users[0]);
    } else {
      columns = schema.map(col => col.column_name);
    }
    // Filter out JWT, token, and theme columns
    return columns.filter(col => 
      !col.toLowerCase().includes('jwt') && 
      !col.toLowerCase().includes('token') &&
      !col.toLowerCase().includes('theme')
    );
  };

  const getEditableColumns = () => {
    return schema.filter(col => 
      col.column_name !== 'id' && 
      !col.column_name.toLowerCase().includes('jwt') && 
      !col.column_name.toLowerCase().includes('token') &&
      !col.column_name.toLowerCase().includes('theme') &&
      !col.column_name.toLowerCase().includes('created') &&
      !col.column_name.toLowerCase().includes('updated')
    ).map(col => col.column_name);
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getDisplayText = (text: string, isExpanded: boolean) => {
    if (!text) return '-';
    const shortLength = 50;
    const expandedLength = 200;
    
    if (text.length <= shortLength) return text;
    
    if (isExpanded) {
      if (text.length <= expandedLength) return text;
      return text.substring(0, expandedLength) + '...';
    }
    
    return text.substring(0, shortLength) + '...';
  };

  const toggleCellExpansion = (rowId: any, column: string) => {
    const cellKey = `${rowId}-${column}`;
    const newExpanded = new Set(expandedCells);
    if (newExpanded.has(cellKey)) {
      newExpanded.delete(cellKey);
    } else {
      newExpanded.add(cellKey);
    }
    setExpandedCells(newExpanded);
  };

  const isCellExpanded = (rowId: any, column: string) => {
    return expandedCells.has(`${rowId}-${column}`);
  };

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
      if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds}s`);
      
      return parts.length > 0 ? parts.join(' ') + ' ago' : 'just now';
    } catch (e) {
      return '';
    }
  };

  const isDateColumn = (column: string) => {
    return column.toLowerCase().includes('created') || 
           column.toLowerCase().includes('updated') || 
           column.toLowerCase().includes('date') ||
           column.toLowerCase().includes('time');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      // New column, default to DESC for date columns, ASC for others
      setSortBy(column);
      setSortOrder(isDateColumn(column) ? 'DESC' : 'ASC');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-2xl text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Logout Animation Overlay */}
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

      {/* Header */}
      <div className="border-b-4 border-black bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image
              src="/SafeGenerations-logo.png"
              alt="SafeGenerations logo"
              width={210}
              height={108}
              priority
            />
            <h1 className="text-3xl font-bold text-black">SafeGenerations User Management</h1>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => router.push('/storage')}
              className="px-8 py-3 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-xl"
            >
              ☁️ File Storage
            </button>
            <button
              onClick={() => router.push('/database')}
              className="px-8 py-3 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-xl"
            >
              Database Explorer
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-8 py-3 bg-black text-white font-bold hover:bg-gray-800 transition-colors rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {error && (
          <div className="mb-6 p-4 border-2 border-black bg-gray-100 text-black rounded-xl">
            {error}
          </div>
        )}

        {/* Controls Bar */}
        <div className="mb-6 bg-gray-50 border-2 border-black p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <button
              onClick={handleAdd}
              className="px-8 py-3 bg-black text-white font-bold hover:bg-gray-800 transition-colors shadow-md rounded-xl"
            >
              + Add New User
            </button>
            
            <div className="flex-1 lg:max-w-xl w-full">
              <input
                type="text"
                placeholder="Search by name, email, or any field..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-6 py-3 border-2 border-black text-black bg-white focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-xl"
              />
            </div>

            <div className="flex items-center gap-3">
              {pagination.totalCount > 0 && (
                <div className="text-sm font-bold text-black bg-white px-6 py-3 border-2 border-black rounded-xl">
                  {pagination.totalCount} Total Users
                </div>
              )}
              
              <button
                onClick={() => handleSort('created_at')}
                className={`px-6 py-3 font-bold border-2 border-black rounded-xl transition-colors ${
                  sortBy === 'created_at' 
                    ? 'bg-black text-white' 
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
                title="Sort by creation date"
              >
                Sort by Date {sortBy === 'created_at' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </div>

        {(editingUser || showAddForm) && (
          <div className="mb-8 p-8 border-4 border-black bg-gray-50 shadow-lg rounded-2xl">
            <h2 className="text-3xl font-bold text-black mb-6 pb-4 border-b-2 border-black">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getEditableColumns().map((column) => (
                <div key={column}>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    {column.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={formData[column] || ''}
                    onChange={(e) => setFormData({ ...formData, [column]: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-black text-black bg-white focus:outline-none focus:ring-4 focus:ring-gray-300 rounded-lg"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-4 pt-6 border-t-2 border-black">
              <button
                onClick={handleSave}
                className="px-8 py-3 bg-black text-white font-bold hover:bg-gray-800 transition-colors shadow-md rounded-xl"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              <button
                onClick={handleCancel}
                className="px-8 py-3 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="border-4 border-black overflow-hidden shadow-lg bg-white rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  {getColumns().map((column) => {
                    let width = 'auto';
                    if (column === 'id') width = '200px';
                    else if (column.toLowerCase() === 'name') width = '180px';
                    else if (column.toLowerCase() === 'email') width = '250px';
                    else if (column.toLowerCase().includes('created') || column.toLowerCase().includes('date')) width = '220px';
                    
                    return (
                      <th 
                        key={column} 
                        className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider"
                        style={{ minWidth: width }}
                      >
                        {column.replace(/_/g, ' ')}
                      </th>
                    );
                  })}
                  <th className="px-6 py-5 text-center text-xs font-bold uppercase tracking-wider" style={{ minWidth: '200px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-gray-200">
                {users.map((user, index) => (
                  <tr key={user.id || index} className="hover:bg-gray-50 transition-colors">
                    {getColumns().map((column) => {
                      const rawValue = user[column];
                      const value = rawValue !== null && rawValue !== undefined 
                        ? String(rawValue) 
                        : '-';
                      const isExpanded = isCellExpanded(user.id, column);
                      const shouldTruncate = value.length > 50;
                      const displayText = getDisplayText(value, isExpanded);
                      const showMoreButton = value.length > 50 && (!isExpanded || value.length > 200);
                      const isDate = isDateColumn(column);
                      
                      return (
                        <td key={column} className="px-6 py-5 text-sm text-black">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start gap-2">
                              <div className="break-words flex-1 font-medium">
                                {displayText}
                              </div>
                              {showMoreButton && (
                                <button
                                  onClick={() => toggleCellExpansion(user.id, column)}
                                  className="text-gray-500 hover:text-black text-xs font-bold whitespace-nowrap flex-shrink-0 px-2 py-1 border border-gray-300 hover:border-black transition-colors rounded-md"
                                >
                                  {isExpanded ? '↑' : '↓'}
                                </button>
                              )}
                            </div>
                            {isDate && value !== '-' && (
                              <div className="text-xs text-gray-500 font-medium">
                                {getRelativeTime(value)}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-5 text-sm">
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-6 py-2 bg-black text-white font-bold hover:bg-gray-800 transition-colors rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="px-6 py-2 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {users.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-600 border-t-4 border-black bg-gray-50">
              <div className="text-xl font-bold mb-2">
                {searchQuery ? '🔍 No users found' : '📋 No users yet'}
              </div>
              <div className="text-sm">
                {searchQuery ? 'Try adjusting your search terms.' : 'Click "Add New User" to create your first user.'}
              </div>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 0 && (
          <div className="mt-8 bg-white border-4 border-black shadow-lg rounded-2xl">
            <div className="p-6 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <span className="text-sm font-bold text-black bg-gray-50 px-6 py-3 border-2 border-black rounded-xl">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">Rows per page:</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="px-4 py-2 border-2 border-black text-black bg-white focus:outline-none focus:ring-4 focus:ring-gray-300 font-bold rounded-lg"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                  title="First page"
                >
                  ««
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-5 py-2 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                >
                  Previous
                </button>
                
                <div className="flex gap-2 mx-2">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 border-2 border-black font-bold transition-colors rounded-lg ${
                          pagination.page === pageNum
                            ? 'bg-black text-white shadow-md'
                            : 'bg-white text-black hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-5 py-2 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                  title="Last page"
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-black rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-black mb-3">Delete User</h3>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
                {deleteConfirm.user && (
                  <div className="bg-gray-50 border-2 border-black rounded-xl p-4 mt-4">
                    <div className="space-y-2">
                      {Object.entries(deleteConfirm.user).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="font-bold text-gray-600 uppercase">{key}:</span>
                          <span className="font-medium text-black truncate ml-2">
                            {value !== null && value !== undefined ? String(value).substring(0, 30) : '-'}
                            {value && String(value).length > 30 ? '...' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-black text-white font-bold hover:bg-gray-800 transition-colors rounded-xl"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-6 py-3 border-2 border-black text-black bg-white font-bold hover:bg-gray-100 transition-colors rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

