/**
 * Backend'den gelen UTC tarih stringlerini doğru parse eder.
 *
 * Sorun: Python'ın datetime.isoformat() metodu timezone bilgisi olmayan
 * stringleri üretir ("2026-04-21T17:00:00"). JavaScript'te new Date() bu
 * stringi tarayıcının local saatinde (Türkiye için UTC+3) yorumlar, bu da
 * "3 saat önce" gibi yanlış sonuçlar doğurur.
 *
 * Çözüm: String sona 'Z' (UTC) eklenerek kesin UTC yorumu sağlanır.
 */
export const parseUtcDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const isAlreadyUtc = dateStr.endsWith('Z') || dateStr.includes('+');
  return new Date(isAlreadyUtc ? dateStr : dateStr + 'Z');
};
