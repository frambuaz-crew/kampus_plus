import React, { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { getMarketplaceCategories } from '../../api/marketplace';
import type { MarketplaceCategory } from '../../types/marketplace';

interface NewListingFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new',      label: 'Sıfır' },
  { value: 'like_new', label: 'Yeni Gibi' },
  { value: 'good',     label: 'İyi' },
  { value: 'fair',     label: 'Orta' },
];

const inputStyle =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15 transition-all';
const selectStyle =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15 transition-all bg-white appearance-none cursor-pointer';

const ChevronDown = () => (
  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

export const NewListingForm: React.FC<NewListingFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    condition: '',
    visibility: 'public',
  });
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMarketplaceCategories()
      .then(res => setCategories(res.categories.filter(c => c.is_active)))
      .catch(() => {});
  }, []);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > 3) {
      alert('En fazla 3 fotoğraf yükleyebilirsiniz.');
      return;
    }
    setFiles(prev => [...prev, ...selected]);
    setPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', form.title);
    data.append('description', form.description);
    data.append('price', form.price);
    if (form.category_id) data.append('category_id', form.category_id);
    data.append('condition', form.condition || 'good');
    data.append('visibility', form.visibility);
    files.forEach(file => data.append('files', file));
    await onSubmit(data);
  };

  const isValid = form.title.trim() && form.description.trim() && form.price && form.condition;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-1">

      {/* Başlık */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Başlık <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Ürün başlığını girin"
          className={inputStyle}
          autoFocus
        />
      </div>

      {/* Açıklama */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Açıklama <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Ürün hakkında detaylı bilgi verin"
          rows={3}
          className={`${inputStyle} resize-none`}
        />
      </div>

      {/* Fiyat + Kategori */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Fiyat (₺) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.price}
            onChange={e => set('price', e.target.value)}
            placeholder="0"
            className={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Kategori
          </label>
          <div className="relative">
            <select
              value={form.category_id}
              onChange={e => set('category_id', e.target.value)}
              className={selectStyle}
              disabled={categories.length === 0}
            >
              <option value="">
                {categories.length === 0 ? 'Yükleniyor...' : 'Seçin'}
              </option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown />
          </div>
        </div>
      </div>

      {/* Durum */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Durum <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <select
            value={form.condition}
            onChange={e => set('condition', e.target.value)}
            className={selectStyle}
          >
            <option value="">Seçin</option>
            {CONDITIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown />
        </div>
      </div>

      {/* Görünürlük */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Görünürlük
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('visibility', 'public')}
            className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
              form.visibility === 'public'
                ? 'border-[#0ea5e9] bg-sky-50 text-[#0ea5e9]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Herkese Açık
          </button>
          <button
            type="button"
            onClick={() => set('visibility', 'university')}
            className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
              form.visibility === 'university'
                ? 'border-[#0ea5e9] bg-sky-50 text-[#0ea5e9]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Sadece Üniversitem
          </button>
        </div>
      </div>

      {/* Fotoğraflar */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Fotoğraflar (Maks. 3)
        </label>

        {previews.length > 0 && (
          <div className="flex gap-2 mb-3">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-white/90 hover:bg-red-50 text-slate-600 hover:text-red-500 rounded-full flex items-center justify-center shadow transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length < 3 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-200 hover:border-[#0ea5e9] hover:bg-sky-50 rounded-lg py-8 flex flex-col items-center gap-2 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full border border-slate-200 group-hover:border-[#0ea5e9] flex items-center justify-center">
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-[#0ea5e9]" />
            </div>
            <p className="text-sm text-slate-500 group-hover:text-slate-700">
              Fotoğraf yüklemek için tıklayın veya sürükleyin
            </p>
            <p className="text-xs text-slate-400">PNG, JPG (maks. 5MB)</p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex-1 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg text-sm font-semibold transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Yayınlanıyor...' : 'İlanı Yayınla'}
        </button>
      </div>
    </form>
  );
};
