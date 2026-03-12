/**
 * Chat Type Definitions
 * 
 * Spec: 009-ai-assistant/spec.md
 * 
 * AI Assistant chat ile ilgili TypeScript type tanımları.
 */

export interface Reference {
  type: string;
  label: string;
  url: string;
  source_file: string;
}

export interface ChatMessage {
  id: string;
  session_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  references: Reference[] | null;
  created_at: string;
}

export interface SendMessageResponse {
  conversation_id: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  remaining_messages: number;
}

export interface ConversationResponse {
  conversation_id: string | null;
  messages: ChatMessage[];
  remaining_messages: number;
}

export interface RemainingMessagesResponse {
  remaining: number;
  limit: number;
  resets_at: string;
}

