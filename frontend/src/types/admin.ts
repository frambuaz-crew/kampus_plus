export interface AdminUser {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  university: string | null;
  department: string | null;
  grade: string | null;
  profile_picture_url: string | null;
  created_at: string;
  last_login: string | null;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserStats {
  total: number;
  verified: number;
  unverified: number;
  blocked: number;
}

export type UserStatus = 'all' | 'verified' | 'blocked' | 'unverified';
