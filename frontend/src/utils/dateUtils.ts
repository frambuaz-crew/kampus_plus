/**
 * Tarih stringini güvenli biçimde Date'e çevirir.
 *
 * Forum ve diğer kullanıcı içeriklerinde backend bazen timezone bilgisi
 * olmayan ISO stringler döndürebiliyor (örn. "2026-05-17T12:30:00").
 * Bu format tarayıcıda local saat olarak yorumlanır; bu da yeni içeriklerin
 * "3 saat önce" gibi geriye kaymasına yol açabilir.
 *
 * Bu yardımcı, mevcut timezone bilgisini korur; timezone yoksa tarayıcının
 * doğal local yorumunu kullanır.
 */
export const parseUtcDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  return new Date(dateStr);
};

export const formatRelativeTimeTr = (dateStr: string, now = new Date()): string => {
  if (!dateStr) return '';

  const date = parseUtcDate(dateStr);
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(date.getTime())) return '';
  if (diffSeconds < 60) return 'Az önce';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} dk önce`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} sa önce`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} gün önce`;

  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: diffSeconds >= 2592000 ? 'numeric' : undefined,
  });
};
