import React, { useState } from 'react';
import { Paperclip, X, Send, AlertCircle, Info } from 'lucide-react';

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

  const MAX_CHAR = 10000; // Dökümandaki karakter sınırı

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (content.length < 2) {
      setError('Cevap çok kısa');
      return;
    }

    // Mention tespiti (@kullanıcı)
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
    
    // Validasyon: Max 10MB ve Max 3 dosya
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
    e.target.value = ''; // Reset input
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
          placeholder="Cevabınızı buraya yazın... (Markdown ve @mention desteklenir)"
          className="w-full px-4 py-4 bg-[#0f1624] border border-[#0f1624] text-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent min-h-[180px] resize-y placeholder-gray-600 transition-all"
          disabled={isSubmitting}
          maxLength={MAX_CHAR}
          required
        />
        <div className="flex items-center mt-2 text-[10px] text-gray-500 space-x-3 italic">
           <span className="flex items-center"><Info size={10} className="mr-1" /> **kalın**</span>
           <span>*italik*</span>
           <span>[link](url)</span>
           <span>@kullanıcı</span>
        </div>
      </div>

      {/* Alt Bölüm: Dosya ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex flex-col space-y-2">
          {/* Gizli Dosya Inputu */}
          <label className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${files.length >= 3 || isSubmitting ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-[#16213e] text-indigo-400 hover:bg-[#1a2744] border border-indigo-500/20'}`}>
            <Paperclip size={18} />
            <span className="text-sm font-bold">Dosya Ekle</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={isSubmitting || files.length >= 3}
            />
          </label>
          <span className="text-[10px] text-gray-500">Maks. 3 dosya (Her biri 10MB)</span>
        </div>

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
            disabled={isSubmitting || content.length < 2}
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

      {/* Eklenen Dosyaların Listesi */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-[#0f1624] border border-indigo-500/10 rounded-lg group">
              <div className="flex items-center space-x-2 overflow-hidden">
                <div className="p-1.5 bg-[#16213e] rounded">
                   <Paperclip size={12} className="text-indigo-400" />
                </div>
                <span className="text-xs text-gray-300 truncate">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="text-gray-500 hover:text-red-400 p-1"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
};