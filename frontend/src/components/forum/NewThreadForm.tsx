import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import type { Category } from '../../types/forum';

interface NewThreadFormProps {
  categories: Category[];
  onSubmit: (data: {
    title: string;
    content: string;
    category_id: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const NewThreadForm: React.FC<NewThreadFormProps> = ({
  categories,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const MIN_TITLE = 10;
  const MAX_TITLE = 255;
  const MIN_CONTENT = 20;
  const MAX_CONTENT = 10000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError('Lütfen bir kategori seçin.');
      return;
    }

    if (title.trim().length < MIN_TITLE) {
      setError(`Başlık en az ${MIN_TITLE} karakter olmalı.`);
      return;
    }

    if (content.trim().length < MIN_CONTENT) {
      setError(`İçerik en az ${MIN_CONTENT} karakter olmalı.`);
      return;
    }

    try {
      await onSubmit({
        category_id: categoryId,
        title: title.trim(),
        content: content.trim(),
      });
      setTitle('');
      setContent('');
      setCategoryId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konu oluşturulamadı');
    }
  };

  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl shadow-indigo-100/40">
      <div className="p-10 lg:p-14">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="tracking-tighter text-4xl font-black text-gray-900">Yeni Bir Tartışma Başlat</h2>
            <p className="mt-2 font-bold text-gray-500">Kategorini seç, başlığını yaz ve paylaş.</p>
          </div>
          <button onClick={onCancel} className="rounded-full bg-gray-50 p-4 text-gray-400 transition-all hover:text-red-500">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-8 flex items-center rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertCircle size={20} className="mr-3 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="ml-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Kategori *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-4 font-bold text-gray-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              required
            >
              <option value="">Kategori seçin...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon ? `${category.icon} ` : ''}
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Başlık *</label>
              <span className={`text-xs font-bold ${title.length < MIN_TITLE ? 'text-red-500' : 'text-indigo-600'}`}>
                {title.length}/{MAX_TITLE}
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Konuyu anlatan net bir başlık yaz..."
              className="w-full border-b-2 border-gray-100 bg-gray-50/50 px-6 py-6 text-2xl font-black text-gray-900 outline-none transition-all placeholder-gray-300 focus:border-indigo-600"
              maxLength={MAX_TITLE}
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">İçerik *</label>
              <span className={`text-xs font-bold ${content.length < MIN_CONTENT ? 'text-red-500' : 'text-indigo-600'}`}>
                {content.length}/{MAX_CONTENT}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tartışmayı başlatacak detayları buraya yaz..."
              className="min-h-[320px] w-full rounded-[2rem] border border-gray-100 bg-gray-50/30 px-8 py-8 text-lg font-medium leading-relaxed text-gray-700 outline-none transition-all placeholder-gray-300 focus:border-indigo-500"
              maxLength={MAX_CONTENT}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-6 border-t border-gray-100 pt-10">
            <button type="button" onClick={onCancel} className="text-sm font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-900">
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !categoryId ||
                title.trim().length < MIN_TITLE ||
                content.trim().length < MIN_CONTENT
              }
              className="flex items-center gap-3 rounded-[1.5rem] bg-indigo-600 px-14 py-5 text-lg font-black text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'YAYINLANIYOR...' : <><CheckCircle size={22} /> KONUYU YAYINLA</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
