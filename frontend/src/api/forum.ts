import { apiClient } from './config';
import type {
  CreateReplyPayload,
  CreateReplyResponse,
  CreateTopicPayload,
  CreateTopicResponse,
  ForumTopicDetailResponse,
  ForumTopicsResponse,
  ForumReportsResponse,
} from '../types/forum';

export const getForumTopics = async (params?: {
  category_id?: string;
  topic_type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'most_replies' | 'most_views';
}): Promise<ForumTopicsResponse> => {
  const response = await apiClient.get<ForumTopicsResponse>('/forum/topics', { params });
  return response.data;
};

export const getForumTopicDetail = async (topicId: string): Promise<ForumTopicDetailResponse> => {
  const response = await apiClient.get<ForumTopicDetailResponse>(`/forum/topics/${topicId}`);
  return response.data;
};

export const createForumTopic = async (payload: CreateTopicPayload): Promise<CreateTopicResponse> => {
  const response = await apiClient.post<CreateTopicResponse>('/forum/topics', payload);
  return response.data;
};

export const createForumReply = async (
  topicId: string,
  payload: CreateReplyPayload,
): Promise<CreateReplyResponse> => {
  const response = await apiClient.post<CreateReplyResponse>(`/forum/topics/${topicId}/replies`, payload);
  return response.data;
};



export const uploadForumImages = async (files: File[]): Promise<{ success: boolean; urls: string[] }> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await apiClient.post<{ success: boolean; urls: string[] }>('/forum/upload-images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const markTopicHelpful = async (topicId: string): Promise<{ success: boolean; helpful_count: number; action?: string }> => {
  const response = await apiClient.post<{ success: boolean; helpful_count: number; action?: string }>(`/forum/topics/${topicId}/helpful`);
  return response.data;
};

export const getTopicLikers = async (topicId: string) => {
  const response = await apiClient.get(`/forum/topics/${topicId}/likers`);
  return response.data;
};

export const markReplyHelpful = async (replyId: string) => {
  const response = await apiClient.post(`/forum/replies/${replyId}/helpful`);
  return response.data;
};


// ============================================================================
// YENİ: CRUD + RAPORLAMA + ADMİN
// ============================================================================

export const updateForumTopic = async (
  topicId: string,
  payload: { title?: string; content?: string; tags?: string[] },
): Promise<{ success: boolean }> => {
  const response = await apiClient.patch<{ success: boolean }>(`/forum/topics/${topicId}`, payload);
  return response.data;
};

export const deleteForumTopic = async (topicId: string): Promise<{ success: boolean }> => {
  const response = await apiClient.delete<{ success: boolean }>(`/forum/topics/${topicId}`);
  return response.data;
};

export const updateForumReply = async (
  replyId: string,
  payload: { content: string },
): Promise<{ success: boolean }> => {
  const response = await apiClient.patch<{ success: boolean }>(`/forum/replies/${replyId}`, payload);
  return response.data;
};

export const deleteForumReply = async (replyId: string): Promise<{ success: boolean }> => {
  const response = await apiClient.delete<{ success: boolean }>(`/forum/replies/${replyId}`);
  return response.data;
};

export const reportForumTopic = async (
  topicId: string,
  reason: string,
): Promise<{ success: boolean; report_id: string }> => {
  const response = await apiClient.post<{ success: boolean; report_id: string }>(`/forum/topics/${topicId}/report`, { reason });
  return response.data;
};

export const reportForumReply = async (
  replyId: string,
  reason: string,
): Promise<{ success: boolean; report_id: string }> => {
  const response = await apiClient.post<{ success: boolean; report_id: string }>(`/forum/replies/${replyId}/report`, { reason });
  return response.data;
};

export const getForumReports = async (
  reportStatus: string = 'pending',
): Promise<ForumReportsResponse> => {
  const response = await apiClient.get<ForumReportsResponse>('/forum/admin/reports', { params: { report_status: reportStatus } });
  return response.data;
};

export const resolveForumReport = async (
  reportId: string,
  action: 'delete_content' | 'reject',
): Promise<{ success: boolean; status: string }> => {
  const response = await apiClient.post<{ success: boolean; status: string }>(`/forum/admin/reports/${reportId}/resolve`, null, { params: { action } });
  return response.data;
};

export const getAdminForumTopics = async (params?: {
  page?: number;
  limit?: number;
}): Promise<ForumTopicsResponse> => {
  const response = await apiClient.get<ForumTopicsResponse>('/forum/topics', { params: { ...params, sort: 'newest' } });
  return response.data;
};
