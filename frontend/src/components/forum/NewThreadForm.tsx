import React, { useState, useMemo } from 'react';
import { X, Paperclip, CheckCircle, AlertCircle, Info, Building2, GraduationCap, Users } from 'lucide-react';
import type { Category } from '../../types/forum';
import { useAuth } from '../../hooks/useAuth';

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
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<'university' | 'department' | 'general'>('university');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Karakter Sınırları
  const MIN_TITLE = 10;
  const MAX_TITLE = 200;
  const MIN_CONTENT = 20;
  const MAX_CONTENT = 10000;

  const targetCategory = useMemo(() => {
    if (selectedType === 'university') {
      return categories.find(c => c.name === user?.university && c.category_type === 'university');
    }
    if (selectedType === 'department') {
      return categories.find(c => c.name === user?.department?.name && c.category_type === 'department');
    }
    return categories.find(c => c.category_type === 'general');
  }, [selectedType, categories, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!targetCategory) {
      setError('Seçilen hedef için uygun kategori bulunamadı.');
      return;
    }
    if (title.length < MIN_TITLE) return;
    if (content.length < MIN_CONTENT) return;

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category_id: targetCategory.id,
        tags,
        files,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konu oluşturulamadı');
    }
  };

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
      if (!tags.includes(tag) && tags.length < 5) {
        setTags([...tags, tag]);
        setTagInput('');
      }
    }
  };

  // Dosya Seçme ve Limit Kontrolü
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 3) {
      setError('En fazla 3 dosya ekleyebilirsiniz.');
      return;
    }
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl shadow-indigo-100/40 overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
      <div className="p-10 lg:p-14">
        
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Yeni Bir Tartışma Başlat</h2>
            <p className="text-gray-500 font-bold mt-2">Düşüncelerini akademik toplulukla paylaş.</p>
          </div>
          <button onClick={onCancel} className="bg-gray-50 p-4 rounded-full text-gray-400 hover:text-red-500 transition-all">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-red-700 text-sm font-bold">
            <AlertCircle size={20} className="mr-3 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          
          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Paylaşım Hedefi Seçin</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectionCard 
                active={selectedType === 'university'}
                onClick={() => setSelectedType('university')}
                icon={<Building2 size={24} />}
                title="Kampüsüm"
                desc={user?.university || 'Kendi Üniversiten'}
                color="indigo"
              />
              <SelectionCard 
                active={selectedType === 'department'}
                onClick={() => setSelectedType('department')}
                icon={<GraduationCap size={24} />}
                title="Bölümdaşlarım"
                desc={user?.department?.name || 'Kendi Bölümün'}
                color="emerald"
              />
              <SelectionCard 
                active={selectedType === 'general'}
                onClick={() => setSelectedType('general')}
                icon={<Users size={24} />}
                title="Tüm Kampüs+"
                desc="Genel Tartışma & Pazar"
                color="amber"
              />
            </div>
          </div>

          {/* Başlık Girişi + Sayaç */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Başlık *</label>
              <span className={`text-xs font-bold ${title.length < MIN_TITLE ? 'text-red-500' : 'text-indigo-600'}`}>
                {title.length} / {MAX_TITLE}
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Konuyu anlatan çarpıcı bir başlık..."
              className={`w-full bg-gray-50/50 border-b-2 text-2xl font-black px-6 py-6 outline-none transition-all placeholder-gray-300 ${title.length > 0 && title.length < MIN_TITLE ? 'border-red-500' : 'border-gray-100 focus:border-indigo-600'}`}
              maxLength={MAX_TITLE}
              required
            />
          </div>

          {/* İçerik & Sayaç */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">İçerik *</label>
              <span className={`text-xs font-bold ${content.length < MIN_CONTENT ? 'text-red-500' : 'text-indigo-600'}`}>
                {content.length} / {MAX_CONTENT}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tartışmayı başlatacak detayları buraya yaz... (Markdown desteklenir)"
              className={`w-full bg-gray-50/30 border text-gray-700 px-8 py-8 rounded-[2rem] outline-none transition-all min-h-[350px] text-lg leading-relaxed placeholder-gray-300 font-medium ${content.length > 0 && content.length < MIN_CONTENT ? 'border-red-500' : 'border-gray-100 focus:border-indigo-500'}`}
              maxLength={MAX_CONTENT}
              required
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-4">
               <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Etiketler</label>
               <input
                 type="text"
                 value={tagInput}
                 onChange={(e) => setTagInput(e.target.value)}
                 onKeyDown={handleTagAdd}
                 placeholder="Örn: #vize, #staj..."
                 className="w-full bg-white border border-gray-200 px-6 py-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold"
               />
               <div className="flex flex-wrap gap-2">
                 {tags.map(tag => (
                   <span key={tag} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase">#{tag}</span>
                 ))}
               </div>
             </div>

             {/* Dosya Ekleme ve Liste Alanı */}
             <div className="space-y-4">
               <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Ekler (Maks. 3)</label>
               <label className={`flex items-center justify-center gap-4 w-full h-16 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all ${files.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                 <Paperclip size={20} className="text-gray-400" />
                 <span className="text-sm font-bold text-gray-500">{files.length >= 3 ? 'Sınıra ulaşıldı' : 'Dosya yüklemek için tıkla'}</span>
                 <input type="file" multiple className="hidden" onChange={handleFileChange} disabled={files.length >= 3} />
               </label>
               
               {/* Eklenen Dosyaların Listesi */}
               <div className="space-y-2 mt-4">
                 {files.map((file, index) => (
                   <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in">
                     <div className="flex items-center space-x-3 overflow-hidden">
                       <Paperclip size={14} className="text-indigo-500 shrink-0" />
                       <span className="text-xs font-bold text-gray-700 truncate">{file.name}</span>
                       <span className="text-[10px] text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                     </div>
                     <button type="button" onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                       <X size={16} />
                     </button>
                   </div>
                 ))}
               </div>
             </div>
          </div>

          <div className="flex items-center justify-end gap-6 pt-10 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="text-sm font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">Vazgeç</button>
            <button
              type="submit"
              disabled={isSubmitting || title.length < MIN_TITLE || content.length < MIN_CONTENT}
              className="px-14 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 flex items-center gap-3"
            >
              {isSubmitting ? 'YAYINLANIYOR...' : <><CheckCircle size={22} /> KONUYU YAYINLA</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SelectionCard = ({ active, onClick, icon, title, desc, color }: any) => {
  const colors = {
    indigo: 'border-indigo-500 bg-indigo-50/50 text-indigo-600',
    emerald: 'border-emerald-500 bg-emerald-50/50 text-emerald-600',
    amber: 'border-amber-500 bg-amber-50/50 text-amber-600'
  }[color as 'indigo' | 'emerald' | 'amber'];

  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${active ? colors : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}`}
    >
      <div className={`mb-4 ${active ? 'text-current' : 'text-gray-400'}`}>{icon}</div>
      <div className={`font-black text-lg ${active ? 'text-current' : 'text-gray-900'}`}>{title}</div>
      <div className={`text-xs font-bold mt-1 truncate ${active ? 'text-current opacity-70' : 'text-gray-400'}`}>{desc}</div>
    </div>
  );
};