import { apiClient } from './config';
import type { AdminUser, AdminUserListResponse, AdminUserStats, UserStatus } from '../types/admin';

export const getAdminUserStats = async (): Promise<AdminUserStats> => {
  const response = await apiClient.get<AdminUserStats>('/users/admin/stats');
  return response.data;
};

export const getAdminUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
}): Promise<AdminUserListResponse> => {
  const response = await apiClient.get<AdminUserListResponse>('/users/admin/list', { params });
  return response.data;
};

export const getAdminUserDetail = async (userId: string): Promise<AdminUser> => {
  const response = await apiClient.get<AdminUser>(`/users/admin/${userId}`);
  return response.data;
};

export const toggleUserBlock = async (
  userId: string,
  block: boolean,
): Promise<{ success: boolean; is_active: boolean }> => {
  const response = await apiClient.patch<{ success: boolean; is_active: boolean }>(
    `/users/admin/${userId}/block`,
    { block },
  );
  return response.data;
};

export const toggleUserVerification = async (
  userId: string,
  verified: boolean,
): Promise<{ success: boolean; is_verified: boolean }> => {
  const response = await apiClient.patch<{ success: boolean; is_verified: boolean }>(
    `/users/admin/${userId}/verify`,
    { verified },
  );
  return response.data;
};

export const changeUserRole = async (
  userId: string,
  role: string,
): Promise<{ success: boolean; role: string }> => {
  const response = await apiClient.patch<{ success: boolean; role: string }>(
    `/users/admin/${userId}/role`,
    { role },
  );
  return response.data;
};
