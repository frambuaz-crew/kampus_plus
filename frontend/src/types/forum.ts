/**
 * Forum Type Definitions
 *
 * Backend source of truth:
 * - GET /api/v1/forum/categories
 * - GET /api/v1/forum/topics
 * - GET /api/v1/forum/topics/{topic_id}
 * - POST /api/v1/forum/topics/{topic_id}/replies
 */


export interface ForumAuthor {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string | null;
  university?: string | null;
  department?: string | { name?: string } | null;
}

export interface ForumPollOption {
  id: string;
  option_text: string;
  vote_count: number;
}

export interface ForumTopic {
  id: string;
  title: string;
  content: string;
  topic_type: 'text' | 'event' | 'photo' | 'poll';
  tags?: string | null;  // JSON stringified array of strings
  image_urls?: string | null; // JSON stringified array of URLs
  polls?: ForumPollOption[];
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
  created_at: string;
  updated_at: string;
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
  topic_type?: 'text' | 'event' | 'photo' | 'poll';
  tags?: string[];
  image_urls?: string[];
  poll_options?: string[];
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


export type ThreadListItem = ForumTopic;

export interface ThreadWithReplies {
  thread: ForumTopic;
  replies: ForumReply[];
}
