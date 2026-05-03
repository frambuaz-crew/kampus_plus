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
  description?: string | null;
  icon?: string | null;
  order_index: number;
  is_active: boolean;
  topic_count: number;
}

export interface ForumCategoriesResponse {
  categories: ForumCategory[];
}

export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
  icon?: string | null;
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string | null;
  icon?: string | null;
  order_index?: number;
  is_active?: boolean;
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
  topic_type: 'text' | 'event';
  tags?: string[] | null;       // JSONB native list
  image_urls?: string[] | null; // JSONB native list
  author: ForumAuthor | null;
  reply_count: number;
  view_count: number;
  helpful_count: number;
  is_pinned: boolean;
  is_liked_by_me?: boolean;
  event_date?: string | null;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForumReply {
  id: string;
  content: string;
  parent_id?: string | null;
  author: ForumAuthor | null;
  helpful_count: number;
  is_liked_by_me?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumReport {
  id: string;
  topic_id?: string | null;
  reply_id?: string | null;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
  topic_title?: string | null;
  reply_content?: string | null;
  reporter_name?: string | null;
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
  title: string;
  content: string;
  category_id?: string;
  topic_type?: 'text' | 'event';
  tags?: string[];
  image_urls?: string[];
}

export interface CreateTopicResponse {
  success: boolean;
  topic_id: string;
}

export interface CreateReplyPayload {
  content: string;
  parent_id?: string | null;
}

export interface CreateReplyResponse {
  success: boolean;
  reply_id: string;
}

export interface ForumReportsResponse {
  reports: ForumReport[];
  total: number;
}


export type ThreadListItem = ForumTopic;

export interface ThreadWithReplies {
  thread: ForumTopic;
  replies: ForumReply[];
}
