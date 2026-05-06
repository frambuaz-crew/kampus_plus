import { apiClient } from './config';

export interface DashboardStatsResponse {
  pending_contributions: number;
  reported_items: number;
  new_messages: number;
  total_users: number;
  ai_messages_today: number;
  approved_data: number;
}

export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  const response = await apiClient.get<DashboardStatsResponse>('/admin/dashboard');
  return response.data;
};
