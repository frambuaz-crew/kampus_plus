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
import { apiClient, API_BASE_URL } from '../../api/config';
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
import { Bot, LoaderCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChatInterfaceProps {
  reloadKey?: number;
  initialConversationId?: string | null;
  onConversationCreated?: (id: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  reloadKey = 0, 
  initialConversationId = null,
  onConversationCreated
}) => {
  const DOCUMENTS_BASE_URL = `${API_BASE_URL}/ai/documents`;

  const normalizeSourceFile = (sourceFile: string): string => {
    const trimmed = sourceFile.trim().replace(/\\/g, '/');
    const baseName = trimmed.split('/').pop() || trimmed;
    return baseName;
  };

  const buildDocumentUrl = (sourceFile: string): string => {
    return `${DOCUMENTS_BASE_URL}/${encodeURIComponent(normalizeSourceFile(sourceFile))}`;
  };

  const getUniqueReferences = (references: Reference[]): Array<Reference & { sourceFileName: string }> => {
    const uniqueMap = new Map<string, Reference & { sourceFileName: string }>();

    references.forEach((ref) => {
      const sourceFileName = ref.source_file?.trim() || '';
      const normalizedSourceFile = normalizeSourceFile(sourceFileName);
      const uniqueKey = normalizedSourceFile.toLowerCase();

      if (!normalizedSourceFile || uniqueMap.has(uniqueKey)) {
        return;
      }

      uniqueMap.set(uniqueKey, { ...ref, sourceFileName: normalizedSourceFile });
    });

    return Array.from(uniqueMap.values());
  };

  const sanitizeAssistantContent = (content: string): string => {
    return content
      .replace(/\s*\(\s*Resmi\s+Dokuman\s*\)\s*/gi, ' ')
      .replace(/\s*\[\s*Kaynak\s*\d+\s*\]\s*/gi, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
        initialConversationId 
          ? apiClient.get<ConversationResponse>('/ai/conversation', { params: { conversation_id: initialConversationId } })
          : Promise.resolve({ data: { messages: [], conversation_id: null } })
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
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isSending ? 'smooth' : 'auto',
      });
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: isSending ? 'smooth' : 'auto' });
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
        { 
          message: messageContent,
          conversation_id: conversationId 
        }
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

      const fallbackRemaining = typeof response.data.remaining_messages === 'number'
        ? response.data.remaining_messages
        : null;
      try {
        const remainingRes = await apiClient.get<RemainingMessagesResponse>('/ai/remaining-messages');
        setRemainingMessages(
          remainingRes.data.remaining
            ?? fallbackRemaining
            ?? null
        );
      } catch {
        setRemainingMessages((prev) => {
          if (fallbackRemaining !== null) {
            return fallbackRemaining;
          }
          if (prev === null) {
            return null;
          }
          return Math.max(0, prev - 1);
        });
      }
      if (!conversationId && response.data.conversation_id) {
        onConversationCreated?.(response.data.conversation_id);
      }
      setConversationId(response.data.conversation_id);
    } catch (err) {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
          setError('AI asistanı yanıt vermedi (zaman aşımı). Lütfen tekrar deneyin.');
        } else if (status === 429) {
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
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(date)
      .replace(',', '');
  };

  const renderMessage = (message: ChatMessage) => {
    if (!message || !message.role) return null;
    
    const isUser = message.role === 'user';
    const references: Reference[] = message.references || [];
    const uniqueReferences = getUniqueReferences(references);
    const primaryReference = uniqueReferences[0] || null;
    const displayContent = isUser ? message.content : sanitizeAssistantContent(message.content);

    return (
      <div
        key={message.id}
        data-role={message.role}
        className={`mb-5 flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ring-1 ${
            isUser
              ? 'bg-[#0ea5e9] text-white ring-[#0ea5e9]/30 rounded-br-sm'
              : 'border border-slate-100 bg-white text-slate-800 ring-slate-200/70 rounded-bl-sm'
          }`}
        >
          <div className="break-words text-sm leading-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold tracking-tight">{children}</strong>,
                ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6 marker:text-sky-400 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6 marker:font-semibold marker:text-sky-400 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="pl-1">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className={`mb-3 rounded-r-xl border-l-4 px-3 py-2 text-[13px] italic ${isUser ? 'border-primary/20 bg-accent0/20 text-indigo-50' : 'border-indigo-300 bg-accent text-slate-700'}`}>
                    {children}
                  </blockquote>
                ),
                pre: ({ children }) => (
                  <pre className={`mb-3 overflow-x-auto rounded-xl border px-3 py-3 text-xs ${isUser ? 'border-indigo-300/50 bg-indigo-800/40 text-indigo-50' : 'border-slate-200 bg-slate-900 text-slate-100'}`}>
                    {children}
                  </pre>
                ),
                code: ({ className, children, ...props }) => {
                  const isCodeBlock = Boolean(className?.includes('language-'));
                  if (isCodeBlock) {
                    return (
                      <code
                        className="font-mono text-xs"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  return (
                    <code
                      className={`rounded px-1.5 py-0.5 font-mono text-xs ${isUser ? 'bg-accent0/30 text-indigo-50' : 'bg-slate-100 text-slate-800'}`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div className="mb-3 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full border-collapse text-left text-xs">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-slate-100 text-slate-700">{children}</thead>,
                th: ({ children }) => <th className="border-b border-slate-200 px-3 py-2 font-semibold">{children}</th>,
                td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2 align-top">{children}</td>,
                a: ({ href = '', children }) => {
                  if (!href) {
                    return <span>{children}</span>;
                  }
                  if (href.startsWith('/')) {
                    return (
                      <Link
                        to={href}
                        className={isUser ? 'font-medium underline decoration-white/50 underline-offset-2' : 'font-medium text-[#0ea5e9] underline underline-offset-2'}
                      >
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={isUser ? 'font-medium underline decoration-white/50 underline-offset-2' : 'font-medium text-[#0ea5e9] underline underline-offset-2'}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>

          <div className={`mt-2 text-[11px] ${isUser ? 'text-white/70' : 'text-slate-400'}`}>
            {formatTimestamp(message.created_at)}
          </div>
          
          {!isUser && primaryReference && (
            <div className="mt-3">
              <a
                href={buildDocumentUrl(primaryReference.sourceFileName)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-[#0ea5e9] transition-colors hover:bg-sky-100"
              >
                📄 Dosyayı Görüntüle
              </a>
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
          <LoaderCircle className="h-4 w-4 animate-spin text-[#0ea5e9]" />
          <span className="text-sm font-medium">Sohbet hazırlanıyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-slate-100 bg-white px-4 py-2 sm:px-6">
        <div className="flex items-center justify-end text-xs text-slate-400">
          {remainingMessages !== null && (
            <span>Bugün {remainingMessages}/50 mesaj hakkın kaldı</span>
          )}
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-[#0ea5e9]" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">
              Merhaba! Sana nasıl yardımcı olabilirim?
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Forum konularını, akademik takvimi, ders programını veya kampüs ilanlarını sorabilirsin.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              {[
                'Yaklaşan sınavlarım ne zaman?',
                'Bu haftaki ders programım nedir?',
                'Staj ilanları var mı?',
                'Popüler forum konuları neler?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInputValue(q)}
                  className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 bg-slate-50 hover:border-[#0ea5e9] hover:text-[#0ea5e9] hover:bg-sky-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.filter(msg => msg && msg.role).map(renderMessage)}
            {isSending && (
              <div data-role="assistant" className="mb-5 flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/70">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[#0ea5e9]" />
                    <Sparkles className="h-4 w-4 animate-pulse text-sky-400" />
                    <span className="font-semibold">Yapay Zeka düşünüyor...</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 w-40 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-2.5 w-52 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-2.5 w-28 animate-pulse rounded-full bg-slate-200" />
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
            className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            rows={3}
            maxLength={500}
          />
          <button
            aria-label="Gönder"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            className="self-end rounded-xl bg-[#0ea5e9] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0284c7] disabled:cursor-not-allowed disabled:bg-slate-300"
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
