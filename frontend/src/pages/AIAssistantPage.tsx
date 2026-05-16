/**
 * AI Assistant Page
 *
 * Spec: 009-ai-assistant/spec.md
 * Design: Figma export
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
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

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-slate-700 my-1.5 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-0.5 my-2 text-sm text-slate-700">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-0.5 my-2 text-sm text-slate-700">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-xs font-mono my-2">
      {children}
    </pre>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isCodeBlock = Boolean(className?.includes('language-'));
    if (isCodeBlock) {
      return (
        <code className="font-mono text-xs">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  a: ({ href = '', children }: { href?: string; children?: React.ReactNode }) => {
    if (!href) {
      return <span>{children}</span>;
    }
    if (href.startsWith('/')) {
      return (
        <Link to={href} className="font-medium text-[#0ea5e9] underline underline-offset-2">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#0ea5e9] underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
};

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
    <MainLayout noScroll={true}>
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* ── Left Sidebar: Chat History ─────────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r border-slate-100 bg-slate-50/50 flex flex-col">
          <div className="p-6">
            <Button
              onClick={handleNewChat}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 font-bold shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
              Yeni Sohbet
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Geçmiş Sohbetler</span>
            </div>
            {sessions.length === 0 && !loading && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Bot className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Henüz bir sohbet geçmişiniz bulunmuyor.
                </p>
              </div>
            )}
            {sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => setActiveSession(sess.id)}
                className={`w-full p-4 rounded-2xl text-left transition-all group relative ${
                  activeSession === sess.id
                    ? 'bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-100'
                    : 'hover:bg-white/50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full transition-colors ${activeSession === sess.id ? 'bg-sky-500' : 'bg-slate-200'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${activeSession === sess.id ? 'text-slate-900' : 'text-slate-600'}`}>
                      {sess.label}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">{sess.time}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {sessions.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-white/50">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors py-2 rounded-xl hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Geçmişi Temizle
              </button>
            </div>
          )}
        </aside>

        {/* ── Main Chat Area ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white relative">
          {/* Header */}
          <header className="h-20 border-b border-slate-100 px-8 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-100">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 leading-none">AI Asistanı</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Çevrimiçi • 7/24 Akademik Destek</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="hidden md:flex flex-col items-end mr-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Günlük Limit</span>
                 <div className="flex items-center gap-2">
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-500 ${remaining > 10 ? 'bg-sky-500' : 'bg-red-500'}`} 
                         style={{ width: `${(remaining / 50) * 100}%` }}
                       />
                    </div>
                    <span className="text-xs font-black text-slate-900">{remaining}/50</span>
                 </div>
               </div>
            </div>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Veriler Yükleniyor...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100 flex items-center justify-center mb-8 shadow-inner animate-bounce-slow">
                  <Bot className="h-10 w-10 text-sky-500" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                  Merhaba Mehmet! 👋
                </h3>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                  Bugün akademik hayatında sana nasıl yardımcı olabilirim? Ders notları, sınav tarihleri veya forum konuları hakkında merak ettiğin her şeyi sorabilirsin.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {[
                    'Yaklaşan sınavlarım ne zaman?',
                    'Bu haftaki ders programım nedir?',
                    'Staj ilanları var mı?',
                    'Popüler forum konuları neler?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="p-4 text-sm font-bold rounded-2xl border border-slate-100 text-slate-600 bg-white hover:border-sky-500 hover:text-sky-600 hover:shadow-xl hover:shadow-sky-100 transition-all text-left flex items-center justify-between group"
                    >
                      {q}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full space-y-8">
                {messages.map((msg) =>
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex justify-end animate-slide-in-right">
                      <div className="max-w-[85%]">
                        <div className="bg-slate-900 text-white rounded-[2rem] rounded-tr-none px-6 py-4 shadow-xl shadow-slate-200">
                          <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-2 px-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase">{formatTime(msg.created_at)}</span>
                           <div className="w-1 h-1 rounded-full bg-slate-300" />
                           <span className="text-[10px] font-black text-slate-400 uppercase">SİZ</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-start animate-slide-in-left">
                      <div className="max-w-[90%] w-full">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0 shadow-sm mt-1">
                            <Bot className="h-5 w-5 text-sky-600" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 rounded-[2rem] rounded-tl-none px-7 py-6">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {msg.content}
                              </ReactMarkdown>

                              {msg.references && msg.references.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-slate-50">
                                  <button
                                    onClick={() => toggleSources(msg.id)}
                                    className="text-[10px] font-black text-sky-600 hover:text-sky-700 flex items-center gap-1.5 uppercase tracking-widest transition-all"
                                  >
                                    <Paperclip className="h-3.5 w-3.5" />
                                    {msg.references.length} KAYNAK BULUNDU
                                    {expandedSources.includes(msg.id)
                                      ? <ChevronUp className="h-3.5 w-3.5" />
                                      : <ChevronDown className="h-3.5 w-3.5" />}
                                  </button>
                                  {expandedSources.includes(msg.id) && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {msg.references.map((ref, i) => (
                                        <a
                                          key={i}
                                          href={ref.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 text-[10px] font-bold px-4 py-2 bg-slate-50 hover:bg-sky-500 hover:text-white text-slate-600 rounded-xl border border-slate-100 hover:border-sky-500 transition-all shadow-sm"
                                        >
                                          📄 {ref.label}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 px-2">
                               <span className="text-[10px] font-black text-slate-400 uppercase">YAPAY ZEKA</span>
                               <div className="w-1 h-1 rounded-full bg-slate-300" />
                               <span className="text-[10px] font-black text-slate-400 uppercase">{formatTime(msg.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
            {sending && (
              <div className="max-w-4xl mx-auto w-full flex justify-start">
                 <div className="flex gap-4">
                   <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                     <Bot className="h-5 w-5 text-sky-600" />
                   </div>
                   <div className="bg-white border border-slate-100 shadow-lg rounded-2xl px-6 py-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                   </div>
                 </div>
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-8 absolute bottom-32 left-0 right-0 z-30">
              <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-sm text-red-600 flex items-center justify-between shadow-2xl animate-shake">
                <span className="font-bold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {error}
                </span>
                <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500 transition-colors">✕</button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <footer className="p-8 bg-white border-t border-slate-100 shrink-0">
            {remaining === 0 ? (
              <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
                  <Bot className="h-6 w-6 text-amber-600" />
                </div>
                <h4 className="font-black text-amber-900 mb-1">Günlük Limit Doldu</h4>
                <p className="text-sm text-amber-700 font-medium leading-relaxed">
                  Harika sorular sordun! Günlük 50 mesaj limitine ulaştın. Yarın seni yeni cevaplarla bekliyor olacağım.
                </p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="relative group transition-all">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-[2.5rem] opacity-0 group-focus-within:opacity-20 blur-lg transition-all" />
                  <div className="relative bg-slate-50 rounded-[2.2rem] border border-slate-200 focus-within:border-sky-500 focus-within:bg-white transition-all overflow-hidden shadow-inner focus-within:shadow-2xl focus-within:shadow-sky-100">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Derslerin, sınavların veya kampüs hayatı hakkında merak ettiğini sor..."
                      className="min-h-[80px] max-h-48 resize-none border-none bg-transparent focus-visible:ring-0 px-8 py-6 text-base font-medium placeholder:text-slate-400"
                      disabled={sending}
                    />
                    <div className="flex items-center justify-between px-6 pb-4">
                      <div className="flex items-center gap-4">
                         <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-all">
                            <Paperclip className="h-5 w-5" />
                         </Button>
                         <p className="hidden sm:block text-[10px] font-black text-slate-300 uppercase tracking-widest">
                           ENTER İLE GÖNDER • SHIFT+ENTER İLE YENİ SATIR
                         </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-black tracking-widest transition-colors ${input.length > 450 ? 'text-red-500' : 'text-slate-300'}`}>
                          {input.length} / 500 KARAKTER
                        </span>
                        <Button
                          onClick={handleSend}
                          disabled={!canSend}
                          className="h-12 px-8 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95"
                        >
                          GÖNDER
                          <Send className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </footer>
        </div>
      </div>
    </MainLayout>
  );
};
