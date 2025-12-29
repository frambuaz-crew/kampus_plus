import React, { useState, useRef } from 'react';
import { apiClient } from '../api/config';
import { SessionList } from '../components/chat/SessionList';
import { ChatInterface } from '../components/chat/ChatInterface';
import { Header } from '../components/layout/Header';

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
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export const ChatPage: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const sessionListRefreshRef = useRef<(() => void) | null>(null);

  // Auto-create session on mount if no session exists
  React.useEffect(() => {
    console.log('ChatPage useEffect - initializing session...');
    const initializeSession = async () => {
      try {
        // Check if there are existing sessions
        console.log('Fetching existing sessions...');
        const sessionsResponse = await apiClient.get('/chat/sessions');
        const sessions = sessionsResponse.data;
        console.log('Sessions fetched:', sessions);
        
        if (sessions && sessions.length > 0) {
          // Load the most recent session
          const latestSession = sessions[0];
          console.log('Loading latest session:', latestSession.id);
          await handleSessionSelect(latestSession.id);
        } else {
          // Create a new session if none exist
          console.log('No sessions found, creating new...');
          await handleNewChat();
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
        // Try to create a new session as fallback
        await handleNewChat();
      } finally {
        console.log('Initialization complete, setting isInitializing to false');
        setIsInitializing(false);
      }
    };
    
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSessionSelect = async (sessionId: string) => {
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

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 grid grid-cols-[300px_1fr] overflow-hidden">
        {/* Sidebar with session list */}
        <div className="border-r border-gray-200 overflow-hidden bg-white">
          <SessionList
            currentSessionId={currentSessionId ? Number(currentSessionId) : null}
            onSessionSelect={(id: number) => handleSessionSelect(String(id))}
            onNewChat={handleNewChat}
            refreshTrigger={(refreshFn) => {
              sessionListRefreshRef.current = refreshFn;
            }}
          />
        </div>

        {/* Main chat area */}
        <div className="overflow-hidden flex flex-col bg-white">
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
    </div>
  );
};
