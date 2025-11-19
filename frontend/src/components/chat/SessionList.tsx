import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/config';

interface Session {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface SessionListProps {
  currentSessionId: number | null;
  onSessionSelect: (sessionId: number) => void;
  onNewChat: () => void;
  refreshTrigger?: (refreshFn: () => void) => void;
}

export const SessionList: React.FC<SessionListProps> = ({ currentSessionId, onSessionSelect, onNewChat, refreshTrigger }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/chat/sessions');
      
      // Sort by updated_at descending (most recent first)
      const sortedSessions = [...response.data].sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      setSessions(sortedSessions);
    } catch (err) {
      setError('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    
    // Expose refresh function to parent
    if (refreshTrigger) {
      refreshTrigger(fetchSessions);
    }
  }, [refreshTrigger]);

  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      // Return MM/DD format
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      return `${month}/${day}`;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 gap-4">
        <div className="text-red-500 text-center">{error}</div>
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          ➕ New Chat
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No chat history yet</p>
            <p className="text-sm mt-2">Start a new conversation!</p>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-blue-100 border-2 border-blue-300'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="font-medium text-gray-900 truncate">{session.title}</div>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{session.message_count} messages</span>
                  <span>{formatRelativeTime(session.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
