/**
 * AuthContext Component
 * 
 * Spec: 003-login-page/spec.md, 004-dashboard/spec.md
 * 
 * Authentication state yönetimi:
 * - User state ve JWT token storage
 * - Login/logout/register fonksiyonları
 * - Token validation (localStorage'dan token varsa, API'den user bilgisi çek)
 * - isAuthenticated flag
 * 
 * NOT: Refresh token httpOnly cookie olarak backend'den gelir (localStorage'da saklanmaz)
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
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Validate token by fetching current user
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await apiClient.get('/auth/me');
          
          setToken(storedToken);
          setUser(response.data);
          // Update localStorage with fresh user data
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
          // Token invalid or expired, clear storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
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
    
    // Set default Authorization header for future requests
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    return userData;
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint to revoke refresh token (httpOnly cookie)
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
      delete apiClient.defaults.headers.common['Authorization'];
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

export { AuthContext };
