import React, { useState, useMemo } from 'react';
import { MessageSquare, Trash2, Heart, CornerDownRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ReplyForm } from './ReplyForm';
import { PostCard } from './PostCard';
import type { ForumReply, ThreadWithReplies } from '../../types/forum';
import { markReplyHelpful } from '../../api/forum';
import { Link } from 'react-router-dom';

interface ThreadViewProps {
  data: ThreadWithReplies;
  onReplySubmit: (data: { content: string; parent_id?: string }) => Promise<void>;
  isSubmitting?: boolean;
  autoOpenReply?: boolean;
}

const ReplyCard: React.FC<{
  reply: ForumReply;
  onReply: (id: string) => void;
  childrenReplies?: React.ReactNode;
}> = ({ reply, onReply, childrenReplies }) => {
  const baseUrl = 'http://localhost:8000';
  const [helpfulCount, setHelpfulCount] = useState(reply.helpful_count);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  const authorInitials = reply.author?.first_name
    ? reply.author.first_name[0] + (reply.author.last_name?.[0] || '')
    : reply.author?.username?.[0] || 'U';

  const timeAgo = formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: tr });

  const handleLike = async () => {
    if (liking) return;
    try {
      setLiking(true);
      const res = await markReplyHelpful(reply.id);
      if (res.success) {
        setHelpfulCount(res.helpful_count);
        setIsLiked(res.action === 'liked');
      }
    } catch {
      // ignore
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0 py-4">
      <div className="flex gap-3">
        <div className="shrink-0">
          <Link to={`/dashboard/profile/${reply.author?.username || ''}`} className="block group">
            {reply.author?.profile_picture_url ? (
              <img
                src={reply.author.profile_picture_url.startsWith('http') ? reply.author.profile_picture_url : `${baseUrl}${reply.author.profile_picture_url}`}
                alt={reply.author.username}
                className="w-9 h-9 rounded-full object-cover group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 font-bold text-sm group-hover:ring-2 group-hover:ring-indigo-500 transition-all ${reply.author?.profile_picture_url ? 'hidden' : ''}`}>
              {authorInitials.toUpperCase()}
            </div>
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/dashboard/profile/${reply.author?.username || ''}`} className="font-bold text-gray-900 text-sm hover:text-indigo-600 transition-colors">
              {reply.author ? `${reply.author.first_name} ${reply.author.last_name}` : 'İsimsiz'}
            </Link>
            <span className="text-xs text-gray-400">• {timeAgo}</span>
          </div>

          <div className="text-gray-700 text-sm mb-2 leading-relaxed whitespace-pre-wrap">
            {reply.content}
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
            <button
              className={`flex items-center gap-1.5 transition-colors disabled:opacity-50 ${isLiked ? 'text-rose-500' : 'hover:text-rose-500 text-gray-400'}`}
              onClick={handleLike}
              disabled={liking}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} /> Beğen {helpfulCount > 0 && `(${helpfulCount})`}
            </button>
            <button
              className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              onClick={() => onReply(reply.id)}
            >
              <MessageSquare size={14} /> Yanıtla
            </button>
          </div>
        </div>
      </div>

      {childrenReplies && (
        <div className="mt-3 ml-12 pl-4 border-l-2 border-gray-100">
          {childrenReplies}
        </div>
      )}
    </div>
  );
};

export const ThreadView: React.FC<ThreadViewProps> = ({ data, onReplySubmit, isSubmitting, autoOpenReply }) => {
  const [activeReplyId, setActiveReplyId] = useState<string | null>(autoOpenReply ? 'top' : null);
  const { thread, replies } = data;

  React.useEffect(() => {
    if (autoOpenReply) {
      setActiveReplyId('top');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveReplyId(null);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [thread.id, autoOpenReply]);

  // Build the comments tree
  const replyTree = useMemo(() => {
    const rootReplies: ForumReply[] = [];
    const childrenMap = new Map<string, ForumReply[]>();

    replies.forEach(reply => {
      if (reply.parent_id) {
        const parentsChildren = childrenMap.get(reply.parent_id) || [];
        parentsChildren.push(reply);
        childrenMap.set(reply.parent_id, parentsChildren);
      } else {
        rootReplies.push(reply);
      }
    });

    // Sort ascending by time
    rootReplies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    childrenMap.forEach(children => {
      children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return { rootReplies, childrenMap };
  }, [replies]);

  const handleReplyClick = (id: string | null) => {
    setActiveReplyId(id === activeReplyId ? null : id);
  };

  const renderReplies = (parentId: string | null = null): React.ReactNode => {
    const targetList = parentId ? replyTree.childrenMap.get(parentId) || [] : replyTree.rootReplies;

    return targetList.map(reply => (
      <div key={reply.id} className="relative">
        <ReplyCard
          reply={reply}
          onReply={handleReplyClick}
          childrenReplies={
            replyTree.childrenMap.has(reply.id) ? renderReplies(reply.id) : null
          }
        />
        {activeReplyId === reply.id && (
          <div className="mb-6 ml-14 animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="flex items-center justify-between mb-3 text-sm font-bold text-indigo-600">
                <span className="flex items-center gap-2">
                <CornerDownRight size={16} />
                {reply.author ? `${reply.author.first_name} ${reply.author.last_name}` : 'Kullanıcı'}'a yanıt veriyorsun
              </span>
              <button onClick={() => setActiveReplyId(null)} className="text-gray-400 hover:text-gray-900">
                <Trash2 size={16} />
              </button>
            </div>
            <ReplyForm
              onSubmit={async (value) => {
                await onReplySubmit({ content: value.content, parent_id: reply.id });
                setActiveReplyId(null);
              }}
              isSubmitting={isSubmitting}
              onCancel={() => setActiveReplyId(null)}
            />
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Target thread'i global PostCard ile çiz */}
      <PostCard post={thread} onClick={() => { }} onCommentClick={() => handleReplyClick('top')} />

      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="flex items-center text-xl font-black tracking-tight text-gray-900">
          <MessageSquare size={20} className="mr-3 text-indigo-600" />
          YORUMLAR ({replies.filter(r => !r.parent_id).length})
        </h3>
        {activeReplyId !== 'top' && (
          <button
            onClick={() => handleReplyClick('top')}
            className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-2 text-sm font-black text-indigo-600 shadow-sm transition-all hover:bg-indigo-600 hover:text-white"
          >
            + Tartışmaya Katıl
          </button>
        )}
      </div>

      {activeReplyId === 'top' && (
        <div className="mb-8 animate-in slide-in-from-bottom-4 rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl duration-500">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-2 rounded-full bg-indigo-600" />
              <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Yeni Yorum</h4>
            </div>
            <button onClick={() => setActiveReplyId(null)} className="text-gray-400 hover:text-gray-900">
              <Trash2 size={20} />
            </button>
          </div>
          <ReplyForm
            onSubmit={async (value) => {
              await onReplySubmit({ content: value.content, parent_id: undefined });
              setActiveReplyId(null);
            }}
            isSubmitting={isSubmitting}
            onCancel={() => setActiveReplyId(null)}
          />
        </div>
      )}

      <div className="space-y-2">
        {renderReplies(null)}

        {replies.length === 0 && activeReplyId === null && (
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
    </div>
  );
};