import React, { useState, useRef } from 'react';

interface NewListingFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const NewListingForm: React.FC<NewListingFormProps> = ({ 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: 'İkinci El'
  });

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Kitap', 'Elektronik', 'Eşya', 'Giyim', 'Hobi', 'Diğer'];
  const conditions = ['Sıfır', 'Az Kullanılmış', 'İkinci El', 'Yıpranmış'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Toplam 3 dosya sınırı
    if (files.length + selectedFiles.length > 3) {
      alert("En fazla 3 adet fotoğraf yükleyebilirsiniz.");
      return;
    }

    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);

    // Önizleme oluşturma
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Bellek sızıntısını önlemek için URL'i temizle
    URL.revokeObjectURL(previews[index]);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ForumPage'deki handleCreateThread mantığı gibi FormData kullanacağız
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('price', formData.price);
    submitData.append('category', formData.category);
    submitData.append('condition', formData.condition);
    
    files.forEach((file) => {
      submitData.append('files', file);
    });

    await onSubmit(submitData);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-w-2xl mx-auto">
      <div className="bg-indigo-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">✨</span> Yeni İlan Oluştur
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Başlık */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">İlan Başlığı *</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Örn: Mühendislik Hesap Makinesi"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>

        {/* Kategori ve Fiyat */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Kategori *</label>
            <select 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none cursor-pointer"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              <option value="">Seçiniz...</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Fiyat (TL) *</label>
            <input
              type="number"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
              placeholder="0.00"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
            />
          </div>
        </div>

        {/* Görsel Yükleme Alanı */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Ürün Fotoğrafları (Max 3)</label>
          <div className="grid grid-cols-4 gap-4">
            {previews.map((src, index) => (
              <div key={index} className="relative h-20 w-20 rounded-lg border overflow-hidden bg-gray-50">
                <img src={src} alt="Önizleme" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md"
                >
                  ×
                </button>
              </div>
            ))}
            
            {files.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-400 transition-colors"
              >
                <span className="text-xl">+</span>
                <span className="text-[10px]">Fotoğraf</span>
              </button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileChange}
          />
          <p className="text-[10px] text-gray-400 mt-2">Kare (1:1) fotoğraflar daha iyi görünür.</p>
        </div>

        {/* Ürün Durumu */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Ürün Durumu</label>
          <div className="flex flex-wrap gap-2">
            {conditions.map(cond => (
              <button
                key={cond}
                type="button"
                onClick={() => setFormData({...formData, condition: cond})}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  formData.condition === cond 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cond}
              </button>
            ))}
          </div>
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Açıklama *</label>
          <textarea
            required
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none resize-none"
            placeholder="Ürünün durumu, teslim yeri vb. detayları yazın..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        {/* Butonlar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 font-medium hover:text-gray-800"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'İlan Yayınlanıyor...' : '✅ İlanı Yayınla'}
          </button>
        </div>
      </form>
    </div>
  );
};