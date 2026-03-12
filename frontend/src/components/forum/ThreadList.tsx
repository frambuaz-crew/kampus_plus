import React, { useState } from 'react';
import { Pin, MessageSquare, ThumbsUp, Clock } from 'lucide-react';
import type { ThreadListItem, Category } from '../../types/forum';

interface ThreadListProps {
  category: Category;
  threads: ThreadListItem[];
  onThreadClick: (id: string) => void;
  loading: boolean;
}

/**
 * ThreadList Bileşeni - Aydınlık & Akademik Stil
 * Spec: 005-forum-page/spec.md - 2. Kategori İçi (Thread List)
 */
export const ThreadList: React.FC<ThreadListProps> = ({ category, threads, onThreadClick, loading }) => {
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
            <span className="mr-3 text-indigo-600 drop-shadow-sm">{category.icon}</span> 
            {category.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">
            {category.topic_count} akademik tartışma
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

      {/* 2.3. Thread Listesi - Temiz Kartlar */}
      <div className="space-y-4">
        {sortedThreads.map((thread) => (
          <div 
            key={thread.id}
            onClick={() => onThreadClick(thread.id)}
            className={`group flex flex-col md:flex-row items-start md:items-center gap-5 bg-white border border-gray-200 p-6 cursor-pointer transition-all hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 rounded-2xl ${thread.is_pinned ? 'bg-amber-50/40 border-amber-200 shadow-sm shadow-amber-500/5' : ''}`}
          >
            {/* Konu Bilgisi */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {thread.is_pinned && <Pin size={18} className="text-amber-500 fill-amber-500 shrink-0" />}
                <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors truncate leading-tight">
                  {thread.is_pinned && <span className="text-amber-600 font-black mr-2 text-sm uppercase tracking-tighter">[SABİT]</span>} 
                  {thread.title}
                </h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-y-2 text-sm text-gray-500 font-medium">
                <span className="text-indigo-600 hover:underline">
                  👤 {thread.author ? `${thread.author.first_name} ${thread.author.last_name}` : 'Bilinmeyen Kullanıcı'}
                </span>
                {thread.author?.username && (
                  <>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="bg-gray-100 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-gray-600 border border-gray-200 tracking-tight">
                      @{thread.author.username}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* İstatistikler - Belirgin Sütunlar */}
            <div className="flex items-center gap-8 w-full md:w-auto pt-5 md:pt-0 border-t md:border-t-0 border-gray-100">
              <div className="flex flex-col items-center min-w-[70px]">
                <div className="flex items-center text-gray-900 font-black text-xl mb-0.5 group-hover:text-indigo-600 transition-colors">
                  <MessageSquare size={16} className="mr-2 text-indigo-400" /> {thread.reply_count}
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Cevap</span>
              </div>
              
              <div className="flex flex-col items-center min-w-[70px]">
                <div className="flex items-center text-gray-900 font-black text-xl mb-0.5 group-hover:text-emerald-600 transition-colors">
                  <ThumbsUp size={16} className="mr-2 text-emerald-400" /> {thread.helpful_count}
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Yararlı</span>
              </div>

              <div className="hidden lg:flex flex-col items-end min-w-[120px] text-right border-l border-gray-100 pl-6">
                <span className="text-xs text-gray-700 font-bold flex items-center">
                   <Clock size={12} className="mr-2 text-gray-400" />
                   {new Date(thread.last_reply_at || thread.created_at).toLocaleDateString('tr-TR')}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">Oluşturuldu</span>
              </div>
            </div>
          </div>
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