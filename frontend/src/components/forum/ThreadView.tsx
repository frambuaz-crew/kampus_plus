import React, { useState } from 'react';
import { Calendar, MessageSquare, User as UserIcon, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ReplyForm } from './ReplyForm';
import type { ForumReply, ForumTopic, ThreadWithReplies } from '../../types/forum';
import { getImageUrl } from '../../utils/imageUrl';

interface ThreadViewProps {
  data: ThreadWithReplies;
  onReplySubmit: (data: { content: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const PostCard: React.FC<{ post: ForumTopic | ForumReply; isThread?: boolean }> = ({
  post,
  isThread = false,
}) => {
  const authorFullName = post.author
    ? `${post.author.first_name} ${post.author.last_name}`
    : 'Bilinmeyen Kullanıcı';

  const authorSubtitle = post.author
    ? [
      post.author.university,
      typeof post.author.department === 'string'
        ? post.author.department
        : post.author.department?.name,
    ]
      .filter(Boolean)
      .join(' | ')
    : null;

  return (
    <div
      className={`mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${isThread ? 'border-l-4 border-l-indigo-600' : ''
        }`}
    >
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 p-5">
        <div className="flex items-center space-x-4">
          {post.author?.profile_picture_url ? (
            <>
              <img
                src={getImageUrl(post.author.profile_picture_url)}
                alt={authorFullName}
                className="h-12 w-12 rounded-full border border-indigo-100 object-cover shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm" style={{ display: 'none' }}>
                <UserIcon size={22} />
              </div>
            </>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
              <UserIcon size={22} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 font-extrabold text-gray-900">
              {authorFullName}
              {isThread && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-white">
                  Konu Sahibi
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs font-bold text-gray-500">
              {post.author?.username ? `@${post.author.username}` : '@unknown'}
              {authorSubtitle ? ` • ${authorSubtitle}` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center rounded-full border border-gray-100 bg-white px-3 py-1 text-[11px] font-bold text-gray-400 shadow-sm">
          <Calendar size={12} className="mr-1.5" />
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}
        </div>
      </div>

      <div className="p-8">
        {'title' in post && post.title && (
          <h2 className="mb-6 text-3xl font-black leading-tight tracking-tight text-gray-900">
            {post.title}
          </h2>
        )}

        <div className="whitespace-pre-wrap text-base font-medium leading-relaxed text-gray-700">
          {post.content}
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50/50 px-8 py-4 text-sm font-bold text-gray-500">
        {post.helpful_count} yararlı
      </div>
    </div>
  );
};

export const ThreadView: React.FC<ThreadViewProps> = ({ data, onReplySubmit, isSubmitting }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { thread, replies } = data;

  return (
    <div className="animate-fade-in space-y-8">
      <PostCard post={thread} isThread />

      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="flex items-center text-2xl font-black tracking-tight text-gray-900">
          <MessageSquare size={24} className="mr-3 text-indigo-600" />
          CEVAPLAR ({replies.length})
        </h3>
        {!showReplyForm && (
          <button
            onClick={() => setShowReplyForm(true)}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-black text-indigo-600 shadow-sm transition-all hover:border-indigo-600 hover:shadow-md"
          >
            + Cevap Yaz
          </button>
        )}
      </div>

      <div className="space-y-6">
        {replies.map((reply) => (
          <PostCard key={reply.id} post={reply} />
        ))}

        {replies.length === 0 && !showReplyForm && (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-100 bg-white py-16 text-center shadow-sm">
            <div className="mb-4 rounded-full bg-indigo-50 p-4">
              <MessageSquare size={32} className="text-indigo-200" />
            </div>
            <p className="text-lg font-bold tracking-tight text-gray-400">
              Henüz kimse bir şey söylememiş.
            </p>
            <p className="mt-1 text-sm text-gray-400">İlk cevabı vererek tartışmayı sen başlat!</p>
          </div>
        )}
      </div>

      {showReplyForm && (
        <div className="animate-in slide-in-from-bottom-4 rounded-3xl border border-indigo-100 bg-white p-8 shadow-2xl duration-500">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-2 rounded-full bg-indigo-600" />
              <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Cevap Yaz</h4>
            </div>
            <button
              onClick={() => setShowReplyForm(false)}
              className="rounded-full bg-gray-50 p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-900"
            >
              <Trash2 size={20} />
            </button>
          </div>

          <ReplyForm
            onSubmit={async (value) => {
              await onReplySubmit(value);
              setShowReplyForm(false);
            }}
            isSubmitting={isSubmitting}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}
    </div>
  );
};