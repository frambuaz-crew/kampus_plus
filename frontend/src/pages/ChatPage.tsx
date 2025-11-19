import React, { useState, useRef } from 'react';
import { apiClient } from '../api/config';
import { SessionList } from '../components/chat/SessionList';
import { ChatInterface } from '../components/chat/ChatInterface';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    page_number: number;
    document_title: string;
    document_url?: string;
  }>;
}

interface Session {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export const ChatPage: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionListRefreshRef = useRef<(() => void) | null>(null);

  const handleSessionSelect = async (sessionId: number) => {
    try {
      setError(null);
      const response = await apiClient.get(`/chat/sessions/${sessionId}`);
      
      setMessages(response.data.messages || []);
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error('Failed to load session messages:', err);
      setError('Failed to load messages');
    }
  };

  const handleNewChat = async () => {
    try {
      setError(null);
      const response = await apiClient.post<Session>('/chat/sessions', {
        title: 'New Chat',
      });

      // Clear current messages and select new session
      setMessages([]);
      setCurrentSessionId(response.data.id);
      
      // Refresh session list
      if (sessionListRefreshRef.current) {
        sessionListRefreshRef.current();
      }
    } catch (err) {
      console.error('Failed to create new chat:', err);
      setError('Failed to create new chat');
    }
  };

  const handleMessageSent = () => {
    // Refresh session list to update message counts
    if (sessionListRefreshRef.current) {
      sessionListRefreshRef.current();
    }
  };

  return (
    <div className="h-screen grid grid-cols-[300px_1fr]">
      {/* Sidebar with session list */}
      <div className="border-r border-gray-200 overflow-hidden">
        <SessionList
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
          refreshTrigger={(refreshFn) => {
            sessionListRefreshRef.current = refreshFn;
          }}
        />
      </div>

      {/* Main chat area */}
      <div className="overflow-hidden flex flex-col">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
            {error}
          </div>
        )}
        <ChatInterface
          sessionId={currentSessionId}
          initialMessages={messages}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
};
