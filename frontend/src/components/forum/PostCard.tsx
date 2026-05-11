import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageSquare, MoreHorizontal, Calendar, X, Edit3, Trash2, Flag } from 'lucide-react';
import type { ThreadListItem } from '../../types/forum';
import { ImageLightbox } from './ImageLightbox';
import { markTopicHelpful, getTopicLikers, deleteForumTopic, updateForumTopic, reportForumTopic } from '../../api/forum';
import { Link } from 'react-router-dom';
import { InlineComments } from './InlineComments';
import { parseUtcDate } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../api/config';

// API base URL'den /api/v1 kısmını çıkar → asset base URL
const assetBaseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

interface PostCardProps {
    post: ThreadListItem;
    onClick: (id: string) => void;
    onCommentClick?: (id: string) => void;
    onDeleted?: (id: string) => void;
    /** false: konu detayında kart tıklanabilir görünmez */
    interactive?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
    post,
    onClick,
    onCommentClick,
    onDeleted,
    interactive = true,
}) => {
    const { user } = useAuth();
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

    // Menü ve düzenleme state'leri
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(post.title);
    const [editContent, setEditContent] = useState(post.content);
    const [saving, setSaving] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);

    const isOwner = user?.id === post.author?.id;

    const authorInitials = post.author?.first_name
        ? post.author.first_name[0] + (post.author.last_name?.[0] || '')
        : post.author?.username?.[0] || 'U';

    const timeAgo = formatDistanceToNow(parseUtcDate(post.created_at), { addSuffix: true, locale: tr });

    // Menü dışına tıklayınca kapat
    useEffect(() => {
        if (!showMenu) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [showMenu]);

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

    // JSONB native list — artık JSON.parse gerekmiyor
    const tags: string[] = Array.isArray(post.tags) ? post.tags : [];
    const images: string[] = Array.isArray(post.image_urls) ? post.image_urls : [];


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

    const handleDelete = async () => {
        if (!confirm('Bu gönderiyi silmek istediğinize emin misiniz?')) return;
        try {
            await deleteForumTopic(post.id);
            onDeleted?.(post.id);
        } catch {
            alert('Gönderi silinemedi.');
        }
        setShowMenu(false);
    };

    const handleEditSave = async () => {
        if (!editTitle.trim() || !editContent.trim()) return;
        try {
            setSaving(true);
            await updateForumTopic(post.id, { title: editTitle, content: editContent });
            post.title = editTitle;
            post.content = editContent;
            setIsEditing(false);
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
            await reportForumTopic(post.id, reportReason.trim());
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
        <div
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow ${
                interactive && !isEditing
                    ? 'cursor-pointer hover:border-indigo-200 hover:shadow-md'
                    : 'cursor-default'
            }`}
            onClick={() => {
                if (!isEditing && interactive) onClick(post.id);
            }}
            role={interactive && !isEditing ? 'button' : undefined}
        >
            {/* HEADER: Author & Time */}
            <div className="flex items-center justify-between mb-4">
                <Link to={`/dashboard/profile/${post.author?.username || ''}`} onClick={(e) => e.stopPropagation()} className="group flex items-center gap-3">
                    {post.author?.profile_picture_url ? (
                        <img
                            src={post.author.profile_picture_url.startsWith('http') ? post.author.profile_picture_url : `${assetBaseUrl}${post.author.profile_picture_url}`}
                            alt={post.author.username}
                            className="h-11 w-11 rounded-full object-cover shadow-sm ring-1 ring-slate-100 transition-all group-hover:ring-indigo-300"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-slate-100 transition-all group-hover:ring-indigo-300 ${post.author?.profile_picture_url ? 'hidden' : ''}`}
                    >
                        {authorInitials.toUpperCase()}
                    </div>

                    <div>
                        <h3 className="font-semibold leading-tight text-slate-900 transition-colors group-hover:text-indigo-700">
                            {post.author ? `${post.author.first_name} ${post.author.last_name}` : 'İsimsiz Kullanıcı'}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                            <span>{post.author?.university || 'Kampüs'}</span>
                            <span>•</span>
                            <span>{timeAgo}</span>
                        </div>
                    </div>
                </Link>

                {/* Üç nokta menüsü */}
                <div className="relative" ref={menuRef}>
                    <button
                        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                            {isOwner ? (
                                <>
                                    <button
                                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                    >
                                        <Edit3 size={14} /> Düzenle
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 size={14} /> Sil
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
                                >
                                    <Flag size={14} /> Rapor Et
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENT: Tags, Title, Text */}
            {isEditing ? (
                <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                    <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={handleEditSave}
                            disabled={saving}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                            onClick={() => { setIsEditing(false); setEditTitle(post.title); setEditContent(post.content); }}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mb-4">
                    {tags.length > 0 && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {tags.map((tag, idx) => (
                                <span key={idx} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                            ))}
                        </div>
                    )}

                    <h2 className="mb-2 text-lg font-semibold leading-snug tracking-tight text-slate-900">
                        {post.title}
                    </h2>
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                        {post.content}
                    </p>
                </div>
            )}

            {images.length > 0 && (
                <>
                    <div className={`flex flex-wrap gap-2 mb-4`}>
                        {images.map((img, idx) => (
                            <div
                                key={idx}
                                className="group relative h-32 w-32 shrink-0 cursor-zoom-in overflow-hidden rounded-xl bg-slate-100 sm:h-40 sm:w-40"
                                onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                            >
                                <img src={img.startsWith('http') ? img : `${assetBaseUrl}${img}`} alt="Gönderi görseli" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
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
                <div className="mb-4 flex cursor-default items-center gap-4 rounded-xl border border-violet-200 bg-violet-50/80 p-4 text-violet-950" onClick={(e) => e.stopPropagation()}>
                    <div className="rounded-lg bg-white p-2.5 text-violet-600 shadow-sm">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600">Etkinlik</div>
                        <div className="font-medium text-slate-900">{post.title}</div>
                        {post.event_date && (
                            <div className="mt-1 inline-block rounded-md bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800">
                                Tarih: {new window.Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(post.event_date))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FOOTER: Actions */}
            <div className="relative flex items-center justify-between border-t border-slate-100 pt-4">
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
                                                    src={liker.profile_picture_url.startsWith('http') ? liker.profile_picture_url : `${assetBaseUrl}${liker.profile_picture_url}`}
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

            {/* Rapor Et Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setShowReportModal(false); }}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                            <Flag size={18} className="text-orange-500" /> Gönderiyi Rapor Et
                        </h3>
                        <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Şikayet sebebinizi yazın (en az 5 karakter)..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                        <div className="flex gap-2 mt-3 justify-end">
                            <button onClick={() => setShowReportModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">İptal</button>
                            <button onClick={handleReport} disabled={reporting || reportReason.trim().length < 5} className="px-4 py-2 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50">
                                {reporting ? 'Gönderiliyor...' : 'Rapor Gönder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
