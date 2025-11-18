/**
 * Authentication Context (T047)
 * 
 * Provides:
 * - User state management
 * - JWT token storage
 * - Login/logout/register functions
 * - Automatic token refresh (via API interceptor)
 * - isAuthenticated flag
 */

import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData, AuthContextType, LoginResponse } from '../types/auth';
import { apiClient } from '../api/config';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    const { access_token, user: userData } = response.data;

    // Store in state
    setToken(access_token);
    setUser(userData);

    // Store in localStorage
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    return userData;
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint to revoke refresh token
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Log error but continue with local logout
      console.error('Logout API call failed:', error);
    } finally {
      // Clear state and localStorage
      setToken(null);
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    await apiClient.post('/auth/register', data);
    // Don't auto-login after registration (user needs to verify email)
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export context for custom hooks
export { AuthContext };
