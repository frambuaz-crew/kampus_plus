import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageSquare, MoreHorizontal, Calendar, X } from 'lucide-react';
import type { ThreadListItem } from '../../types/forum';
import { ImageLightbox } from './ImageLightbox';
import { markTopicHelpful, getTopicLikers } from '../../api/forum';
import { Link } from 'react-router-dom';
import { InlineComments } from './InlineComments';
import { parseUtcDate } from '../../utils/dateUtils';

interface PostCardProps {
    post: ThreadListItem;
    onClick: (id: string) => void;
    onCommentClick?: (id: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onClick, onCommentClick }) => {
    const baseUrl = 'http://localhost:8000';
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [helpfulCount, setHelpfulCount] = useState(post.helpful_count);
    const [isLikedByMe, setIsLikedByMe] = useState(post.is_liked_by_me || false);
    const [liking, setLiking] = useState(false);

    const [showLikers, setShowLikers] = useState(false);
    const [likers, setLikers] = useState<any[]>([]);
    const [loadingLikers, setLoadingLikers] = useState(false);

    const [showComments, setShowComments] = useState(false);
    const [replyCount, setReplyCount] = useState(post.reply_count);
    const likersPopupRef = useRef<HTMLDivElement>(null);

    const authorInitials = post.author?.first_name
        ? post.author.first_name[0] + (post.author.last_name?.[0] || '')
        : post.author?.username?.[0] || 'U';

    const timeAgo = formatDistanceToNow(parseUtcDate(post.created_at), { addSuffix: true, locale: tr });

    useEffect(() => {
        if (!showLikers) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (likersPopupRef.current && !likersPopupRef.current.contains(e.target as Node)) {
                setShowLikers(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [showLikers]);

    const tags: string[] = post.tags ? JSON.parse(post.tags) : [];
    const images: string[] = post.image_urls ? JSON.parse(post.image_urls) : [];


    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (liking) return;
        try {
            setLiking(true);
            const res = await markTopicHelpful(post.id);
            if (res.success) {
                setHelpfulCount(res.helpful_count);
                setIsLikedByMe(res.action === 'liked');
            }
        } catch {
            // maybe show toast
        } finally {
            setLiking(false);
        }
    };

    const handleShowLikers = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowLikers(true);
        if (likers.length === 0) {
            setLoadingLikers(true);
            try {
                const res = await getTopicLikers(post.id);
                setLikers(res.likers || []);
            } catch {
            } finally {
                setLoadingLikers(false);
            }
        }
    };

    return (
        <div
            className="bg-white rounded-3xl p-5 mb-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onClick(post.id)}
        >
            {/* HEADER: Author & Time */}
            <div className="flex items-center justify-between mb-4">
                <Link to={`/dashboard/profile/${post.author?.username || ''}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 group">
                    {post.author?.profile_picture_url ? (
                        <img
                            src={post.author.profile_picture_url.startsWith('http') ? post.author.profile_picture_url : `${baseUrl}${post.author.profile_picture_url}`}
                            alt={post.author.username}
                            className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold text-lg shadow-sm group-hover:ring-2 group-hover:ring-indigo-500 transition-all ${post.author?.profile_picture_url ? 'hidden' : ''}`}
                    >
                        {authorInitials.toUpperCase()}
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                            {post.author ? `${post.author.first_name} ${post.author.last_name}` : 'İsimsiz Kullanıcı'}
                        </h3>
                        <div className="flex items-center text-xs text-gray-500 gap-2 mt-0.5">
                            <span>{post.author?.university || 'Kampüs'}</span>
                            <span>•</span>
                            <span>{timeAgo}</span>
                        </div>
                    </div>
                </Link>

                <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* CONTENT: Tags, Title, Text */}
            <div className="mb-4">
                {tags.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                        {tags.map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">
                                {tag.startsWith('#') ? tag : `#${tag}`}
                            </span>
                        ))}
                    </div>
                )}

                <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                    {post.title}
                </h2>
                <p className="text-gray-600 line-clamp-3 leading-relaxed">
                    {post.content}
                </p>
            </div>

            {images.length > 0 && (
                <>
                    <div className={`flex flex-wrap gap-2 mb-4`}>
                        {images.map((img, idx) => (
                            <div
                                key={idx}
                                className="w-32 h-32 sm:w-48 sm:h-48 bg-gray-100 rounded-2xl overflow-hidden relative cursor-zoom-in group shrink-0"
                                onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                            >
                                <img src={img.startsWith('http') ? img : `${baseUrl}${img}`} alt="Gönderi görseli" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        ))}
                    </div>
                    {lightboxIndex !== null && (
                        <ImageLightbox
                            images={images}
                            initialIndex={lightboxIndex}
                            onClose={() => setLightboxIndex(null)}
                        />
                    )}
                </>
            )}


            {post.topic_type === 'event' && (
                <div className="mb-4 bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-center gap-4 text-purple-900 cursor-default" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white p-3 rounded-xl shadow-sm text-purple-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-bold uppercase tracking-wider text-purple-500 mb-1">Etkinlik</div>
                        <div className="font-semibold">{post.title}</div>
                        {post.event_date && (
                            <div className="text-xs text-purple-600 mt-1 font-medium bg-purple-100 py-1 px-2 rounded inline-block">
                                Tarih: {new window.Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(post.event_date))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FOOTER: Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 relative">
                <div className="flex gap-2 items-center">
                    <button
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-bold transition-all group disabled:opacity-50 rounded-xl ${isLikedByMe ? 'text-rose-500 bg-rose-50' : 'text-gray-500 hover:text-rose-500 hover:bg-rose-50'}`}
                        onClick={handleLike}
                        disabled={liking}
                    >
                        <Heart size={18} className={isLikedByMe ? 'fill-rose-500' : 'group-hover:fill-rose-500 transition-all'} />
                    </button>
                    {helpfulCount > 0 && (
                        <button
                            className="text-sm font-bold text-gray-500 hover:underline hover:text-rose-500 cursor-pointer pl-1 pr-3 py-2 -ml-2"
                            onClick={handleShowLikers}
                        >
                            {helpfulCount} Beğeni
                        </button>
                    )}

                    <button
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onCommentClick) {
                                onCommentClick(post.id);
                            } else {
                                setShowComments(!showComments);
                            }
                        }}
                    >
                        <MessageSquare size={18} />
                        <span>{replyCount > 0 ? replyCount : 'Yorum'}</span>
                    </button>
                </div>

                {showLikers && (
                    <div ref={likersPopupRef} className="absolute left-0 bottom-full mb-2 bg-white rounded-xl shadow-xl border border-gray-100 w-64 p-3 z-50 text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-gray-700">Beğenenler</h4>
                            <button onClick={(e) => { e.stopPropagation(); setShowLikers(false); }} className="text-gray-400 hover:text-gray-700 font-bold"><X size={16} /></button>
                        </div>
                        {loadingLikers ? (
                            <div className="text-center py-4 text-gray-400">Yükleniyor...</div>
                        ) : likers.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 font-medium">Henüz beğenen yok.</div>
                        ) : (
                            <ul className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {likers.map(liker => (
                                    <li key={liker.id}>
                                        <Link to={`/dashboard/profile/${liker.username}`} className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors group">
                                            {liker.profile_picture_url ? (
                                                <img
                                                    src={liker.profile_picture_url.startsWith('http') ? liker.profile_picture_url : `${baseUrl}${liker.profile_picture_url}`}
                                                    className="w-6 h-6 rounded-full object-cover shadow-sm group-hover:ring-2 group-hover:ring-indigo-500"
                                                    alt={liker.username}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] group-hover:ring-2 group-hover:ring-indigo-500 ${liker.profile_picture_url ? 'hidden' : ''}`}>
                                                {liker.first_name?.[0] || liker.username?.[0] || 'U'}
                                            </div>
                                            <span className="font-bold text-gray-700 text-xs group-hover:text-indigo-600 truncate">{liker.first_name} {liker.last_name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {showComments && (
                <InlineComments
                    topicId={post.id}
                    onCommentAdded={() => setReplyCount(prev => prev + 1)}
                />
            )}
        </div>
    );
};
