"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Star, UserCircle } from 'lucide-react';

const LoginPage = () => {
  const { login, user, loading, error } = useAuth();
  const router = useRouter();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/admin');
    }
  }, [user, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    if (!username || !password) {
      setLocalError('Username and password are required');
      return;
    }
    
    try {
      const result = await login(username, password);
      
      // Check if result is an object with success property
      if (result && typeof result === 'object' && 'success' in result) {
        // Redirect admin users to admin dashboard, regular users to home page
        if ('isAdmin' in result && result.isAdmin) {
          router.push('/admin');
        } else {
          router.push('/'); // or wherever regular users should go
        }
      }
    } catch (err) {
      setLocalError('An unexpected error occurred');
    }
  };
  
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full text-white">
      {/* Space background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-purple-950/60 to-blue-950/90"></div>
      
      {/* Login container */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
            <Star size={32} className="text-white" />
          </div>
        </div>
        
        <Card className="bg-black/30 backdrop-blur-md border-white/10 rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-2xl">Login</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your credentials to access the Tasty AI Creative
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {(error || localError) && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-500/30 text-red-200">
                  <AlertDescription>{error || localError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-black/60 border-white/10 text-white pl-10"
                    placeholder="Enter your username"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/60 border-white/10 text-white pl-10"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Additional empty div to create more space */}
              <div className="h-4"></div>
            </CardContent>
            
            <CardFooter className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login to Dashboard'}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center mt-4 text-gray-400 text-sm">
          <p>Tasty Creative Admin v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;