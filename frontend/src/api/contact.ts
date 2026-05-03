import { apiClient } from './config';

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface ContactMessageResponse {
  id: string;
  subject: string;
  message: string;
  status: 'pending' | 'answered' | 'spam';
  created_at: string;
  user_id: string;
  answered_at: string | null;
  answered_by: string | null;
}

export interface ContactHistoryResponse {
  messages: ContactMessageResponse[];
  total: number;
}

export interface ContactMessageSenderInfo {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminContactMessageResponse {
  id: string;
  subject: string;
  message: string;
  status: 'pending' | 'answered' | 'spam';
  created_at: string;
  answered_at: string | null;
  answered_by: string | null;
  sender: ContactMessageSenderInfo;
}

export interface AdminMessagesResponse {
  messages: AdminContactMessageResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactMessageStats {
  pending: number;
  answered: number;
  spam: number;
}

export interface ContactMessageCreate {
  subject: string;
  message: string;
}

export interface ContactMessageStatusUpdate {
  status: 'pending' | 'answered' | 'spam';
}

// ── Student functions ────────────────────────────────────────────────────────

export const submitContactMessage = async (
  data: ContactMessageCreate,
): Promise<ContactMessageResponse> => {
  const response = await apiClient.post<ContactMessageResponse>('/contact', data);
  return response.data;
};

export const getContactHistory = async (): Promise<ContactHistoryResponse> => {
  const response = await apiClient.get<ContactHistoryResponse>('/contact/history');
  return response.data;
};

// ── Admin functions ──────────────────────────────────────────────────────────

export const getAdminMessages = async (params?: {
  status?: 'pending' | 'answered' | 'spam';
  page?: number;
  limit?: number;
}): Promise<AdminMessagesResponse> => {
  const response = await apiClient.get<AdminMessagesResponse>('/admin/messages', { params });
  return response.data;
};

export const getAdminMessageStats = async (): Promise<ContactMessageStats> => {
  const response = await apiClient.get<ContactMessageStats>('/admin/messages/stats');
  return response.data;
};

export const updateMessageStatus = async (
  messageId: string,
  data: ContactMessageStatusUpdate,
): Promise<AdminContactMessageResponse> => {
  const response = await apiClient.patch<AdminContactMessageResponse>(
    `/admin/messages/${messageId}/status`,
    data,
  );
  return response.data;
};
