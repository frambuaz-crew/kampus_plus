import { apiClient } from './config';

export interface AISettingsResponse {
  id: string;
  system_prompt: string;
  rate_limit_per_day: number;
  updated_at: string;
  updated_by_username: string | null;
}

export interface AISettingsUpdate {
  system_prompt?: string;
  rate_limit_per_day?: number;
}

export interface AIStatsResponse {
  total_conversations: number;
  messages_today: number;
  active_conversations: number;
}

export const getAIStats = async (): Promise<AIStatsResponse> => {
  const response = await apiClient.get<AIStatsResponse>('/admin/ai/stats');
  return response.data;
};

export const getAISettings = async (): Promise<AISettingsResponse> => {
  const response = await apiClient.get<AISettingsResponse>('/admin/ai/settings');
  return response.data;
};

export const updateAISettings = async (data: AISettingsUpdate): Promise<AISettingsResponse> => {
  const response = await apiClient.put<AISettingsResponse>('/admin/ai/settings', data);
  return response.data;
};
