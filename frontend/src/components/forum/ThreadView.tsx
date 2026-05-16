import React, { useState, useMemo } from 'react';
import { MessageSquare, Trash2, Heart, CornerDownRight, Edit3, Flag, X, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ReplyForm } from './ReplyForm';
import { PostCard } from './PostCard';
import type { ForumReply, ThreadWithReplies } from '../../types/forum';
import { markReplyHelpful, deleteForumReply, updateForumReply, reportForumReply } from '../../api/forum';
import { Link } from 'react-router-dom';
import { parseUtcDate } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../api/config';

const assetBaseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

interface ThreadViewProps {
  data: ThreadWithReplies;
  onReplySubmit: (data: { content: string; parent_id?: string }) => Promise<void>;
  onRefresh: () => void;
  isSubmitting?: boolean;
  autoOpenReply?: boolean;
  onDeleted?: (id: string) => void;
}

const ReplyCard: React.FC<{
  reply: ForumReply;
  onReply: (id: string) => void;
  onRefresh: () => void;
  childrenReplies?: React.ReactNode;
}> = ({ reply, onReply, onRefresh, childrenReplies }) => {
  const { user } = useAuth();
  const [helpfulCount, setHelpfulCount] = useState(reply.helpful_count);
  const [isLiked, setIsLiked] = useState(reply.is_liked_by_me || false);
  const [liking, setLiking] = useState(false);

  // Düzenleme state'leri
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [saving, setSaving] = useState(false);

  // Rapor state'leri
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const isOwner = user?.id === reply.author?.id;

  const authorInitials = reply.author?.first_name
    ? reply.author.first_name[0] + (reply.author.last_name?.[0] || '')
    : reply.author?.username?.[0] || 'U';

  const timeAgo = formatDistanceToNow(parseUtcDate(reply.created_at), { addSuffix: true, locale: tr });

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

  const handleDelete = async () => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    try {
      await deleteForumReply(reply.id);
      onRefresh();
    } catch {
      alert('Yorum silinemedi.');
    }
  };

  const handleEditSave = async () => {
    if (!editContent.trim()) return;
    try {
      setSaving(true);
      await updateForumReply(reply.id, { content: editContent });
      setIsEditing(false);
      onRefresh();
    } catch {
      alert('Düzenleme kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim() || reportReason.trim().length < 5) return;
    try {
      setReporting(true);
      await reportForumReply(reply.id, reportReason.trim());
      setShowReportModal(false);
      setReportReason('');
      alert('Rapor gönderildi. Teşekkürler!');
    } catch {
      alert('Rapor gönderilemedi.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex gap-3">
        <div className="shrink-0">
          <Link to={`/dashboard/profile/${reply.author?.username || ''}`} className="block group">
            {reply.author?.profile_picture_url ? (
              <img
                src={
                  reply.author.profile_picture_url.startsWith('http')
                    ? reply.author.profile_picture_url
                    : `${assetBaseUrl}${reply.author.profile_picture_url}`
                }
                alt={reply.author.username}
                className="w-9 h-9 rounded-full object-cover group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 transition-all group-hover:ring-2 group-hover:ring-indigo-200 ${reply.author?.profile_picture_url ? 'hidden' : ''}`}
            >
              {authorInitials.toUpperCase()}
            </div>
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/dashboard/profile/${reply.author?.username || ''}`}
              className="text-sm font-semibold text-slate-900 transition-colors hover:text-indigo-700"
            >
              {reply.author ? `${reply.author.first_name} ${reply.author.last_name}` : 'İsimsiz'}
            </Link>
            <span className="text-xs text-slate-400">• {timeAgo}</span>
          </div>

          {isEditing ? (
            <div className="mb-2 mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(reply.content);
                  }}
                  className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {reply.content}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <button
              type="button"
              className={`flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                isLiked ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'
              }`}
              onClick={handleLike}
              disabled={liking}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} /> Beğen{' '}
              {helpfulCount > 0 && `(${helpfulCount})`}
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-indigo-700"
              onClick={() => onReply(reply.id)}
            >
              <MessageSquare size={14} /> Yanıtla
            </button>

            {isOwner ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-indigo-700"
                >
                  <Edit3 size={14} /> Düzenle
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-red-600"
                >
                  <Trash2 size={14} /> Sil
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-orange-600"
              >
                <Flag size={14} /> Rapor Et
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rapor Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowReportModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Flag size={20} className="text-orange-500" /> Yorumu Rapor Et
            </h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Şikayet sebebinizi yazın (en az 5 karakter)..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleReport}
                disabled={reporting || reportReason.trim().length < 5}
                className="px-5 py-2 text-sm font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-all shadow-sm shadow-orange-200"
              >
                {reporting ? 'Gönderiliyor...' : 'Rapor Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {childrenReplies && (
        <div className="ml-12 mt-3 border-l-2 border-slate-100 pl-4">
          {childrenReplies}
        </div>
      )}
    </div>
  );
};

export const ThreadView: React.FC<ThreadViewProps> = ({
  data,
  onReplySubmit,
  onRefresh,
  isSubmitting,
  autoOpenReply,
  onDeleted,
}) => {
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
          onRefresh={onRefresh}
          childrenReplies={replyTree.childrenMap.has(reply.id) ? renderReplies(reply.id) : null}
        />
        {activeReplyId === reply.id && (
          <div className="mb-6 ml-14 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="mb-3 flex items-center justify-between text-sm font-medium text-indigo-700">
              <span className="flex items-center gap-2">
                <CornerDownRight size={16} aria-hidden />
                {reply.author ? `${reply.author.first_name} ${reply.author.last_name}` : 'Kullanıcı'} adlı kullanıcıya yanıt
              </span>
              <button
                type="button"
                onClick={() => setActiveReplyId(null)}
                className="text-slate-400 hover:text-slate-800"
                aria-label="İptal"
              >
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
      <PostCard
        post={thread}
        onClick={() => {}}
        onCommentClick={() => handleReplyClick('top')}
        onDeleted={onDeleted}
        interactive={false}
      />

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          <MessageSquare className="h-5 w-5 text-indigo-600" aria-hidden />
          Yorumlar ({replies.filter((r) => !r.parent_id).length})
        </h3>
        {activeReplyId !== 'top' && (
          <button
            type="button"
            onClick={() => handleReplyClick('top')}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800 shadow-sm transition-colors hover:bg-indigo-600 hover:text-white"
          >
            Tartışmaya katıl
          </button>
        )}
      </div>

      {activeReplyId === 'top' && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-indigo-600" />
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-800">Yeni yorum</h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveReplyId(null)}
              className="text-slate-400 transition-colors hover:text-slate-800"
              aria-label="Kapat"
            >
              <Trash2 size={18} />
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
            <div className="mb-3 rounded-full bg-white p-3 shadow-sm ring-1 ring-slate-100">
              <MessageSquare className="h-8 w-8 text-indigo-300" aria-hidden />
            </div>
            <p className="text-base font-medium text-slate-600">Henüz yorum yok</p>
            <p className="mt-1 text-sm text-slate-500">İlk yorumu siz yazarak tartışmayı başlatabilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
};