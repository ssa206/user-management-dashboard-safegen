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

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [schema, setSchema] = useState<SchemaColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

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
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
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
    if (users.length > 0) {
      return Object.keys(users[0]);
    }
    return schema.map(col => col.column_name);
  };

  const getEditableColumns = () => {
    return schema.filter(col => col.column_name !== 'id').map(col => col.column_name);
  };

  if (loading) {
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

        <div className="mb-6">
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            + Add New User
          </button>
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
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  {getColumns().map((column) => (
                    <th key={column} className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                      {column}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {users.map((user, index) => (
                  <tr key={user.id || index} className="border-t-2 border-black hover:bg-gray-50">
                    {getColumns().map((column) => (
                      <td key={column} className="px-6 py-4 text-sm text-black">
                        {user[column] !== null && user[column] !== undefined 
                          ? String(user[column]) 
                          : '-'}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-4 py-1 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-4 py-1 border-2 border-black text-black bg-white font-medium hover:bg-gray-100 transition-colors"
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
          
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              No users found. Click "Add New User" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

