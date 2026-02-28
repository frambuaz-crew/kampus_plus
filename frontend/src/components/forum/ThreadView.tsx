import React, { useState } from 'react';
import { ThumbsUp, Flag, Edit, Trash2, Paperclip, Download, User as UserIcon, Calendar, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ReplyForm } from './ReplyForm';
import type { ThreadWithReplies, ForumPost } from '../../types/forum';
import { useAuth } from '../../hooks/useAuth';
import { getImageUrl } from '../../utils/imageUrl';

interface ThreadViewProps {
  data: ThreadWithReplies;
  onReplySubmit: (data: { content: string; files: File[]; mentions?: string[] }) => Promise<void>;
  onHelpful: (postId: string) => Promise<void>;
  onReport: (postId: string) => void;
  onRefresh: () => void;
  isSubmitting?: boolean;
}

// Ortak Kart Bileşeni (Konu ve Cevaplar için)
const PostCard: React.FC<{
  post: ForumPost;
  isThread?: boolean;
  onHelpful: (id: string) => void;
  onReport: (id: string) => void;
  currentUserId?: string;
}> = ({ post, isThread = false, onHelpful, onReport, currentUserId }) => {

  // 10 dakika düzenleme kuralı
  const canModify = currentUserId === post.author.id &&
    (new Date().getTime() - new Date(post.created_at).getTime()) < 10 * 60 * 1000;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6 shadow-sm transition-all ${isThread ? 'border-l-4 border-l-indigo-600' : ''}`}>
      {/* Kart Header: Kullanıcı Bilgileri - Aydınlık */}
      <div className="bg-gray-50/80 p-5 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center space-x-4">
          {post.author.profile_picture_url ? (
            <img
              src={getImageUrl(post.author.profile_picture_url)}
              alt={`${post.author.first_name} ${post.author.last_name}`}
              className="w-12 h-12 rounded-full object-cover border border-indigo-100 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
              <UserIcon size={22} />
            </div>
          )}
          <div>
            <div className="font-extrabold text-gray-900 flex items-center gap-2">
              {post.author.first_name} {post.author.last_name}
              {isThread && (
                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                  Konu Sahibi
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 font-bold flex items-center mt-0.5">
              <span className="text-indigo-600">🎓 {post.author.university}</span>
              <span className="mx-2 text-gray-300">|</span>
              {/* Department bir nesne olduğu için içindeki .name alanını yazdırıyoruz */}
              <span>{post.author.department?.name || 'Genel'}</span>
            </div>
          </div>
        </div>
        <div className="text-[11px] font-bold text-gray-400 flex items-center bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
          <Calendar size={12} className="mr-1.5" />
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}
        </div>
      </div>

      {/* Kart İçerik */}
      <div className="p-8">
        {isThread && post.title && (
          <h2 className="text-3xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
            {post.title}
          </h2>
        )}

        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-8 text-base font-medium">
          {post.content}
        </div>

        {/* Dosya Ekleri - Aydınlık */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100 shadow-inner">
            <h4 className="text-[11px] font-black text-gray-400 uppercase mb-4 flex items-center tracking-widest">
              <Paperclip size={14} className="mr-2 text-indigo-500" /> Eklenen Dosyalar
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {post.attachments.map((file) => (
                <a
                  key={file.id}
                  href={file.file_url}
                  download
                  className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all group shadow-sm"
                >
                  <span className="text-sm text-gray-700 font-bold truncate pr-4">{file.filename}</span>
                  <Download size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Etiketler */}
        {isThread && post.tags && (
          <div className="flex flex-wrap gap-2 mb-2">
            {post.tags.map((tag) => (
              <span key={tag.id} className="text-[11px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Kart Footer: Aksiyonlar */}
      <div className="bg-gray-50/50 px-8 py-4 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => onHelpful(post.id)}
            className="flex items-center space-x-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors group"
          >
            <ThumbsUp size={18} className="group-hover:-translate-y-0.5 transition-transform" />
            <span>{post.helpful_count} Yararlı</span>
          </button>

          <button
            onClick={() => onReport(post.id)}
            className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-red-500 transition-colors"
          >
            <Flag size={18} />
            <span>Rapor Et</span>
          </button>
        </div>

        {canModify && (
          <div className="flex items-center space-x-2">
            <button className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-100">
              <Edit size={18} />
            </button>
            <button className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-100">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ThreadView: React.FC<ThreadViewProps> = ({ data, onReplySubmit, onHelpful, onReport, isSubmitting }) => {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { thread, replies } = data;

  return (
    <div className="animate-fade-in space-y-8">
      {/* 1. Ana Konu */}
      <PostCard
        post={thread}
        isThread
        onHelpful={onHelpful}
        onReport={onReport}
        currentUserId={user?.id}
      />

      {/* 2. Cevaplar Başlığı */}
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-2xl font-black text-gray-900 flex items-center tracking-tight">
          <MessageSquare size={24} className="mr-3 text-indigo-600" />
          CEVAPLAR ({replies.length})
        </h3>
        {!showReplyForm && (
          <button
            onClick={() => setShowReplyForm(true)}
            className="bg-white border border-gray-200 px-5 py-2 rounded-xl text-sm font-black text-indigo-600 hover:border-indigo-600 hover:shadow-md transition-all shadow-sm"
          >
            + Cevap Yaz
          </button>
        )}
      </div>

      {/* 3. Cevap Listesi */}
      <div className="space-y-6">
        {replies.map((reply) => (
          <PostCard
            key={reply.id}
            post={reply}
            onHelpful={onHelpful}
            onReport={onReport}
            currentUserId={user?.id}
          />
        ))}
        {replies.length === 0 && !showReplyForm && (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <div className="bg-indigo-50 p-4 rounded-full mb-4">
              <MessageSquare size={32} className="text-indigo-200" />
            </div>
            <p className="text-gray-400 font-bold text-lg tracking-tight">Henüz kimse bir şey söylememiş.</p>
            <p className="text-gray-400 text-sm mt-1">İlk cevabı vererek tartışmayı sen başlat!</p>
          </div>
        )}
      </div>

      {/* 4. Cevap Yazma Formu - Aydınlık */}
      {showReplyForm && (
        <div className="bg-white rounded-3xl p-8 border border-indigo-100 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
              <h4 className="font-black text-gray-900 uppercase text-sm tracking-widest">Akademik Cevap Yaz</h4>
            </div>
            <button onClick={() => setShowReplyForm(false)} className="bg-gray-50 p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all">
              <Trash2 size={20} />
            </button>
          </div>
          <ReplyForm
            onSubmit={async (val) => {
              await onReplySubmit(val);
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