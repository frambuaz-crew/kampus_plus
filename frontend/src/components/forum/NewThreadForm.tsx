import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  AlertCircle,
  Calendar as CalendarIcon,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
} from 'lucide-react';
import { uploadForumImages, getForumCategories } from '../../api/forum';
import type { ForumCategory } from '../../types/forum';
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
  const [topicType, setTopicType] = useState<'text' | 'event'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [imageItems, setImageItems] = useState<ImageEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageItemsRef = useRef<ImageEntry[]>([]);
  imageItemsRef.current = imageItems;

  const MAX_TITLE = 255;
  const MAX_CONTENT = 10000;

  useEffect(() => {
    getForumCategories()
      .then((res) => setCategories(res.categories.filter((c) => c.is_active)))
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

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm ring-1 ring-slate-900/5">
      <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-500" />
      <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button type="button" variant="outline" size="sm" className="shrink-0 border-slate-200" onClick={onCancel}>
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
              Geri
            </Button>
            <div>
              <CardTitle className="text-lg text-slate-900">Yeni gönderi</CardTitle>
              <CardDescription className="mt-1 max-w-lg text-slate-600">
                Tartışma başlığı veya etkinlik duyurusu oluşturun. Yayınlamadan önce başlık ve içeriği kontrol edin.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 px-5 py-6 sm:px-6 sm:py-8">
        {error && (
          <div
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <form id="forum-new-thread-form" onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Gönderi türü</h3>
              <p className="text-xs text-slate-500">İçeriğinize uygun seçeneği işaretleyin.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTopicType('text')}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all',
                  topicType === 'text'
                    ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    topicType === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Gönderi</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    Soru, duyuru veya tartışma metni.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTopicType('event')}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all',
                  topicType === 'event'
                    ? 'border-violet-500 bg-violet-50/60 ring-1 ring-violet-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    topicType === 'event' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <CalendarIcon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Etkinlik</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    Tarih bilgisiyle kampüs etkinliği.
                  </span>
                </span>
              </button>
            </div>
          </section>

          <Separator className="bg-slate-200" />

          {categories.length > 0 && (
            <section className="space-y-2">
              <Label htmlFor="forum-category" className="text-slate-800">
                Kategori <span className="text-red-500">*</span>
              </Label>
              <Select
                value={categoryId || NONE_CAT}
                onValueChange={(v) => setCategoryId(v === NONE_CAT ? '' : v)}
              >
                <SelectTrigger id="forum-category" className="border-slate-200 bg-white">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_CAT}>Kategori seçin…</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>
          )}

          {topicType === 'event' && (
            <section className="space-y-2">
              <Label htmlFor="forum-event-date" className="text-slate-800">
                Etkinlik tarihi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="forum-event-date"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required={topicType === 'event'}
                className="border-slate-200 bg-white font-normal"
              />
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="forum-title" className="text-slate-800">
                Başlık <span className="text-red-500">*</span>
              </Label>
              <span className="text-xs tabular-nums text-slate-400">
                {title.length}/{MAX_TITLE}
              </span>
            </div>
            <Input
              id="forum-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Yaz stajı başvuru takvimi hakkında soru"
              maxLength={MAX_TITLE}
              required
              className="border-slate-200 bg-white text-base font-medium"
            />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="forum-content" className="text-slate-800">
                İçerik <span className="text-red-500">*</span>
              </Label>
              <span className="text-xs tabular-nums text-slate-400">
                {content.length.toLocaleString('tr-TR')} / {MAX_CONTENT.toLocaleString('tr-TR')}
              </span>
            </div>
            <Textarea
              id="forum-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Detayları, bağlamı ve varsa beklentilerinizi yazın."
              maxLength={MAX_CONTENT}
              required
              rows={8}
              className="min-h-[180px] resize-y border-slate-200 bg-white text-sm leading-relaxed"
            />
          </section>

          <section className="space-y-2">
            <Label htmlFor="forum-tags" className="text-slate-800">
              Etiketler <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
            </Label>
            <Input
              id="forum-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Virgülle ayırın: duyuru, staj, kampüs"
              className="border-slate-200 bg-white"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <Label className="text-slate-800">Görseller</Label>
                <p className="mt-0.5 text-xs text-slate-500">En fazla 4 görsel · JPEG, PNG, GIF veya WebP</p>
              </div>
              <span className="text-xs font-medium text-slate-500">{imageItems.length}/4</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {imageItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/85 p-1.5 text-white opacity-0 shadow transition-opacity hover:bg-slate-900 group-hover:opacity-100"
                    aria-label="Görseli kaldır"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {imageItems.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
                >
                  <ImagePlus className="h-5 w-5" aria-hidden />
                  <span className="text-xs font-medium">Yükle</span>
                </button>
              )}
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageChange}
            />
          </section>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
        <Button type="button" variant="outline" className="w-full border-slate-200 sm:w-auto" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button
          type="submit"
          form="forum-new-thread-form"
          disabled={!canSubmit}
          className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:min-w-[9rem]"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              {uploading ? 'Yükleniyor…' : 'Yayınlanıyor…'}
            </>
          ) : (
            'Yayınla'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
