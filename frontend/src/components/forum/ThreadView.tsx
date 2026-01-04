/**
 * ThreadView Component
 * 
 * Spec: 005-forum-page/spec.md
 * 
 * Konu detay sayfası:
 * - Thread (ana konu) kartı
 * - Yazar profil bilgisi
 * - Dosya ekleri
 * - Etiketler
 * - Yararlı butonu
 * - Düzenle/Sil butonları (sadece sahibine + 10 dakika içinde)
 * - Cevaplar listesi
 * - Cevap yazma formu
 * 
 * NOT: Tüm kullanıcılar profilli (anonim paylaşım yok)
 */

import React, { useState } from 'react';
import type { ThreadWithReplies, ForumPost } from '../../types/forum';
import { ReplyForm } from './ReplyForm';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

interface ThreadViewProps {
  threadData: ThreadWithReplies;
  onReplySubmit: (data: { content: string; files: File[]; mentions?: string[] }) => Promise<void>;
  onHelpful: (postId: string) => Promise<void>;
  onReport: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  loading?: boolean;
  isSubmitting?: boolean;
}

const PostCard: React.FC<{
  post: ForumPost;
  isThread?: boolean;
  onHelpful: (postId: string) => Promise<void>;
  onReport: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  currentUserId?: string;
}> = ({ 
  post, 
  isThread = false,
  onHelpful,
  onReport,
  onEdit,
  onDelete,
  currentUserId
}) => {
  const [isHelpful, setIsHelpful] = useState(false);
  const canEdit = currentUserId === post.author.id && 
    new Date().getTime() - new Date(post.created_at).getTime() < 10 * 60 * 1000; // 10 dakika

  const handleHelpful = async () => {
    await onHelpful(post.id);
    setIsHelpful(!isHelpful);
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isThread ? 'border-l-4 border-indigo-500' : ''}`}>
      {post.title && (
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h2>
      )}

      {/* Author Info */}
      <div className="mb-4 text-sm text-gray-600">
        <span className="font-medium">
          👤 {post.author.first_name} {post.author.last_name}
        </span>
        <span className="mx-2">•</span>
        <span>🎓 {post.author.university}</span>
        {post.author.department && (
          <>
            <span className="mx-2">•</span>
            <span>{post.author.department}</span>
          </>
        )}
        <span className="mx-2">•</span>
        <span>🕐 {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
      </div>

      {/* Content */}
      <div className="prose max-w-none mb-4">
        <div className="text-gray-700 whitespace-pre-wrap">{post.content}</div>
      </div>

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-sm font-medium text-gray-700">📎 Eklenen Dosyalar:</div>
          {post.attachments.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">
                {file.filename} ({(file.file_size / 1024).toFixed(1)} KB)
              </span>
              <a
                href={file.file_url}
                download
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                İndir
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag.id} className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleHelpful}
            className="flex items-center space-x-1 px-3 py-1 rounded hover:bg-gray-100 text-gray-600"
          >
            <span>👍</span>
            <span>{post.helpful_count} Yararlı</span>
          </button>
          <button
            onClick={() => onReport(post.id)}
            className="flex items-center space-x-1 px-3 py-1 rounded hover:bg-gray-100 text-gray-400"
          >
            <span>🚩</span>
            <span>Rapor Et</span>
          </button>
        </div>

        {/* Edit/Delete (only for owner, within 10 minutes) */}
        {canEdit && (onEdit || onDelete) && (
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(post.id)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                ✏️ Düzenle
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(post.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                🗑️ Sil
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ThreadView: React.FC<ThreadViewProps> = ({ 
  threadData, 
  onReplySubmit, 
  onHelpful,
  onReport,
  onEdit,
  onDelete,
  loading = false,
  isSubmitting = false
}) => {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  const { thread, replies } = threadData;

  const handleReplySubmit = async (data: { content: string; files: File[]; mentions?: string[] }) => {
    await onReplySubmit(data);
    setShowReplyForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Thread Post */}
      <PostCard
        post={thread}
        isThread
        onHelpful={onHelpful}
        onReport={onReport}
        onEdit={onEdit}
        onDelete={onDelete}
        currentUserId={user?.id}
      />

      {/* Reply Button */}
      {!showReplyForm && (
        <button
          onClick={() => setShowReplyForm(true)}
          className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-3 px-4 rounded-lg transition-colors"
        >
          💬 Bu Konuya Cevap Yaz
        </button>
      )}

      {/* Reply Form */}
      {showReplyForm && (
        <div className="bg-indigo-50 rounded-lg p-4">
          <ReplyForm
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyForm(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">
            CEVAPLAR ({replies.length})
          </h3>
          {replies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply}
              onHelpful={onHelpful}
              onReport={onReport}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}

      {/* No replies state */}
      {replies.length === 0 && !showReplyForm && (
        <div className="text-center py-8 text-gray-500">
          <p>Henüz cevap yok. İlk cevabı sen yaz!</p>
        </div>
      )}
    </div>
  );
};
