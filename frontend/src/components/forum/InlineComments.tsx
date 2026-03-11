import React, { useState, useEffect } from 'react';
import { getForumTopicDetail, createForumReply } from '../../api/forum';
import type { ForumReply } from '../../types/forum';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Send, AlertCircle } from 'lucide-react';

interface InlineCommentsProps {
    topicId: string;
    onCommentAdded: () => void;
}

export const InlineComments: React.FC<InlineCommentsProps> = ({ topicId, onCommentAdded }) => {
    const baseUrl = 'http://localhost:8000';
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
                if (isMounted) {
                    setReplies(res.replies);
                }
            } catch (err) {
                if (isMounted) setError('Yorumlar yüklenemedi.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void fetchReplies();
        return () => { isMounted = false; };
    }, [topicId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!newComment.trim()) return;

        try {
            setIsSubmitting(true);
            setError(null);
            await createForumReply(topicId, { content: newComment.trim() });

            // Yorum başarılı olduktan sonra yeni listeyi çek
            const res = await getForumTopicDetail(topicId);
            setReplies(res.replies);
            setNewComment('');
            onCommentAdded();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Yorum gönderilemedi');
        } finally {
            setIsSubmitting(false);
        }
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
                <div className="mb-4 text-sm text-red-500 flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* List of Replies */}
            <div className="space-y-4 mb-4">
                {replies.length === 0 ? (
                    <div className="text-center text-sm font-medium text-gray-400 py-2">
                        Henüz yorum yapılmamış. İlk yorumu sen yap!
                    </div>
                ) : (
                    replies.map(reply => {
                        const authorInitials = reply.author?.first_name
                            ? reply.author.first_name[0] + (reply.author.last_name?.[0] || '')
                            : reply.author?.username?.[0] || 'U';

                        return (
                            <div key={reply.id} className="flex gap-3 animate-in slide-in-from-bottom-2 fade-in">
                                <Link to={`/dashboard/profile/${reply.author?.username || ''}`} className="shrink-0 group">
                                    {reply.author?.profile_picture_url ? (
                                        <img
                                            src={reply.author.profile_picture_url.startsWith('http') ? reply.author.profile_picture_url : `${baseUrl}${reply.author.profile_picture_url}`}
                                            alt={reply.author.username}
                                            className="w-8 h-8 rounded-full object-cover shadow-sm group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                target.nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold text-xs shadow-sm group-hover:ring-2 group-hover:ring-indigo-500 transition-all ${reply.author?.profile_picture_url ? 'hidden' : ''}`}
                                    >
                                        {authorInitials.toUpperCase()}
                                    </div>
                                </Link>
                                <div className="flex-1 bg-gray-50/80 rounded-2xl rounded-tl-none p-3 border border-gray-100 shadow-sm relative group hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Link to={`/dashboard/profile/${reply.author?.username || ''}`} className="font-bold text-sm text-gray-900 hover:text-indigo-600 transition-colors">
                                            {reply.author ? `${reply.author.first_name} ${reply.author.last_name}` : 'İsimsiz Kullanıcı'}
                                        </Link>
                                        <span className="text-[10px] font-medium text-gray-400">
                                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: tr })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Small White Bubble Add Comment Form */}
            <form onSubmit={handleSubmit} className="flex items-end gap-2 relative mt-2 pt-2 border-t border-gray-50">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Gönderiye yorum yap..."
                    className="flex-1 max-h-32 min-h-[44px] py-2.5 px-4 bg-white border border-gray-200 text-sm text-gray-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none shadow-sm transition-all custom-scrollbar"
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (newComment.trim()) handleSubmit(e);
                        }
                    }}
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="shrink-0 w-11 h-11 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                >
                    {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Send size={16} className="-ml-0.5" />
                    )}
                </button>
            </form>
            <div className="text-[10px] text-gray-400 font-medium px-4 mt-1.5 flex justify-between tracking-wide">
                <span>Enter ile gönder</span>
                {newComment.length > 0 && <span className={newComment.length > 500 ? 'text-amber-500' : ''}>{newComment.length} karakter</span>}
            </div>
        </div>
    );
};
