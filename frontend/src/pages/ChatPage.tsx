import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/config';
import { ChatInterface } from '../components/chat/ChatInterface';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/button';
import { Bot, Plus, RefreshCw, MessageSquare, Clock, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
  last_message_preview?: string;
}

export const ChatPage: React.FC = () => {
  const [chatReloadKey, setChatReloadKey] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await apiClient.get<ConversationSummary[]>('/ai/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Sohbet geçmişi yüklenemedi:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setChatReloadKey((prev) => prev + 1);
  };

  const handleResetConversation = async () => {
    if (!activeConversationId) {
      // Eğer zaten yeni sohbet sayfasındaysak sadece ekranı temizle
      handleNewChat();
      setShowResetDialog(false);
      return;
    }

    try {
      setIsDeleting(true);
      // Backend'den bu sohbeti kalıcı olarak sil
      await apiClient.delete('/ai/conversation', {
        params: { conversation_id: activeConversationId }
      });
      
      // Listeyi güncelle ve yeni sohbet moduna geç
      await loadHistory();
      handleNewChat();
      setShowResetDialog(false);
    } catch (err) {
      console.error('Sohbet silinemedi:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setChatReloadKey((prev) => prev + 1);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Butona tıklayınca sohbetin seçilmesini engelle
    
    if (!window.confirm('Bu sohbeti silmek istediğine emin misin?')) return;

    try {
      await apiClient.delete('/ai/conversation', {
        params: { conversation_id: id }
      });
      
      // Eğer silinen sohbet şu an açıksa, yeni sohbete geç
      if (activeConversationId === id) {
        handleNewChat();
      }
      
      // Listeyi güncelle
      loadHistory();
    } catch (err) {
      console.error('Sohbet silinemedi:', err);
    }
  };

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
    loadHistory(); 
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const groupConversations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: ConversationSummary[] } = {
      'Bugün': [],
      'Dün': [],
      'Daha Eski': []
    };

    conversations.forEach(convo => {
      const d = new Date(convo.updated_at);
      const compareDate = new Date(d);
      compareDate.setHours(0, 0, 0, 0);

      if (compareDate.getTime() === today.getTime()) {
        groups['Bugün'].push(convo);
      } else if (compareDate.getTime() === yesterday.getTime()) {
        groups['Dün'].push(convo);
      } else {
        groups['Daha Eski'].push(convo);
      }
    });

    return groups;
  };

  const conversationGroups = groupConversations();

  return (
    <MainLayout>
      <div className="h-full flex overflow-hidden">

        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
          {/* New Chat Button */}
          <div className="p-4 border-b border-slate-200">
            <Button
              onClick={handleNewChat}
              className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white gap-2 shadow-sm transition-all"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Yeni Sohbet
            </Button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingHistory && conversations.length === 0 ? (
              <div className="px-4 py-6 space-y-4">
                <div className="h-4 bg-slate-200 animate-pulse rounded w-1/2 mb-4" />
                <div className="space-y-3">
                  <div className="h-12 bg-slate-200 animate-pulse rounded" />
                  <div className="h-12 bg-slate-200 animate-pulse rounded" />
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-16 px-6 opacity-30">
                <MessageSquare className="h-10 w-10 mb-3 text-slate-400" />
                <p className="text-[11px] text-slate-500 text-center font-medium">
                  Henüz geçmiş sohbet yok.<br/>Hadi bir tane başlat!
                </p>
              </div>
            ) : (
              <div className="pb-4">
                {Object.entries(conversationGroups).map(([groupName, items]) => (
                  items.length > 0 && (
                    <div key={groupName} className="mt-4 first:mt-2">
                      <div className="px-4 py-2 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{groupName}</span>
                        <div className="h-[1px] flex-1 bg-slate-200" />
                      </div>
                      <div className="space-y-0.5">
                        {items.map((convo) => (
                          <div key={convo.id} className="group relative px-2">
                            <button
                              onClick={() => handleSelectConversation(convo.id)}
                              className={`w-full px-3 py-3 text-left transition-all rounded-lg relative flex flex-col ${
                                activeConversationId === convo.id
                                  ? 'bg-white shadow-sm ring-1 ring-slate-200 z-10'
                                  : 'hover:bg-slate-200/50 text-slate-600'
                              }`}
                            >
                              {activeConversationId === convo.id && (
                                <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#0ea5e9] rounded-full" />
                              )}
                              <div className="flex justify-between items-start mb-0.5 pr-6">
                                <p className={`font-bold text-[12px] truncate flex-1 ${activeConversationId === convo.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {convo.title || 'Yeni Sohbet'}
                                </p>
                                <span className="text-[9px] font-medium text-slate-400 ml-2 shrink-0">{formatDate(convo.updated_at)}</span>
                              </div>
                              {convo.last_message_preview && (
                                <p className="text-[11px] text-slate-400 truncate leading-relaxed pr-6">
                                  {convo.last_message_preview}
                                </p>
                              )}
                            </button>
                            
                            {/* Delete Button - Only visible on hover */}
                            <button
                              onClick={(e) => handleDeleteConversation(e, convo.id)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-20"
                              title="Sohbeti Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Chat Area ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Header */}
          <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center shadow-sm">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-800 leading-tight">AI Asistanı</h2>
                <p className="text-[11px] text-slate-400 leading-tight font-medium">Akademik sorularını yanıtlamak için buradayım</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="gap-1.5 text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Sohbeti Sıfırla
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <ChatInterface 
              key={activeConversationId ? activeConversationId : `new-chat-${chatReloadKey}`} 
              reloadKey={chatReloadKey} 
              initialConversationId={activeConversationId}
              onConversationCreated={handleConversationCreated}
            />
          </div>
        </div>

        {/* Reset Confirmation Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Sohbeti Sıfırla?
              </DialogTitle>
              <DialogDescription className="py-2">
                Bu sohbet ve içindeki tüm mesajlar geçmişten de silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musun?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(false)}
                disabled={isDeleting}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetConversation}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Siliniyor...' : 'Evet, Kalıcı Olarak Sil'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
};
