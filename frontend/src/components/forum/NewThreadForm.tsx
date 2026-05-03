import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, CheckCircle, AlertCircle, Calendar as CalendarIcon, Type, Plus, Trash2 } from 'lucide-react';
import { uploadForumImages, getForumCategories } from '../../api/forum';
import type { ForumCategory } from '../../types/forum';

interface NewThreadFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const NewThreadForm: React.FC<NewThreadFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [topicType, setTopicType] = useState<'text' | 'event'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<ForumCategory[]>([]);

  const [images, setImages] = useState<File[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getForumCategories()
      .then(res => setCategories(res.categories.filter(c => c.is_active)))
      .catch(() => {});
  }, []);

  const MAX_TITLE = 255;
  const MAX_CONTENT = 10000;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles].slice(0, 4)); // max 4 files
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError(`Lütfen bir başlık giriniz.`); return; }
    if (!content.trim()) { setError(`Lütfen içerik detaylarını giriniz.`); return; }
    if (categories.length > 0 && !categoryId) { setError('Lütfen bir kategori seçiniz.'); return; }

    try {
      setUploading(true);
      let uploadedUrls: string[] = [];

      if (images.length > 0) {
        const res = await uploadForumImages(images);
        if (res.success) {
          uploadedUrls = res.urls;
        } else {
          throw new Error('Görseller yüklenemedi.');
        }
      }

      const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

      const payload: any = {
        title: title.trim(),
        content: content.trim(),
        topic_type: topicType,
        ...(categoryId ? { category_id: categoryId } : {}),
      };

      if (topicType === 'event' && eventDate) {
        payload.event_date = new Date(eventDate).toISOString();
      }

      if (tags.length > 0) payload.tags = tags;
      if (uploadedUrls.length > 0) payload.image_urls = uploadedUrls;

      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konu oluşturulamadı');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl shadow-indigo-100/40">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="flex items-center justify-center rounded-xl bg-gray-50 px-3 py-2 text-sm font-bold text-gray-400 transition-all hover:text-indigo-600 hover:bg-indigo-50">
              <ChevronLeft size={18} className="mr-1" />
              Geri
            </button>
            <div>
              <h2 className="tracking-tight text-xl font-black text-gray-900">Gönderi Oluştur</h2>
              <p className="text-xs font-bold text-gray-500">Tartışma, anket veya bir etkinlik başlat.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 flex items-center rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertCircle size={20} className="mr-3 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Tip Seçici */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'text', label: 'Gönderi', icon: <Type size={14} /> },
              { id: 'event', label: 'Etkinlik', icon: <CalendarIcon size={14} /> },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTopicType(t.id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${topicType === t.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {categories.length > 0 && (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                required={categories.length > 0}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-bold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="">Kategori seçin...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Hashtagler (İsteğe Bağlı)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Örn: acil, duyuru, etkinlik (virgülle ayırın)"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-bold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          {topicType === 'event' && (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Etkinlik Tarihi *</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required={topicType === 'event'}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-bold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Başlık *</label>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Gönderini anlatan net bir başlık yaz..."
              className="w-full border-b-2 border-gray-100 bg-gray-50/50 px-4 py-4 text-xl font-black text-gray-900 outline-none transition-all placeholder-gray-300 focus:border-indigo-600"
              maxLength={MAX_TITLE}
              required
            />
          </div>

          {/* FOTOĞRAF ALANI (HER TÜRDE AÇIK) */}
          <div className="space-y-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Görseller (En fazla 4 adet)</label>

            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {images.map((file, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-200 shadow-sm group">
                  <img src={URL.createObjectURL(file)} alt="Önizleme" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {images.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-indigo-200 bg-white text-indigo-400 transition-colors hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50"
                >
                  <Plus size={16} className="mb-1" />
                  <span className="text-[10px] font-bold">Ekle</span>
                </button>
              )}
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">İçerik Detayları *</label>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Düşüncelerini, olayın detaylarını veya sorunu buraya yaz..."
              className="min-h-[160px] w-full rounded-2xl border border-gray-100 bg-gray-50/30 px-5 py-4 text-base font-medium leading-relaxed text-gray-700 outline-none transition-all placeholder-gray-300 focus:border-indigo-500 focus:bg-white"
              maxLength={MAX_CONTENT}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-gray-100 pt-6">
            <button type="button" onClick={onCancel} className="text-xs font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-900">
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={
                uploading ||
                !title.trim() ||
                !content.trim() ||
                (categories.length > 0 && !categoryId)
              }
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isSubmitting || uploading ? 'YÜKLENİYOR...' : <><CheckCircle size={18} /> GÖNDERİYİ PAYLAŞ</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
