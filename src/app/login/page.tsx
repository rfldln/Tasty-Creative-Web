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

// Add this interface for type safety
interface LoginResult {
  success: boolean;
  isAdmin?: boolean;
}

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
      
      // Use type assertion to help TypeScript understand the structure
      if (result && typeof result === 'object' && 'success' in result) {
        const loginResult = result as LoginResult;
        
        if (loginResult.success) {
          // Now TypeScript knows this is a LoginResult type
          if (loginResult.isAdmin) {
            router.push('/admin');
          } else {
            router.push('/');
          }
        }
      }
    } catch (err) {
      setLocalError('An unexpected error occurred');
    }
  };
  
  // Rest of your component code remains unchanged
  return (
    // Your existing JSX
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full text-white">
      {/* Rest of component remains the same */}
    </div>
  );
};

export default LoginPage;