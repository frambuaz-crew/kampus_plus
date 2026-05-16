import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { ThreadListItem } from '../../types/forum';
import { PostCard } from './PostCard';

interface ThreadListProps {
  threads: ThreadListItem[];
  onThreadClick: (id: string) => void;
  onCommentClick?: (id: string) => void;
  onDeleted?: (id: string) => void;
  loading: boolean;
  isFeed?: boolean;
  /** Sayfa başlığı (ForumPage üstündeki hero ile çakışmasın diye burada tekrar “Forum” yazılmaz) */
  listTitle?: string;
  listSubtitle?: string;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  onThreadClick,
  onCommentClick,
  onDeleted,
  loading,
  listTitle = 'Konular',
  listSubtitle,
}) => {
  const [sortBy, setSortBy] = useState<'newest' | 'likes'>('newest');

  const sortedThreads = [...threads].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (sortBy === 'likes') return (b.helpful_count ?? 0) - (a.helpful_count ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{listTitle}</h2>
          {listSubtitle ? (
            <p className="mt-0.5 text-sm text-slate-500">{listSubtitle}</p>
          ) : null}
        </div>
        <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              sortBy === 'newest'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            En yeni
          </button>
          <button
            type="button"
            onClick={() => setSortBy('likes')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              sortBy === 'likes'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            En çok beğenilen
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedThreads.map((thread) => (
          <PostCard key={thread.id} post={thread} onClick={onThreadClick} onCommentClick={onCommentClick} onDeleted={onDeleted} />
        ))}

        {!loading && threads.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mb-4 rounded-full bg-indigo-50 p-3">
              <MessageSquare className="h-8 w-8 text-indigo-400" aria-hidden />
            </div>
            <p className="text-base font-medium text-slate-700">Henüz gönderi yok</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              İlk konuyu açarak tartışmayı başlatabilir veya yukarıdan filtreleri değiştirebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};