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
import { apiClient } from '../../api/config';
import type {
  ChatMessage,
  ConversationResponse,
  RemainingMessagesResponse,
  SendMessageResponse,
  Reference,
} from '../../types/chat';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  reloadKey?: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ reloadKey = 0 }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadInitialChatData();
  }, [reloadKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const loadInitialChatData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [remainingRes, conversationRes] = await Promise.all([
        apiClient.get<RemainingMessagesResponse>('/ai/remaining-messages'),
        apiClient.get<ConversationResponse>('/ai/conversation'),
      ]);

      setRemainingMessages(remainingRes.data.remaining ?? 50);
      setConversationId(conversationRes.data.conversation_id ?? null);
      setMessages(Array.isArray(conversationRes.data.messages) ? conversationRes.data.messages : []);
    } catch (err) {
      console.error('AI sohbet verileri yüklenemedi:', err);
      setError('Sohbet yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.');
      setRemainingMessages(50);
      setConversationId(null);
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

    // Optimistic user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: conversationId,
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
      setConversationId(response.data.conversation_id);
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
        className={`mb-5 flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ring-1 ${
            isUser
              ? 'bg-indigo-600 text-white ring-indigo-500/40'
              : 'bg-white text-slate-800 ring-slate-200'
          }`}
        >
          <div className="break-words text-sm leading-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 list-disc pl-6 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 list-decimal pl-6 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ className, children, ...props }) => {
                  const isCodeBlock = Boolean(className?.includes('language-'));
                  if (isCodeBlock) {
                    return (
                      <code
                        className="block overflow-x-auto rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-slate-100"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  return (
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-800" {...props}>
                      {children}
                    </code>
                  );
                },
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={isUser ? 'underline decoration-indigo-200' : 'text-indigo-600 underline'}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          <div className={`mt-2 text-[11px] ${isUser ? 'text-indigo-100' : 'text-slate-500'}`}>
            {formatTimestamp(message.created_at)}
          </div>
          
          {!isUser && references.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {references.map((ref, index) => (
                <a
                  key={index}
                  href={ref.url}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 transition-colors hover:bg-indigo-100"
                >
                  {ref.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium">Sohbet hazırlanıyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-600">Kampüs AI Asistan</span>
          {remainingMessages !== null && <span>{remainingMessages}/50 mesaj hakkın kaldı</span>}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <p className="mb-2 text-lg font-semibold text-slate-700">Merhaba! Kampüs Asistanın burada 👋</p>
              <p className="text-sm">Ders, akademik takvim, forum, pazar ve kariyer konularında sorularını sorabilirsin.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.filter(msg => msg && msg.role).map(renderMessage)}
            {isSending && (
              <div data-role="assistant" className="mb-5 flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <span className="font-medium">Asistan düşünüyor...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:px-6">
          {error}
        </div>
      )}

      <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            aria-label="Mesaj girişi"
            placeholder="Mesajını yaz... (Enter: gönder, Shift+Enter: yeni satır)"
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setInputValue(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            rows={3}
            maxLength={500}
          />
          <button
            aria-label="Gönder"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            className="self-end rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Gönder
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            {inputValue.length}/500 karakter
          </span>
          {remainingMessages !== null && (
            <span>
              Bugün {remainingMessages}/50 mesaj hakkın kaldı
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
