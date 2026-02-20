/**
 * Forum Type Definitions
 * 
 * Spec: 005-forum-page/spec.md
 * 
 * Forum ile ilgili TypeScript type tanımları.
 * NOT: Tüm kullanıcılar profilli (anonim paylaşım yok)
 */

import type { User } from './auth';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  category_type: 'university' | 'department' | 'general';
  description?: string;
  thread_count: number;
  reply_count: number;
  last_activity?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface FileAttachment {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;
}

export interface ForumPost {
  id: string;
  thread_id: string | null;
  parent_id: string | null;
  author: User;
  title: string | null;
  content: string;
  category?: Category;
  tags?: Tag[];
  attachments?: FileAttachment[];
  helpful_count: number;
  is_flagged: boolean;
  is_pinned: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
}

// ThreadListItem arayüzünü şu şekilde güncellemek daha sağlıklı olur:
export interface ThreadListItem {
  id: string;
  title: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    university: string;
  };
  category: Category;
  tags: string[]; // Etiketler genelde string dizisi olarak gelir
  reply_count: number;
  helpful_count: number;
  view_count: number;
  // Sadece sayı yerine, dökümandaki gibi dosya özetini alalım
  files?: { file_name: string; file_size: number }[]; 
  is_pinned: boolean;
  created_at: string; // Paylaşım zamanı
  last_activity: string; // Son mesaj zamanı
}

export interface ThreadWithReplies {
  thread: ForumPost;
  replies: ForumPost[];
}

export interface SearchResult {
  id: string;
  thread_id: string | null;
  type: 'thread' | 'reply';
  title: string | null;
  content: string;
  author: User;
  category?: Category;
  tags?: Tag[];
  created_at: string;
  relevance_score?: number;
}

export interface CategoryListResponse {
  universities: Category[];
  departments: Category[];
  general: Category[];
}
