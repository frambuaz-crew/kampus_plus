/**
 * ChatInterface Component
 * 
 * Spec: 009-ai-assistant/spec.md
 * 
 * AI Asistan chat arayüzü:
 * - Mesaj listesi (user/assistant bubble design)
 * - Mesaj input (multiline, max 500 karakter)
 * - Gönder butonu (Enter/Shift+Enter)
 * - Kalan mesaj sayacı (50/gün)
 * - Loading state ("🤖 Düşünüyor...")
 * - Zaman damgası
 * - References (linkler)
 * - Empty state
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/config';
import type { ChatMessage, SendMessageResponse, Reference } from '../../types/chat';
import axios from 'axios';

interface ChatInterfaceProps {
  sessionId: string | null;
  initialMessages?: ChatMessage[];
  onMessageSent?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionId, 
  initialMessages = [], 
  onMessageSent 
}) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages.filter(msg => msg !== undefined));
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages.filter(msg => msg !== undefined));
      setIsLoading(false);
    } else if (sessionId) {
      loadMessages();
    } else {
      setMessages([]);
      setIsLoading(false);
    }
    loadRemainingMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!sessionId) {
      if (!initialMessages || initialMessages.length === 0) {
        setMessages([]);
      }
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/ai/conversation`);
      const messagesData = response.data.messages || [];
      setMessages(Array.isArray(messagesData) ? messagesData : []);
    } catch (err) {
      console.error('Mesajlar yüklenemedi:', err);
      setError('Mesajlar yüklenemedi');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRemainingMessages = async () => {
    try {
      const response = await apiClient.get(`/ai/remaining-messages`);
      setRemainingMessages(response.data.remaining || 50);
    } catch (err) {
      setRemainingMessages(50);
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

    // Optimistic user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
      references: null,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await apiClient.post<SendMessageResponse>(
        `/ai/chat`,
        { message: messageContent }
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

      setRemainingMessages(response.data.remaining_messages);
      
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err) {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 429) {
          setError('Günlük mesaj limitine ulaştınız (50 mesaj/gün). Yarın tekrar deneyin.');
        } else if (status === 400) {
          setError('Geçersiz mesaj. Lütfen tekrar deneyin.');
        } else if (status === 500) {
          setError('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
        } else if (err.message === 'Network Error') {
          setError('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
        } else {
          setError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
        }
      } else {
        setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }
      
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

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'az önce';
    if (diffMins === 1) return '1 dakika önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
  };

  const renderMessage = (message: ChatMessage) => {
    if (!message || !message.role) return null;
    
    const isUser = message.role === 'user';
    const references: Reference[] = message.references || [];

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

        {/* References (linkler) - Spec'e göre */}
        {!isUser && references.length > 0 && (
          <div className="mt-2 text-left space-y-1">
            {references.map((ref, index) => (
              <button
                key={index}
                onClick={() => navigate(ref.url)}
                className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline bg-indigo-50 px-3 py-1 rounded border border-indigo-200"
              >
                {ref.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Mesajlar yükleniyor...</div>
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
              <p className="text-lg mb-2">🤖 Merhaba! Ben senin kampüs asistanınım.</p>
              <p className="text-sm mb-1">Ders programın, akademik takvim, forum, pazar ve</p>
              <p className="text-sm">kariyer ilanları hakkında sorularını yanıtlayabilirim.</p>
              <p className="text-sm mt-2 text-gray-500">Nasıl yardımcı olabilirim?</p>
            </div>
          </div>
        ) : (
          <>
            {messages.filter(msg => msg && msg.role).map(renderMessage)}
            {isSending && (
              <div data-role="assistant" className="mb-4 text-left">
                <div className="inline-block bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <span className="animate-pulse">🤖 Düşünüyor...</span>
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
            aria-label="Mesaj girişi"
            placeholder="Mesajınızı yazın... (Shift+Enter ile yeni satır)"
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setInputValue(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={3}
            maxLength={500}
          />
          <button
            aria-label="Gönder"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Gönder
          </button>
        </div>
        
        {/* Remaining Messages Counter */}
        <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
          <span>
            {inputValue.length}/500 karakter
          </span>
          {remainingMessages !== null && (
            <span>
              {remainingMessages}/50 mesaj kaldı bugün
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
