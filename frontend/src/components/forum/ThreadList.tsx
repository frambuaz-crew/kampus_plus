/**
 * ThreadList Component
 * 
 * Spec: 005-forum-page/spec.md
 * 
 * Forum konu listesi:
 * - Pin ikonu (pinli konular en üstte)
 * - Başlık
 * - Yazar (ad soyad + üniversite)
 * - Dosya ekleri (varsa, max 3)
 * - İstatistikler (cevap sayısı, yararlı sayısı, zaman)
 * - Etiketler (max 5)
 * 
 * NOT: Tüm kullanıcılar profilli (anonim paylaşım yok)
 */

import React from 'react';
import type { ThreadListItem } from '../../types/forum';
import { formatDistanceToNow } from 'date-fns';

interface ThreadListProps {
  threads: ThreadListItem[];
  onThreadClick: (threadId: string) => void;
  loading?: boolean;
}

export const ThreadList: React.FC<ThreadListProps> = ({ 
  threads, 
  onThreadClick, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Henüz konu yok
        </h3>
        <p className="text-gray-500">
          İlk konuyu sen başlat!
        </p>
      </div>
    );
  }

  // Sort: pinned threads first
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {sortedThreads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => onThreadClick(thread.id)}
          className={`w-full bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 text-left ${
            thread.is_pinned ? 'border-l-4 border-indigo-500' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {thread.is_pinned && <span className="text-indigo-600">📌</span>}
              {thread.title}
            </h3>
          </div>

          {/* Author Info */}
          <div className="mb-2 text-sm text-gray-600">
            <span className="font-medium">
              👤 {thread.author.first_name} {thread.author.last_name}
            </span>
            <span className="mx-2">•</span>
            <span>🎓 {thread.author.university}</span>
            {thread.author.department && (
              <>
                <span className="mx-2">•</span>
                <span>{thread.author.department}</span>
              </>
            )}
          </div>

          {thread.attachment_count > 0 && (
            <div className="mb-2 flex items-center">
              <span className="text-xs text-gray-500">📎 {thread.attachment_count} dosya</span>
            </div>
          )}

          {/* Tags */}
          {thread.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {thread.tags.slice(0, 5).map((tag) => (
                <span key={tag.id} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                  #{tag.name}
                </span>
              ))}
              {thread.tags.length > 5 && (
                <span className="text-xs text-gray-500">+{thread.tags.length - 5} daha</span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500 mt-3">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                💬 {thread.reply_count} {thread.reply_count === 1 ? 'cevap' : 'cevap'}
              </span>
              <span className="flex items-center">
                👍 {thread.helpful_count} {thread.helpful_count === 1 ? 'yararlı' : 'yararlı'}
              </span>
            </div>
            <span className="flex items-center">
              🕐 {formatDistanceToNow(new Date(thread.last_activity), { addSuffix: true })}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
