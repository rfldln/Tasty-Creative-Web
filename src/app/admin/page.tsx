"use client"

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

// Define types for our data
interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

const AdminPage = () => {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  
  // Check if user is admin on page load
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // Wait a bit for auth to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!user) {
          router.push('/login');
          return;
        }
        
        if (!isAdmin) {
          setError('Access denied. You must be an admin to view this page.');
          // Redirect non-admin users to the main page
          router.push('/');
          return;
        }
        
        // If we got here, user is authenticated and is an admin
        fetchUsers();
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Authentication error');
      }
    };
    
    checkAdmin();
  }, [user, isAdmin, router]);
  
  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!newUsername || !newEmail || !newPassword) {
      setError('All fields are required');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          isAdmin: newIsAdmin
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      // Clear the form
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewIsAdmin(false);
      
      // Show success message and refresh user list
      setSuccess('User created successfully');
      fetchUsers();
    } catch (err: any) {
      console.error('Create user error:', err);
      setError(err.message || 'Failed to create user');
    }
  };
  
  // Delete a user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
      
      // Show success message and refresh user list
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      console.error('Delete user error:', err);
      setError(err.message || 'Failed to delete user');
    }
  };
  
  return (
    <div className="relative flex flex-col w-full min-h-screen text-white">
      {/* Space background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-purple-950/60 to-blue-950/90"></div>
      
      {/* Header */}
      <div className="relative z-10 backdrop-blur-xl bg-black/40 border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 text-sm">Logged in as: {user}</span>
          <Button 
            variant="outline" 
            className="text-white border-white/20 bg-white/5 hover:bg-white/10 rounded-full"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={14} />
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto p-4">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid grid-cols-2 mb-6 bg-black/30 backdrop-blur-lg rounded-full p-1 border border-white/10">
            <TabsTrigger
              value="users"
              className="text-sm rounded-full text-white data-[state=active]:text-black"
            >
              <Users size={16} className="mr-1" />
              Manage Users
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="text-sm rounded-full text-white data-[state=active]:text-black"
            >
              <Plus size={16} className="mr-1" />
              Create User
            </TabsTrigger>
          </TabsList>
          
          {/* Success or error alerts */}
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-500/30 text-red-200">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-900/20 border-green-500/30 text-green-200">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          {/* Users List Tab */}
          <TabsContent value="users">
            <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <CardTitle className="text-white">User Management</CardTitle>
                  <CardDescription className="text-gray-400">
                    View, edit and delete user accounts
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  className="text-white border-white/20 bg-white/5 hover:bg-white/10"
                  onClick={fetchUsers}
                  disabled={loading}
                >
                  <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-gray-300">Username</TableHead>
                          <TableHead className="text-gray-300">Email</TableHead>
                          <TableHead className="text-gray-300">Role</TableHead>
                          <TableHead className="text-gray-300">Created</TableHead>
                          <TableHead className="text-gray-300 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="border-white/10">
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.isAdmin 
                                  ? 'bg-purple-900/50 text-purple-200' 
                                  : 'bg-blue-900/50 text-blue-200'
                              }`}>
                                {user.isAdmin ? 'Admin' : 'User'}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-400">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-400 border-red-800/30 bg-red-900/10 hover:bg-red-900/30"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 size={14} className="mr-1" />
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Create User Tab */}
          <TabsContent value="create">
            <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white">Create New User</CardTitle>
                <CardDescription className="text-gray-400">
                  Add a new user account to the system
                </CardDescription>
              </CardHeader>
              
              <form onSubmit={handleCreateUser}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-300">Username</Label>
                    <Input
                      id="username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-black/60 border-white/10 text-white"
                      placeholder="Enter username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="bg-black/60 border-white/10 text-white"
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-black/60 border-white/10 text-white"
                      placeholder="Enter password"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="admin"
                      checked={newIsAdmin}
                      onCheckedChange={setNewIsAdmin}
                    />
                    <Label htmlFor="admin" className="text-gray-300">Grant Admin Privileges</Label>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  >
                    Create User
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Status Bar */}
      <div className="mt-auto bg-black/20 backdrop-blur-md p-2 text-sm text-gray-400 border-t border-white/5 relative z-10">
        <div className="container mx-auto flex justify-between">
          <div>Tasty Creative Admin v1.0</div>
          <div>Total Users: {users.length}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;