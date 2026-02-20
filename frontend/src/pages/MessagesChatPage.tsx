/**
 * Messages Chat Page — Konuşma detayı ve mesajlaşma
 * Spec: 013-messages/spec.md
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Briefcase,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { apiClient } from '../api/config';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ConvInfo {
  id: string;
  type: 'career' | 'marketplace';
  reference: { id: string; title: string; image_url?: string | null; company_name?: string | null };
  other_user: {
    id: string;
    username: string;
    full_name: string;
    profile_picture_url?: string | null;
  };
  user1_id: string;
  user2_id: string;
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

export const MessagesChatPage: React.FC = () => {
  const { id: convId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const myId: string = currentUser?.id || currentUser?.user_id || '';

  const [conv, setConv] = useState<ConvInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async (silent = false) => {
    if (!convId) return;
    try {
      if (!silent) setLoadingMsgs(true);
      const res = await apiClient.get(`/messages/conversations/${convId}/messages?limit=100`);
      setMessages(res.data?.messages || []);
    } catch {
      // silently fail on polling
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, [convId]);

  useEffect(() => {
    if (!convId) return;

    const loadConv = async () => {
      try {
        const res = await apiClient.get(`/messages/conversations/${convId}`);
        setConv(res.data);
      } catch {
        // ignore
      } finally {
        setLoadingConv(false);
      }
    };

    loadConv();
    loadMessages();
  }, [convId, loadMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    pollingRef.current = setInterval(() => loadMessages(true), 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !convId) return;

    try {
      setSending(true);
      const res = await apiClient.post(`/messages/conversations/${convId}/messages`, {
        content: trimmed,
      });
      setText('');
      setMessages((prev) => [...prev, res.data]);
      setTimeout(scrollToBottom, 50);
    } catch {
      alert('Mesaj gönderilemedi.');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date for separators
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const dayStr = new Date(msg.created_at).toDateString();
    const last = acc[acc.length - 1];
    if (!last || last.date !== dayStr) {
      acc.push({ date: dayStr, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
    return acc;
  }, []);

  const refTitle = conv?.reference?.title || '';
  const refSub = conv?.reference?.company_name || (conv?.type === 'marketplace' ? 'Pazar İlanı' : '');

  return (
    <MainLayout>
      <div className="w-full h-[calc(100vh-64px)] flex flex-col">

        {/* Chat Header */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/messages')}
              className="text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {conv?.other_user?.full_name?.charAt(0).toUpperCase() ||
                conv?.other_user?.username?.charAt(0).toUpperCase() || '?'}
            </div>

            <div className="flex-1 min-w-0">
              {loadingConv ? (
                <div className="space-y-1 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
              ) : (
                <>
                  <p className="font-semibold text-slate-900 text-sm">
                    @{conv?.other_user?.username || '—'}
                  </p>
                  {refTitle && (
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                      {conv?.type === 'career' ? (
                        <Briefcase className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <ShoppingBag className="w-3 h-3 flex-shrink-0" />
                      )}
                      {refTitle}
                      {refSub && ` • ${refSub}`}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Go to listing */}
            {conv?.reference?.id && (
              <button
                onClick={() =>
                  navigate(
                    conv.type === 'career'
                      ? '/dashboard/career'
                      : '/dashboard/marketplace'
                  )
                }
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="İlana git"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-1">
            {loadingMsgs ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2.5 h-10 ${i % 2 === 0 ? 'bg-white w-48' : 'bg-indigo-200 w-36'}`}
                    />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">Henüz mesaj yok. Konuşmayı başlatın!</p>
              </div>
            ) : (
              groupedMessages.map(({ date, msgs }) => (
                <div key={date} className="space-y-1">
                  {/* Date separator */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">
                      {formatDateSeparator(msgs[0].created_at)}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {msgs.map((msg) => {
                    const isMe = msg.sender_id === myId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}
                      >
                        <div
                          className={`relative max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-sm'
                              : 'bg-white text-slate-900 border border-slate-100 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <p
                            className={`text-xs mt-1 text-right ${
                              isMe ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            {formatMsgTime(msg.created_at)}
                            {isMe && (
                              <span className="ml-1">
                                {msg.is_read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesaj yaz... (Enter ile gönder)"
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 bg-slate-100 border border-transparent rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-300 transition-all max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
            >
              {sending ? (
                <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <Send className={`w-4 h-4 ${text.trim() ? 'text-white' : 'text-slate-400'}`} />
              )}
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-1.5 max-w-2xl mx-auto">
            Shift+Enter yeni satır ekler
          </p>
        </div>
      </div>
    </MainLayout>
  );
};
