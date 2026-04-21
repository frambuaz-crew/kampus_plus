import React, { useState, useEffect, useMemo } from 'react';
import { getForumTopicDetail, createForumReply } from '../../api/forum';
import type { ForumReply } from '../../types/forum';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Send, AlertCircle, MessageSquare, CornerDownRight, Heart } from 'lucide-react';
import { markReplyHelpful } from '../../api/forum';
import { parseUtcDate } from '../../utils/dateUtils';

interface InlineCommentsProps {
    topicId: string;
    onCommentAdded: () => void;
}

const baseUrl = 'http://localhost:8000';

// Single comment + its children thread
const CommentItem: React.FC<{
    reply: ForumReply;
    children?: ForumReply[];
    allReplies: ForumReply[];
    onReplySubmit: (content: string, parentId: string) => Promise<void>;
    depth?: number;
}> = ({ reply, children = [], allReplies, onReplySubmit, depth = 0 }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [helpfulCount, setHelpfulCount] = useState(reply.helpful_count);
    const [isLiked, setIsLiked] = useState(reply.is_liked_by_me || false);
    const [liking, setLiking] = useState(false);

    const authorInitials = reply.author?.first_name
        ? reply.author.first_name[0] + (reply.author.last_name?.[0] || '')
        : reply.author?.username?.[0] || 'U';

    const timeAgo = formatDistanceToNow(parseUtcDate(reply.created_at), { addSuffix: true, locale: tr });

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!replyText.trim()) return;
        try {
            setSubmitting(true);
            await onReplySubmit(replyText.trim(), reply.id);
            setReplyText('');
            setShowReplyForm(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="border-b border-gray-50 last:border-b-0 py-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-3">
                <Link to={`/dashboard/profile/${reply.author?.username || ''}`} onClick={(e) => e.stopPropagation()} className="shrink-0 group">
                    {reply.author?.profile_picture_url ? (
                        <img
                            src={reply.author.profile_picture_url.startsWith('http') ? reply.author.profile_picture_url : `${baseUrl}${reply.author.profile_picture_url}`}
                            alt={reply.author.username}
                            className="w-8 h-8 rounded-full object-cover group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold text-xs ${reply.author?.profile_picture_url ? 'hidden' : ''}`}>
                        {authorInitials.toUpperCase()}
                    </div>
                </Link>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <Link to={`/dashboard/profile/${reply.author?.username || ''}`} onClick={(e) => e.stopPropagation()} className="font-bold text-sm text-gray-900 hover:text-indigo-600 transition-colors">
                            {reply.author ? `${reply.author.first_name} ${reply.author.last_name}` : 'İsimsiz'}
                        </Link>
                        <span className="text-[10px] font-medium text-gray-400">
                            {timeAgo}
                        </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-1">{reply.content}</p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLike}
                            disabled={liking}
                            className={`flex items-center gap-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${isLiked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}
                        >
                            <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} />
                            {helpfulCount > 0 ? helpfulCount : ''}
                        </button>
                        {depth < 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowReplyForm(v => !v); }}
                                className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                                <MessageSquare size={12} /> Yanıtla
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Threaded children */}
            {children.length > 0 && (
                <div className="mt-2 ml-11 pl-3 border-l-2 border-gray-100">
                    {children.map(child => (
                        <CommentItem
                            key={child.id}
                            reply={child}
                            children={allReplies.filter(r => r.parent_id === child.id)}
                            allReplies={allReplies}
                            onReplySubmit={onReplySubmit}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}

            {/* Reply form */}
            {showReplyForm && (
                <div className="mt-2 ml-11" onClick={(e) => e.stopPropagation()}>
                    <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 mb-1.5">
                        <CornerDownRight size={12} />
                        {reply.author ? `${reply.author.first_name} ${reply.author.last_name}` : 'Kullanıcı'}'a yanıt veriyorsun
                    </div>
                    <form onSubmit={handleSubmit} className="flex items-end gap-2">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Yanıtını yaz..."
                            className="flex-1 max-h-24 min-h-[36px] py-2 px-3 bg-white border border-gray-200 text-sm text-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none shadow-sm transition-all"
                            disabled={submitting}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (replyText.trim()) handleSubmit(e as any); } }}
                        />
                        <button
                            type="submit"
                            disabled={submitting || !replyText.trim()}
                            className="shrink-0 w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                            {submitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export const InlineComments: React.FC<InlineCommentsProps> = ({ topicId, onCommentAdded }) => {
    const [replies, setReplies] = useState<ForumReply[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchReplies = async () => {
            try {
                setLoading(true);
                const res = await getForumTopicDetail(topicId);
                if (isMounted) setReplies(res.replies);
            } catch {
                if (isMounted) setError('Yorumlar yüklenemedi.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        void fetchReplies();
        return () => { isMounted = false; };
    }, [topicId]);

    const rootReplies = useMemo(() => replies.filter(r => !r.parent_id), [replies]);

    const handleSubmitTop = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newComment.trim()) return;
        try {
            setIsSubmitting(true);
            setError(null);
            await createForumReply(topicId, { content: newComment.trim() });
            const res = await getForumTopicDetail(topicId);
            setReplies(res.replies);
            setNewComment('');
            onCommentAdded();
        } catch {
            setError('Yorum gönderilemedi');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReplySubmit = async (content: string, parentId: string) => {
        await createForumReply(topicId, { content, parent_id: parentId });
        const res = await getForumTopicDetail(topicId);
        setReplies(res.replies);
        onCommentAdded();
    };

    if (loading) {
        return (
            <div className="pt-4 mt-2 border-t border-gray-100 flex justify-center pb-2">
                <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="pt-4 mt-2 border-t border-gray-100 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
            {error && (
                <div className="mb-3 text-sm text-red-500 flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Root comment list */}
            <div className="mb-3">
                {rootReplies.length === 0 ? (
                    <div className="text-center text-sm font-medium text-gray-400 py-2">
                        Henüz yorum yapılmamış. İlk yorumu sen yap!
                    </div>
                ) : (
                    rootReplies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            reply={reply}
                            children={replies.filter(r => r.parent_id === reply.id)}
                            allReplies={replies}
                            onReplySubmit={handleReplySubmit}
                        />
                    ))
                )}
            </div>

            {/* Top-level new comment form */}
            <form onSubmit={handleSubmitTop} className="flex items-end gap-2 pt-2 border-t border-gray-50">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Gönderiye yorum yap..."
                    className="flex-1 max-h-32 min-h-[44px] py-2.5 px-4 bg-white border border-gray-200 text-sm text-gray-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none shadow-sm transition-all"
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (newComment.trim()) handleSubmitTop(e as any);
                        }
                    }}
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="shrink-0 w-11 h-11 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 hover:-translate-y-0.5"
                >
                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} className="-ml-0.5" />}
                </button>
            </form>
            <div className="text-[10px] text-gray-400 font-medium px-4 mt-1 tracking-wide">
                Enter ile gönder
            </div>
        </div>
    );
};
