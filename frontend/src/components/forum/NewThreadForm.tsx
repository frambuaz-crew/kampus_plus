import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  AlertCircle,
  Calendar as CalendarIcon,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
  Eye,
  Settings2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { uploadForumImages, getForumCategories, getForumStats } from '../../api/forum';
import type { ForumCategory, ForumStats } from '../../types/forum';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';
import { useAuth } from '../../hooks/useAuth';

interface NewThreadFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const NONE_CAT = '__none__';

type ImageEntry = { id: string; file: File; url: string };

export const NewThreadForm: React.FC<NewThreadFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const { user } = useAuth();
  const [topicType, setTopicType] = useState<'text' | 'event'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [imageItems, setImageItems] = useState<ImageEntry[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageItemsRef = useRef<ImageEntry[]>([]);
  imageItemsRef.current = imageItems;

  const MAX_TITLE = 255;
  const MAX_CONTENT = 10000;

  useEffect(() => {
    getForumCategories()
      .then((res) => setCategories(res.categories.filter((c) => c.is_active)))
      .catch(() => {});

    getForumStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(
    () => () => {
      imageItemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    },
    []
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImageItems((prev) => {
        const next = [...prev];
        for (const file of newFiles) {
          if (next.length >= 4) break;
          next.push({
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
            file,
            url: URL.createObjectURL(file),
          });
        }
        return next;
      });
    }
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    setImageItems((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Lütfen bir başlık girin.');
      return;
    }
    if (!content.trim()) {
      setError('Lütfen içerik girin.');
      return;
    }
    if (categories.length > 0 && !categoryId) {
      setError('Lütfen bir kategori seçin.');
      return;
    }

    try {
      setUploading(true);
      let uploadedUrls: string[] = [];

      const files = imageItems.map((x) => x.file);
      if (files.length > 0) {
        const res = await uploadForumImages(files);
        if (res.success) {
          uploadedUrls = res.urls;
        } else {
          throw new Error('Görseller yüklenemedi.');
        }
      }

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const payload: Record<string, unknown> = {
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
      setError(err instanceof Error ? err.message : 'Konu oluşturulamadı.');
    } finally {
      setUploading(false);
    }
  };

  const busy = isSubmitting || uploading;
  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    (categories.length === 0 || !!categoryId) &&
    !busy;

  const currentCategoryName = categories.find(c => c.id === categoryId)?.name || 'Kategori Seçilmedi';

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-center max-w-7xl mx-auto">
      {/* Sol Panel: Form */}
      <div className="flex-1 w-full max-w-3xl">
        <Card className="overflow-hidden border-slate-200 shadow-xl ring-1 ring-slate-900/5 bg-white">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-500" />
          
          <CardHeader className="border-b border-slate-50 bg-white px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-slate-100" 
                  onClick={onCancel}
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                </Button>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    Yeni {topicType === 'event' ? 'Etkinlik' : 'Gönderi'}
                  </CardTitle>
                  <CardDescription className="text-slate-500 font-medium">
                    Fikirlerinizi toplulukla paylaşın
                  </CardDescription>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    !previewMode ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Settings2 size={14} /> Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    previewMode ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Eye size={14} /> Önizleme
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {previewMode ? (
              <div className="p-8 bg-slate-50/50 min-h-[500px] animate-in fade-in duration-300">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Mock Thread View for Preview */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                          {user?.first_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{user?.first_name} {user?.last_name}</p>
                          <p className="text-xs text-slate-500">{currentCategoryName} • Az önce</p>
                        </div>
                      </div>
                      
                      <h2 className="text-2xl font-black text-slate-900 mb-4 leading-tight">
                        {title || 'Gönderi Başlığı'}
                      </h2>
                      
                      {topicType === 'event' && eventDate && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 text-violet-700 rounded-lg mb-4 text-sm font-bold w-fit">
                          <CalendarIcon size={16} />
                          {new Date(eventDate).toLocaleString('tr-TR')}
                        </div>
                      )}

                      <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mb-6">
                        {content || 'Gönderi içeriği burada görünecek...'}
                      </div>

                      {imageItems.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-6">
                          {imageItems.map(img => (
                            <img key={img.id} src={img.url} className="rounded-xl aspect-video object-cover border border-slate-100" />
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {tagsInput.split(',').filter(t => t.trim()).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-8 space-y-8 animate-in slide-in-from-left-2 duration-300">
                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <form id="forum-new-thread-form" onSubmit={handleSubmit} className="space-y-8">
                  {/* Tür Seçimi */}
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-slate-800 uppercase tracking-widest">Gönderi Türü</Label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setTopicType('text')}
                        className={cn(
                          'flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all group/btn',
                          topicType === 'text'
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all',
                          topicType === 'text' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500'
                        )}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Normal Gönderi</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">Soru, fikir veya duyuru</p>
                        </div>
                        {topicType === 'text' && <CheckCircle2 className="ml-auto text-indigo-600" size={20} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setTopicType('event')}
                        className={cn(
                          'flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all group/btn',
                          topicType === 'event'
                            ? 'border-violet-600 bg-violet-50/50 shadow-md shadow-violet-100'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all',
                          topicType === 'event' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-slate-100 text-slate-500'
                        )}>
                          <CalendarIcon size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Etkinlik</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">Tarihli kampüs faaliyeti</p>
                        </div>
                        {topicType === 'event' && <CheckCircle2 className="ml-auto text-violet-600" size={20} />}
                      </button>
                    </div>
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="forum-category" className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        Kategori <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={categoryId || NONE_CAT}
                        onValueChange={(v) => setCategoryId(v === NONE_CAT ? '' : v)}
                      >
                        <SelectTrigger id="forum-category" className="h-12 border-slate-200 bg-slate-50/30 rounded-xl focus:ring-indigo-500 transition-all">
                          <SelectValue placeholder="Bir kategori seçin" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                          <SelectItem value={NONE_CAT}>Kategori seçilmedi</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {topicType === 'event' && (
                      <div className="space-y-2 animate-in zoom-in-95 duration-200">
                        <Label htmlFor="forum-event-date" className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                          Etkinlik Tarihi <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="forum-event-date"
                          type="datetime-local"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          required={topicType === 'event'}
                          className="h-12 border-slate-200 bg-slate-50/30 rounded-xl focus:ring-indigo-500 transition-all font-medium"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="forum-title" className="text-sm font-bold text-slate-800 uppercase tracking-widest">Başlık <span className="text-red-500">*</span></Label>
                      <span className="text-[10px] font-bold text-slate-400">{title.length}/{MAX_TITLE}</span>
                    </div>
                    <Input
                      id="forum-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Dikkat çekici bir başlık girin..."
                      maxLength={MAX_TITLE}
                      required
                      className="h-14 border-slate-200 bg-slate-50/30 rounded-xl focus:ring-indigo-500 transition-all text-lg font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="forum-content" className="text-sm font-bold text-slate-800 uppercase tracking-widest">İçerik <span className="text-red-500">*</span></Label>
                      <span className="text-[10px] font-bold text-slate-400">{content.length.toLocaleString('tr-TR')} / {MAX_CONTENT.toLocaleString('tr-TR')}</span>
                    </div>
                    <Textarea
                      id="forum-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Düşüncelerinizi buraya yazın..."
                      maxLength={MAX_CONTENT}
                      required
                      className="min-h-[220px] border-slate-200 bg-slate-50/30 rounded-2xl focus:ring-indigo-500 transition-all text-base leading-relaxed p-5"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-800 uppercase tracking-widest">Etiketler</Label>
                      <Input
                        id="forum-tags"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="Örn: sınav, kütüphane, burs"
                        className="h-12 border-slate-200 bg-slate-50/30 rounded-xl focus:ring-indigo-500 transition-all"
                      />
                      <p className="text-[10px] font-medium text-slate-400">Etiketleri virgülle ayırın.</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-800 uppercase tracking-widest">Görseller</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {imageItems.map((item) => (
                          <div
                            key={item.id}
                            className="group relative aspect-square overflow-hidden rounded-xl border-2 border-slate-100 bg-white shadow-sm"
                          >
                            <img src={item.url} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(item.id)}
                              className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-lg transition-opacity hover:bg-red-600 group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {imageItems.length < 4 && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/30 text-slate-400 transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 shadow-inner"
                          >
                            <ImagePlus size={20} />
                            <span className="text-[10px] font-bold">EKLE</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                </form>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-slate-50 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-slate-500 font-bold sm:w-auto hover:bg-slate-100" 
              onClick={onCancel}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              form="forum-new-thread-form"
              disabled={!canSubmit || busy}
              className="w-full bg-indigo-600 text-white font-bold h-12 px-10 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all sm:w-auto"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Yükleniyor...' : 'Yayınlanıyor...'}
                </>
              ) : (
                'Yayınla'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Sağ Panel: Rehber ve Bilgi */}
      <div className="w-full lg:w-80 flex flex-col gap-6 sticky top-24">
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-2xl">
          <div className="bg-indigo-600 p-4 flex items-center gap-3">
            <Info className="text-white" size={20} />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Gönderi Rehberi</h4>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex shrink-0 items-center justify-center text-[10px] font-black border border-emerald-100">1</div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">Başlığınızın kısa ve öz olmasına dikkat edin.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex shrink-0 items-center justify-center text-[10px] font-black border border-emerald-100">2</div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">İlgili kategoriyi seçerek doğru kitleye ulaşın.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex shrink-0 items-center justify-center text-[10px] font-black border border-emerald-100">3</div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">Etiket kullanarak konunun keşfedilmesini kolaylaştırın.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex shrink-0 items-center justify-center text-[10px] font-black border border-emerald-100">4</div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">Görsel eklemek gönderinin etkileşimini artırır.</p>
            </div>
            
            <Separator className="bg-slate-50" />
            
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Topluluk Kuralları</p>
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                Lütfen saygı çerçevesinde tartışın ve reklam içerikli paylaşımlardan kaçının.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Küçük bir reklam veya istatistik widget'ı */}
        <div className="relative group overflow-hidden rounded-2xl bg-indigo-900 p-6 text-white shadow-xl shadow-indigo-100">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500" />
          <div className="relative z-10">
            <h5 className="text-sm font-black mb-2 leading-tight">Kampüste Neler Oluyor?</h5>
            <p className="text-[11px] text-indigo-200 mb-4 font-medium">Hemen bir konu aç ve topluluğun nabzını tut!</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                {stats ? `${stats.total_users} KAMPÜS ÜYESİ` : 'YÜKLENİYOR...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
