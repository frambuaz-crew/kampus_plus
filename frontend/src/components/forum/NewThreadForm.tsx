/**
 * NewThreadForm Component
 * 
 * Spec: 005-forum-page/spec.md
 * 
 * Yeni konu açma formu:
 * - Başlık (zorunlu)
 * - İçerik (markdown destekli, zorunlu)
 * - Kategori seçimi (zorunlu)
 * - Etiketler (opsiyonel, autocomplete)
 * - Dosya ekleme (max 3 dosya, max 10MB)
 * 
 * NOT: Tüm kullanıcılar profilli (anonim paylaşım yok)
 */

import React, { useState } from 'react';
import type { Category } from '../../types/forum';

interface NewThreadFormProps {
  categories: Category[];
  onSubmit: (data: {
    title: string;
    content: string;
    category_id: string;
    tags: string[];
    files: File[];
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const NewThreadForm: React.FC<NewThreadFormProps> = ({ 
  categories,
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Başlık zorunludur');
      return;
    }

    if (!content.trim()) {
      setError('İçerik zorunludur');
      return;
    }

    if (!categoryId) {
      setError('Kategori seçimi zorunludur');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category_id: categoryId,
        tags,
        files,
      });
      // Reset form
      setTitle('');
      setContent('');
      setCategoryId('');
      setTags([]);
      setTagInput('');
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konu oluşturulamadı');
    }
  };

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!tags.includes(tag) && tags.length < 10) {
        setTags([...tags, tag]);
        setTagInput('');
      }
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} 10MB'dan büyük olamaz`);
        return false;
      }
      return true;
    });

    if (files.length + validFiles.length > 3) {
      setError('En fazla 3 dosya ekleyebilirsiniz');
      return;
    }

    setFiles([...files, ...validFiles]);
  };

  const handleFileRemove = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        ➕ Yeni Konu Aç
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="thread-title" className="block text-sm font-medium text-gray-700 mb-2">
            Başlık *
          </label>
          <input
            id="thread-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Konu başlığını yazın..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            maxLength={200}
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="thread-category" className="block text-sm font-medium text-gray-700 mb-2">
            Kategori *
          </label>
          <select
            id="thread-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isSubmitting}
            required
          >
            <option value="">Kategori seçin...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="thread-content" className="block text-sm font-medium text-gray-700 mb-2">
            İçerik * (Markdown destekli)
          </label>
          <textarea
            id="thread-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Konu içeriğini yazın... (Markdown destekli)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[200px] resize-y"
            required
            disabled={isSubmitting}
            maxLength={10000}
          />
        </div>

        <div>
          <label htmlFor="thread-tags" className="block text-sm font-medium text-gray-700 mb-2">
            Etiketler (opsiyonel, Enter ile ekle)
          </label>
          <input
            id="thread-tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagAdd}
            placeholder="Etiket ekle (Enter)..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleTagRemove(tag)}
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="thread-files" className="block text-sm font-medium text-gray-700 mb-2">
            Dosya Ekle (max 3 dosya, max 10MB)
          </label>
          <input
            id="thread-files"
            type="file"
            multiple
            onChange={handleFileSelect}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isSubmitting || files.length >= 3}
          />
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={() => handleFileRemove(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim() || !categoryId}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Oluşturuluyor...' : '✅ Konu Oluştur'}
          </button>
        </div>
      </div>
    </form>
  );
};
