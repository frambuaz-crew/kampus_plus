/**
 * ChatPage Component
 * 
 * Spec: 009-ai-assistant/spec.md
 * 
 * AI Asistan chat sayfası:
 * - Tek aktif konuşma (her kullanıcının sadece 1 konuşması)
 * - "Yeni Konuşma" butonu (onay popup'ı ile)
 * - ChatInterface ile mesajlaşma
 * - MainLayout kullanır (Header + Sidebar + Main Content)
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/config';
import { ChatInterface } from '../components/chat/ChatInterface';
import { MainLayout } from '../components/layout/MainLayout';
import type { ChatMessage } from '../types/chat';

export const ChatPage: React.FC = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Load conversation on mount
  useEffect(() => {
    loadConversation();
  }, []);

  const loadConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/ai/conversation');
      
      if (response.data.conversation_id) {
        setConversationId(response.data.conversation_id);
        setMessages(response.data.messages || []);
      } else {
        // No conversation yet, will be created on first message
        setConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Konuşma yüklenemedi:', err);
      setError('Konuşma yüklenemedi');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      setError(null);
      // Delete existing conversation
      await apiClient.delete('/ai/conversation');
      
      // Clear state
      setConversationId(null);
      setMessages([]);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Konuşma silinemedi:', err);
      setError('Konuşma silinemedi');
    }
  };

  const handleMessageSent = () => {
    // Reload conversation to get updated messages
    loadConversation();
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col bg-white">
        {/* Header with "Yeni Konuşma" button */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-white">
          <h1 className="text-2xl font-bold text-gray-900">AI Asistanım</h1>
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
          >
            🔄 Yeni Konuşma
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-t border-red-200 text-red-700 px-6 py-3">
            {error}
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            sessionId={conversationId}
            initialMessages={messages}
            onMessageSent={handleMessageSent}
          />
        </div>

        {/* Confirm Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Yeni Konuşma Başlat?
              </h2>
              <p className="text-gray-700 mb-6">
                ⚠️ Mevcut konuşma geçmişi silinecek.
                <br />
                Emin misin?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={handleNewConversation}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Evet, Temizle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
