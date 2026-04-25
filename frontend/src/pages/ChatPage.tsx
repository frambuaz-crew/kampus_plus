import React, { useState } from 'react';
import { apiClient } from '../api/config';
import { ChatInterface } from '../components/chat/ChatInterface';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Bot, Plus, RefreshCw, MessageSquare } from 'lucide-react';

export const ChatPage: React.FC = () => {
  const [chatReloadKey, setChatReloadKey] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(true);

  const handleNewConversation = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete('/ai/conversation');
      setChatReloadKey((prev) => prev + 1);
      setShowConfirmDialog(false);
      setHasActiveSession(false);
      setTimeout(() => setHasActiveSession(true), 100);
    } catch (err) {
      console.error('Konuşma silinemedi:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex overflow-hidden">

        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <aside className="w-60 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
          {/* New Chat Button */}
          <div className="p-3 border-b border-slate-200">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Yeni Sohbet
            </Button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto py-2">
            {hasActiveSession && (
              <button className="w-full px-4 py-3 text-left bg-sky-50 border-l-2 border-[#0ea5e9] text-[#0369a1]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <p className="font-medium text-sm truncate">Aktif Sohbet</p>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 ml-5.5">Bugün</p>
              </button>
            )}
            {!hasActiveSession && (
              <p className="text-xs text-slate-400 text-center mt-6 px-4">
                Yeni bir sohbet başlat!
              </p>
            )}
          </div>
        </aside>

        {/* ── Chat Area ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Header */}
          <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0ea5e9] flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-slate-800 leading-tight">AI Asistanı</h2>
                <p className="text-xs text-slate-400 leading-tight">Akademik sorularını yanıtlamak için buradayım</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Yeni Konuşma
            </Button>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface reloadKey={chatReloadKey} />
          </div>
        </div>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-red-500" />
                Yeni Konuşma Başlat?
              </DialogTitle>
              <DialogDescription>
                Mevcut konuşma geçmişi silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musun?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isDeleting}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleNewConversation}
                disabled={isDeleting}
              >
                {isDeleting ? 'Siliniyor...' : 'Evet, Temizle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};
