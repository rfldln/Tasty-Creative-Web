"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: string | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  error: null,
  login: async () => false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Update loading state based on NextAuth session status
    setLoading(status === 'loading');
  }, [status]);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
      });
      
      if (result?.error) {
        setError('Invalid username or password');
        return false;
      }
      
      // Refresh session to get updated user data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get session data to check if user is admin
      const session = await fetch('/api/auth/session');
      const sessionData = await session.json();
      
      // Return true with admin status to handle redirection
      return { 
        success: true, 
        isAdmin: sessionData?.user?.isAdmin || false 
      };
    } catch (error) {
      setError('An error occurred during login');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const value = {
    user: session?.user?.username || null,
    isAdmin: session?.user?.isAdmin || false,
    loading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};