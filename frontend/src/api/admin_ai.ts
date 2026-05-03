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

export interface DailyUsageItem {
  date: string;   // "YYYY-MM-DD"
  count: number;
}

export interface AIStatsResponse {
  total_conversations: number;
  messages_today: number;
  active_conversations: number;
  daily_usage: DailyUsageItem[];
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

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export interface AIKnowledgeBaseEntry {
  id: string;
  keywords: string[];
  answer: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface AIKnowledgeBaseCreate {
  keywords: string[];
  answer: string;
  priority: number;
  is_active: boolean;
}

export interface AIKnowledgeBaseUpdate {
  keywords?: string[];
  answer?: string;
  priority?: number;
  is_active?: boolean;
}

export const getKnowledgeBase = async (): Promise<AIKnowledgeBaseEntry[]> => {
  const response = await apiClient.get<AIKnowledgeBaseEntry[]>('/admin/ai/knowledge-base');
  return response.data;
};

export const createKnowledgeBase = async (data: AIKnowledgeBaseCreate): Promise<AIKnowledgeBaseEntry> => {
  const response = await apiClient.post<AIKnowledgeBaseEntry>('/admin/ai/knowledge-base', data);
  return response.data;
};

export const updateKnowledgeBase = async (id: string, data: AIKnowledgeBaseUpdate): Promise<AIKnowledgeBaseEntry> => {
  const response = await apiClient.put<AIKnowledgeBaseEntry>(`/admin/ai/knowledge-base/${id}`, data);
  return response.data;
};

export const deleteKnowledgeBase = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/ai/knowledge-base/${id}`);
};
