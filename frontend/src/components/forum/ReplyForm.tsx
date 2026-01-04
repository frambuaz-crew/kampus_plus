/**
 * ReplyForm Component
 * 
 * Spec: 005-forum-page/spec.md
 * 
 * Cevap yazma formu:
 * - İçerik (markdown destekli, zorunlu)
 * - Dosya ekleme (max 3 dosya, max 10MB)
 * - Mention (@kullanıcı) desteği
 * 
 * NOT: Tüm kullanıcılar profilli (anonim paylaşım yok)
 */

import React, { useState } from 'react';

interface ReplyFormProps {
  onSubmit: (data: {
    content: string;
    files: File[];
    mentions?: string[];
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({ 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError('Cevap boş olamaz');
      return;
    }

    // Extract mentions from content (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions = Array.from(content.matchAll(mentionRegex), m => m[1]);

    try {
      await onSubmit({
        content: content.trim(),
        files,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      setContent('');
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cevap gönderilemedi');
    }
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="reply-content" className="block text-sm font-medium text-gray-700 mb-2">
          Cevabınız * (Markdown destekli, @kullanıcı ile mention yapabilirsiniz)
        </label>
        <textarea
          id="reply-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Cevabınızı yazın... (Markdown destekli, @kullanıcı ile mention yapabilirsiniz)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[150px] resize-y"
          disabled={isSubmitting}
          required
          maxLength={10000}
        />
      </div>

      <div>
        <label htmlFor="reply-files" className="block text-sm font-medium text-gray-700 mb-2">
          Dosya Ekle (max 3 dosya, max 10MB)
        </label>
        <input
          id="reply-files"
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

      <div className="flex justify-end space-x-2">
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
          disabled={isSubmitting || !content.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Gönderiliyor...' : '💬 Cevap Gönder'}
        </button>
      </div>
    </form>
  );
};
