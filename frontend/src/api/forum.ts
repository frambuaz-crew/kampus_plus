import { apiClient } from './config';
import type {
  CreateReplyPayload,
  CreateReplyResponse,
  CreateTopicPayload,
  CreateTopicResponse,
  ForumTopicDetailResponse,
  ForumTopicsResponse,
} from '../types/forum';

export const getForumTopics = async (params?: {
  category_id?: string;
  topic_type?: string;
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
