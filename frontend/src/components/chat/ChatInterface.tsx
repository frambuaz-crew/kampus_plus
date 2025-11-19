/**
 * ChatInterface Component - KAMPÜS+ Phase 4 (T066)
 * 
 * Main chat interface with AI assistant.
 * 
 * Features:
 * - Message list rendering (user/assistant with data-role attributes)
 * - Message input with multi-line support (textarea)
 * - Send button with Enter/Shift+Enter handling
 * - Typing indicator during AI response
 * - Source citations display with expandable cards
 * - Loading states (initial load, AI response)
 * - Error handling (API errors, network failures)
 * - Auto-scroll to latest message
 * - Empty state when no messages
 * - Message timestamps
 */

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/config';
import type { ChatMessage, SendMessageResponse, Source } from '../../types/chat';
import axios from 'axios';

interface ChatInterfaceProps {
  sessionId: number | null;
  initialMessages?: ChatMessage[];
  onMessageSent?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionId, 
  initialMessages = [], 
  onMessageSent 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages.filter(msg => msg !== undefined));
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initialMessages with local state
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages.filter(msg => msg !== undefined));
      setIsLoading(false);
    } else if (sessionId) {
      // Only load from API if no initialMessages provided
      loadMessages();
    } else {
      setMessages([]);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]); // Only re-run when sessionId changes, not initialMessages

  // Auto-scroll to latest message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!sessionId) {
      // Don't clear messages if we have initialMessages
      if (!initialMessages || initialMessages.length === 0) {
        setMessages([]);
      }
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/chat/sessions/${sessionId}`);
      // API can return either {messages: [...]} or [...] directly
      const messagesData = response.data.messages || response.data;
      setMessages(Array.isArray(messagesData) ? messagesData : []);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setError(null);

    // Optimistically add user message to show immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
      sources: null,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await apiClient.post<SendMessageResponse>(
        `/chat/sessions/${sessionId}/messages`,
        { content: messageContent }
      );

      // Replace temp message with real messages from API
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMessage.id);
        return [
          ...withoutTemp,
          response.data.user_message,
          response.data.assistant_message,
        ];
      });
      
      // Notify parent component (e.g., ChatPage to refresh session list)
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      
      if (axios.isAxiosError(err)) {
        if (err.message === 'Network Error') {
          setError('Network error. Please check your connection and try again.');
        } else if (err.response?.status === 500) {
          setError('Server error. Please try again later.');
        } else {
          setError('Failed to send message. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      // Restore input value on error
      setInputValue(messageContent);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleSourceExpansion = (sourceId: string) => {
    setExpandedSources((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    // Show time if today
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderMessage = (message: ChatMessage) => {
    if (!message || !message.role) return null;
    
    const isUser = message.role === 'user';
    const sourceId = `${message.id}-sources`;

    return (
      <div
        key={message.id}
        data-role={message.role}
        className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}
      >
        <div className={`inline-block max-w-[80%] ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-2`}>
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          <div className="text-xs mt-1 opacity-70">
            {formatTimestamp(message.created_at)}
          </div>
        </div>

        {/* Source citations for assistant messages */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 text-left">
            <div className="text-sm text-gray-600 mb-1">Sources:</div>
            {message.sources.map((source: Source, index: number) => {
              const uniqueSourceId = `${sourceId}-${index}`;
              const isExpanded = expandedSources.has(uniqueSourceId);

              return (
                <div
                  key={index}
                  className="bg-gray-50 border border-gray-200 rounded p-2 mb-1 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSourceExpansion(uniqueSourceId)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{source.title}</div>
                      <div className="text-xs text-gray-500">{source.source_type}</div>
                    </div>
                    <div className="text-gray-400 ml-2">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 text-sm text-gray-700 border-t border-gray-200 pt-2">
                      {source.content_preview}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start a conversation with KAMPÜS+ AI Assistant</p>
            </div>
          </div>
        ) : (
          <>
            {messages.filter(msg => msg && msg.role).map(renderMessage)}
            {isSending && (
              <div data-role="assistant" className="mb-4 text-left">
                <div className="inline-block bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse">AI is thinking...</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            aria-label="Message input"
            placeholder="Type your message... (Shift+Enter for new line)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={3}
          />
          <button
            aria-label="Send"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
