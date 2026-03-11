import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { ThreadListItem } from '../../types/forum';
import { PostCard } from './PostCard';

interface ThreadListProps {
  threads: ThreadListItem[];
  onThreadClick: (id: string) => void;
  onCommentClick?: (id: string) => void;
  loading: boolean;
  isFeed?: boolean;
}

/**
 * ThreadList Bileşeni - Aydınlık & Akademik Stil
 * Spec: 005-forum-page/spec.md - 2. Kategori İçi (Thread List)
 */
export const ThreadList: React.FC<ThreadListProps> = ({ threads, onThreadClick, onCommentClick, loading }) => {
  const [sortBy, setSortBy] = useState<'newest' | 'replies' | 'helpful'>('newest');

  const sortedThreads = [...threads].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  return (
    <div className="animate-fade-in">
      {/* 2.1. Kategori Header - Aydınlık */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-gray-900 flex items-center tracking-tight">
            Kampüs Akışı
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">
            Kampüsteki en güncel konuşmalar
          </p>
        </div>

        {/* 2.2. Sıralama Seçenekleri - Gri Tonlar */}
        <div className="flex items-center bg-gray-100 rounded-xl border border-gray-200 p-1 shadow-sm">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${sortBy === 'newest' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            En Yeni
          </button>
          <button
            onClick={() => setSortBy('replies')}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${sortBy === 'replies' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            En Çok Cevaplanan
          </button>
        </div>
      </div>

      {/* 2.3. Thread Listesi - Post Kartları */}
      <div className="space-y-4">
        {sortedThreads.map((thread) => (
          <PostCard key={thread.id} post={thread} onClick={onThreadClick} onCommentClick={onCommentClick} />
        ))}

        {/* Boş Durum */}
        {!loading && threads.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
            <div className="bg-indigo-50 p-4 rounded-full mb-4">
              <MessageSquare size={32} className="text-indigo-300" />
            </div>
            <p className="text-gray-400 font-bold text-lg">Bu kategoride henüz bir fırtına kopmamış.</p>
            <p className="text-gray-400 text-sm">İlk konuyu açarak tartışmayı sen başlatabilirsin!</p>
          </div>
        )}
      </div>
    </div>
  );
};