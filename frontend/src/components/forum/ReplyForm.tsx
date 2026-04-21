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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) return;

    try {
      await onSubmit({ content: content.trim() });
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cevap gönderilemedi');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in duration-200">
      {error && (
        <div className="mb-3 text-sm text-red-500 flex items-center gap-2 bg-red-50 p-2 rounded-lg">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Yanıtını buraya yaz..."
          className="flex-1 max-h-40 min-h-[44px] py-2.5 px-4 bg-white border border-gray-200 text-sm text-gray-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none shadow-sm transition-all"
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (content.trim()) handleSubmit(e as any);
            }
          }}
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="shrink-0 w-11 h-11 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={16} className="-ml-0.5" />
          )}
        </button>
      </div>
      <div className="text-[10px] text-gray-400 font-medium px-4 mt-1.5 flex justify-between tracking-wide">
        <span>Enter ile gönder · Shift+Enter yeni satır</span>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">İptal</button>
      </div>
    </form>
  );
};