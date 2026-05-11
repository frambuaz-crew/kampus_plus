/**
 * AI Assistant Page
 *
 * Spec: 009-ai-assistant/spec.md
 * Design: Figma export
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { apiClient } from '../api/config';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reference {
  type: string;
  label: string;
  url: string;
  source_file: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: Reference[];
  created_at: string;
}

interface ConversationSummary {
  id: string;
  label: string;
  time: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Very basic markdown renderer: bold, inline code, code blocks, bullet lists */
function renderContent(text: string) {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, bi) => {
    // Code block
    if (block.startsWith('```')) {
      const code = block.replace(/^```\w*\n?/, '').replace(/```$/, '');
      return (
        <pre key={bi} className="bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-xs font-mono my-2">
          <code>{code}</code>
        </pre>
      );
    }

    // Bullet list lines
    const lines = block.split('\n');
    const isList = lines.every((l) => l.trim().startsWith('-') || l.trim().startsWith('*') || l.trim() === '');
    if (isList && lines.some((l) => l.trim().startsWith('-') || l.trim().startsWith('*'))) {
      return (
        <ul key={bi} className="list-disc list-inside space-y-0.5 my-2 text-sm text-slate-700">
          {lines.filter((l) => l.trim()).map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^[\s\-*]+/, ''))}</li>
          ))}
        </ul>
      );
    }

    // Normal paragraph (may span multiple lines)
    return (
      <p key={bi} className="text-sm text-slate-700 my-1.5 leading-relaxed">
        {lines.map((line, li) => (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {renderInline(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  // bold (**text**) and inline code (`code`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export const AIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [remaining, setRemaining] = useState<number>(50);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ConversationSummary[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSources, setExpandedSources] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load current conversation on mount ───────────────────────────────────
  const loadConversation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/ai/conversation');
      const data = res.data;
      setMessages(data.messages || []);
      setRemaining(data.remaining_messages ?? 50);
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        setActiveSession(data.conversation_id);
        setSessions([{
          id: data.conversation_id,
          label: 'Aktif Sohbet',
          time: 'Bugün',
        }]);
      }
    } catch {
      setError('Sohbet yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversation(); }, [loadConversation]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || remaining === 0) return;
    setSending(true);
    setError(null);
    setInput('');

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await apiClient.post('/ai/chat', { message: text });
      const data = res.data;
      const fallbackRemaining = typeof data.remaining_messages === 'number'
        ? data.remaining_messages
        : null;
      try {
        const remainingRes = await apiClient.get('/ai/remaining-messages');
        setRemaining(
          remainingRes.data.remaining
            ?? fallbackRemaining
            ?? 0
        );
      } catch {
        setRemaining((prev) => fallbackRemaining ?? Math.max(0, prev - 1));
      }
      setConversationId(data.conversation_id);

      // Replace temp + add AI response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        {
          id: data.user_message.id,
          role: 'user',
          content: data.user_message.content,
          created_at: data.user_message.created_at,
        },
        {
          id: data.assistant_message.id,
          role: 'assistant',
          content: data.assistant_message.content,
          references: data.assistant_message.references || [],
          created_at: data.assistant_message.created_at,
        },
      ]);

      // Update sessions list
      if (data.conversation_id) {
        setActiveSession(data.conversation_id);
        setSessions([{
          id: data.conversation_id,
          label: 'Aktif Sohbet',
          time: 'Bugün',
        }]);
      }
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError('Günlük mesaj limitine ulaştınız. Yarın tekrar deneyin.');
        setRemaining(0);
      } else {
        setError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      }
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

  // ── New chat ──────────────────────────────────────────────────────────────
  const handleNewChat = async () => {
    try {
      await apiClient.delete('/ai/conversation');
    } catch { /* ignore */ }
    setMessages([]);
    setConversationId(null);
    setActiveSession(null);
    setSessions([]);
    setInput('');
    setError(null);
  };

  // ── Toggle sources ────────────────────────────────────────────────────────
  const toggleSources = (id: string) => {
    setExpandedSources((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSend = input.trim().length > 0 && input.length <= 500 && remaining > 0 && !sending;

  return (
    <MainLayout>
      <div className="h-full flex overflow-hidden">

        {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-60 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
          {/* New Chat Button */}
          <div className="p-3 border-b border-slate-200">
            <Button
              onClick={handleNewChat}
              className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Yeni Sohbet
            </Button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto py-2">
            {sessions.length === 0 && !loading && (
              <p className="text-xs text-slate-400 text-center mt-6 px-4">
                Henüz sohbet yok. Yeni bir sohbet başlat!
              </p>
            )}
            {sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => setActiveSession(sess.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  activeSession === sess.id
                    ? 'bg-sky-50 border-l-2 border-[#0ea5e9] text-[#0369a1]'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <p className="font-medium text-sm truncate">{sess.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sess.time}</p>
              </button>
            ))}
          </div>

          {/* Clear button at bottom */}
          {sessions.length > 0 && (
            <div className="p-3 border-t border-slate-200">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors py-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Sohbeti Temizle
              </button>
            </div>
          )}
        </aside>

        {/* ── Chat Area ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Header */}
          <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0ea5e9] flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-slate-800">AI Asistanı</h2>
            </div>
            <Badge
              variant={remaining > 10 ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              Bugün {remaining} mesaj hakkın kaldı
            </Badge>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-10 h-10 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin" />
                  <p className="text-sm">Yükleniyor...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-[#0ea5e9]" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-2">
                  Merhaba! Sana nasıl yardımcı olabilirim?
                </h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Forum konularını, akademik takvimi, ders programını veya
                  kampüs ilanlarını sorabilirsin.
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
                      onClick={() => setInput(q)}
                      className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 bg-slate-50 hover:border-[#0ea5e9] hover:text-[#0ea5e9] hover:bg-sky-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) =>
                msg.role === 'user' ? (
                  /* User message */
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-lg">
                      <div className="bg-[#0ea5e9] text-white rounded-2xl rounded-br-sm px-4 py-3">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 text-right">
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* AI message */
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-2xl w-full">
                      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-bl-sm px-5 py-4">
                        <div className="space-y-0">
                          {renderContent(msg.content)}
                        </div>
                      </div>

                      {/* Sources */}
                      {msg.references && msg.references.length > 0 && (
                        <div className="mt-2 ml-1">
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="text-xs text-[#0ea5e9] hover:text-[#0284c7] flex items-center gap-1 transition-colors"
                          >
                            <Paperclip className="h-3 w-3" />
                            {msg.references.length} kaynak
                            {expandedSources.includes(msg.id)
                              ? <ChevronUp className="h-3 w-3" />
                              : <ChevronDown className="h-3 w-3" />}
                          </button>
                          {expandedSources.includes(msg.id) && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {msg.references.map((ref, i) => (
                                <a
                                  key={i}
                                  href={ref.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-[#0ea5e9] text-slate-600 rounded-full border border-slate-200 hover:border-sky-200 transition-colors"
                                >
                                  📄 {ref.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-400 mt-1 ml-1">
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              )
            )}

            {/* AI typing indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-bl-sm px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-6 pb-2">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3 text-xs">✕</button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-slate-200 px-6 py-4 bg-white shrink-0">
            {remaining === 0 ? (
              <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-lg">
                <p className="text-sm text-amber-800">
                  ⚠️ Günlük mesaj limitine ulaştınız. Yarın tekrar deneyebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesajınızı yazın... (Enter ile gönder, Shift+Enter ile yeni satır)"
                    className="min-h-[72px] max-h-36 resize-none border-slate-200 focus:border-[#0ea5e9] focus:ring-[#0ea5e9] pr-12 text-sm"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!canSend}
                    size="icon"
                    className="absolute right-2 bottom-2 h-8 w-8 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-slate-200"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Enter ile gönder • Shift+Enter ile yeni satır
                  </p>
                  <span className={`text-xs ${input.length > 450 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                    {input.length} / 500
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
