'use client';

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
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (pagination.page > 0) {
      fetchUsers();
    }
  }, [pagination.page, pagination.limit, searchQuery]);

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
        search: searchQuery
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
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleDelete = async (id: any) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Failed to delete user');
    }
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
    // Filter out JWT columns
    return columns.filter(col => !col.toLowerCase().includes('jwt') && !col.toLowerCase().includes('token'));
  };

  const getEditableColumns = () => {
    return schema.filter(col => 
      col.column_name !== 'id' && 
      !col.column_name.toLowerCase().includes('jwt') && 
      !col.column_name.toLowerCase().includes('token')
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

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-2xl text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-black">
          <h1 className="text-4xl font-bold text-black">User Management Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 border-2 border-black bg-gray-100 text-black">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            + Add New User
          </button>
          
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {(editingUser || showAddForm) && (
          <div className="mb-8 p-6 border-2 border-black bg-white">
            <h2 className="text-2xl font-bold text-black mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getEditableColumns().map((column) => (
                <div key={column}>
                  <label className="block text-sm font-medium text-black mb-2">
                    {column}
                  </label>
                  <input
                    type="text"
                    value={formData[column] || ''}
                    onChange={(e) => setFormData({ ...formData, [column]: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 border-2 border-black text-black bg-white font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="border-2 border-black overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-black text-white">
                <tr>
                  {getColumns().map((column) => (
                    <th 
                      key={column} 
                      className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider"
                      style={{ width: column === 'id' ? '80px' : 'auto' }}
                    >
                      {column}
                    </th>
                  ))}
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider w-48">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {users.map((user, index) => (
                  <tr key={user.id || index} className="border-t-2 border-black hover:bg-gray-50">
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
                        <td key={column} className="px-4 py-4 text-sm text-black">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start gap-2">
                              <div className="break-words flex-1">
                                {displayText}
                              </div>
                              {showMoreButton && (
                                <button
                                  onClick={() => toggleCellExpansion(user.id, column)}
                                  className="text-gray-500 hover:text-black text-xs font-medium whitespace-nowrap flex-shrink-0"
                                >
                                  {isExpanded ? '↑ Less' : '↓ More'}
                                </button>
                              )}
                            </div>
                            {isDate && value !== '-' && (
                              <div className="text-xs text-gray-500 mt-1">
                                {getRelativeTime(value)}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-4 py-1 bg-black text-white font-medium hover:bg-gray-800 transition-colors text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-4 py-1 border-2 border-black text-black bg-white font-medium hover:bg-gray-100 transition-colors text-xs"
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
            <div className="text-center py-12 text-gray-600">
              {searchQuery ? 'No users found matching your search.' : 'No users found. Click "Add New User" to create one.'}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-2 border-black bg-white">
            <div className="flex items-center gap-4">
              <span className="text-sm text-black">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} users
              </span>
              
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="px-3 py-2 border-2 border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 border-2 border-black text-black bg-white font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ««
              </button>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 border-2 border-black text-black bg-white font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                « Prev
              </button>
              
              <div className="flex gap-1">
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
                      className={`px-3 py-2 border-2 border-black font-medium transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-black text-white'
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
                className="px-3 py-2 border-2 border-black text-black bg-white font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next »
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 border-2 border-black text-black bg-white font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

