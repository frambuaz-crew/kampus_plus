/**
 * Authentication Type Definitions
 * * Spec: 002-register-page/spec.md, 003-login-page/spec.md, 010-profile/spec.md
 */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: 'student' | 'instructor' | 'admin' | 'university_admin';
  university: string;
  university_id?: string | null;              // ✅ UUID
  department_id: string;
  department?: string | null;
  faculty_id?: string | null;                 // ✅ YENİ: Faculty UUID
  is_verified: boolean;
  grade?: string | null;
  profile_picture_url?: string | null;
  bio?: string | null;
  theme_preference?: string | null;
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
  university: string;
  department_id: string;
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
  updateUser: (data: Partial<User>) => void;
}