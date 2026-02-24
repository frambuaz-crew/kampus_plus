/**
 * Authentication Type Definitions
 * * Spec: 002-register-page/spec.md, 003-login-page/spec.md, 010-profile/spec.md
 */

import type { Department } from './department'; // Yeni oluşturduğun tipi import ediyoruz

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: 'student' | 'instructor' | 'admin';
  university: string; 
  department_id: number; // Artik string değil, number (ID)
  department?: Department | null; // Opsiyonel olarak ilişki nesnesini de tutabiliriz
  is_verified: boolean;
  profile_picture_url?: string | null;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  department_id: number; // Kullanıcı seçim yaptığında ID göndereceğiz
  terms_accepted: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  adminLogin: (credentials: LoginCredentials) => Promise<User>; 
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}