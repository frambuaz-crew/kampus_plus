import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';

interface ReplyFormProps {
  onSubmit: (data: { content: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({ 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const MIN_CHAR = 10;
  const MAX_CHAR = 10000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (content.trim().length < MIN_CHAR) {
      setError('Cevap en az 10 karakter olmalı');
      return;
    }

    try {
      await onSubmit({
        content: content.trim(),
      });
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cevap gönderilemedi');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
      {/* Hata Mesajı */}
      {error && (
        <div className="flex items-center p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
          <AlertCircle size={16} className="mr-2 shrink-0" />
          {error}
        </div>
      )}

      {/* Textarea Alanı */}
      <div className="relative">
        <div className="absolute top-3 right-3 text-[10px] font-mono text-gray-500 bg-[#0f1624] px-2 py-1 rounded border border-gray-800">
          {content.length} / {MAX_CHAR}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Cevabınızı buraya yazın..."
          className="w-full px-4 py-4 bg-[#0f1624] border border-[#0f1624] text-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent min-h-[180px] resize-y placeholder-gray-600 transition-all"
          disabled={isSubmitting}
          maxLength={MAX_CHAR}
          required
        />
        <div className="mt-2 text-[10px] text-gray-500 italic">
          En az {MIN_CHAR}, en fazla {MAX_CHAR} karakter.
        </div>
      </div>

      {/* Alt Bölüm: Dosya ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div />

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || content.trim().length < MIN_CHAR}
            className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                <span>Gönder</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};