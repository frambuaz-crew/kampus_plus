/**
 * Chat related TypeScript types (T066)
 */

export type MessageRole = 'user' | 'assistant';

export interface Source {
  title: string;
  source_type: string;
  content_preview: string;
  metadata: {
    document_id?: string;
    course_id?: string;
    user_id?: string;
    page_number?: number;
    chunk_index?: number;
  };
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  sources: Source[] | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  message_count?: number;
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}
