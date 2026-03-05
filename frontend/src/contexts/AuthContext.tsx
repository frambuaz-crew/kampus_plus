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

  // 1. Uygulama açıldığında kullanıcıyı hatırla
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await apiClient.get('/auth/me');

          setToken(storedToken);
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch {
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

  // 2. Öğrenci Girişi
  const login = async (credentials: LoginCredentials): Promise<User> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    const { access_token, user: userData } = response.data;

    setToken(access_token);
    setUser(userData);
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    return userData;
  };

  // 3. Admin Girişi
  const adminLogin = async (credentials: LoginCredentials): Promise<User> => {
    const response = await apiClient.post<LoginResponse>('/auth/admin/login', credentials);
    const { access_token, user: userData } = response.data;

    setToken(access_token);
    setUser(userData);
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    return userData;
  };

  // 4. Çıkış Yap
  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      console.error('Logout API call failed');
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      delete apiClient.defaults.headers.common['Authorization'];
    }
  };

  // 5. Kayıt Ol
  const register = async (data: RegisterData): Promise<void> => {
    await apiClient.post('/auth/register', data);
  };

  // 6. Kullanıcıyı Güncelle (Profil resmi vb. değiştiğinde auth state'i eşitlemek için)
  const updateUser = (newData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updatedUser = { ...prev, ...newData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  // 🚀 TEK VE GÜNCEL VALUE NESNESİ
  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    adminLogin, // Artık burada ve güvende!
    logout,
    register,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };