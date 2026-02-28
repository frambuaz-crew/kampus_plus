/**
 * Forum Type Definitions
 *
 * Backend source of truth:
 * - GET /api/v1/forum/categories
 * - GET /api/v1/forum/topics
 * - GET /api/v1/forum/topics/{topic_id}
 * - POST /api/v1/forum/topics/{topic_id}/replies
 */

export interface ForumCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  topic_count: number;
}

export interface ForumAuthor {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string | null;
  university?: string | null;
  department?: string | { name?: string } | null;
}

export interface ForumTopic {
  id: string;
  title: string;
  content: string;
  author: ForumAuthor | null;
  category_id: string;
  category_name?: string | null;
  reply_count: number;
  view_count: number;
  helpful_count: number;
  is_pinned: boolean;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForumReply {
  id: string;
  content: string;
  author: ForumAuthor | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ForumCategoriesResponse {
  categories: ForumCategory[];
}

export interface ForumTopicsResponse {
  topics: ForumTopic[];
  total: number;
  page: number;
  limit: number;
}

export interface ForumTopicDetailResponse {
  topic: ForumTopic;
  replies: ForumReply[];
}

export interface CreateTopicPayload {
  category_id: string;
  title: string;
  content: string;
}

export interface CreateTopicResponse {
  success: boolean;
  topic_id: string;
}

export interface CreateReplyPayload {
  content: string;
}

export interface CreateReplyResponse {
  success: boolean;
  reply_id: string;
}

export type Category = ForumCategory;
export type ThreadListItem = ForumTopic;

export interface ThreadWithReplies {
  thread: ForumTopic;
  replies: ForumReply[];
}
