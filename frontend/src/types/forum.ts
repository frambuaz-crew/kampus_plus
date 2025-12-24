/**
 * Forum type definitions
 */

export interface ForumPost {
  id: string;
  thread_id: string | null;
  title: string | null;
  content: string;
  anonymous_id: string;
  is_flagged: boolean;
  created_at: string;
}

export interface ThreadListItem {
  id: string;
  title: string | null;
  anonymous_id: string;
  reply_count: number;
  last_activity: string;
}

export interface ThreadWithReplies {
  thread: ForumPost;
  replies: ForumPost[];
}

export interface SearchResult {
  id: string;
  thread_id: string | null;
  title: string | null;
  content: string;
  anonymous_id: string;
  created_at: string;
}
