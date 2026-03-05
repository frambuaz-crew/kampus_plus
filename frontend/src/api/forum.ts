import { apiClient } from './config';
import type {
  CreateReplyPayload,
  CreateReplyResponse,
  CreateTopicPayload,
  CreateTopicResponse,
  ForumCategoriesResponse,
  ForumTopicDetailResponse,
  ForumTopicsResponse,
} from '../types/forum';

export const getForumCategories = async (): Promise<ForumCategoriesResponse> => {
  const response = await apiClient.get<ForumCategoriesResponse>('/forum/categories');
  return response.data;
};

export const getForumTopics = async (params?: {
  category_id?: string;
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
