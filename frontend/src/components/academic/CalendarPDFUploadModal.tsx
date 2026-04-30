import React, { useRef, useState } from 'react';
import {
  uploadCalendarPDF,
  type CalendarUploadResult,
} from '../../api/academic';
import { CascadingInstitutionSelect } from '../institution/CascadingInstitutionSelect';
import { useAuth } from '../../hooks/useAuth';

interface CalendarPDFUploadModalProps {
  defaultUniversity?: string;
  defaultAcademicYear?: string;
  onClose: () => void;
  onComplete: () => void;
}

const ACADEMIC_YEAR_OPTIONS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'] as const;

export const CalendarPDFUploadModal: React.FC<CalendarPDFUploadModalProps> = ({
  defaultUniversity = '',
  defaultAcademicYear = '',
  onClose,
  onComplete,
}) => {
  const { user } = useAuth();
  const isLockedUniversityRole = user?.role === 'university_admin';
  const resolvedUniversityName = user?.university || defaultUniversity || '';
  const resolvedUniversityId = user?.university_id || undefined;
  // Lock by name when user is a university admin and has a university name
  const lockedUniversityName = isLockedUniversityRole && resolvedUniversityName ? resolvedUniversityName : undefined;
  const initialUniversityId = isLockedUniversityRole && resolvedUniversityId ? resolvedUniversityId : undefined;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [universityName, setUniversityName] = useState(
    isLockedUniversityRole ? resolvedUniversityName : defaultUniversity
  );
  const [academicYear, setAcademicYear] = useState(
    ACADEMIC_YEAR_OPTIONS.includes(defaultAcademicYear as (typeof ACADEMIC_YEAR_OPTIONS)[number])
      ? defaultAcademicYear
      : ''
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalendarUploadResult | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Yalnızca PDF dosyası seçebilirsin.');
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!file) { setError('Lütfen bir PDF dosyası seç.'); return; }
    if (!universityName.trim() || !academicYear) {
      setError('Lütfen üniversite seçin ve akademik yıl seçin.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await uploadCalendarPDF({
        file,
        university: universityName.trim(),
        academic_year: academicYear,
      });
      setResult(res);
      setIsSuccess(true);
    } catch {
      setError('Yükleme sırasında hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📅 PDF'den Akademik Takvim Yükle</h2>
            <p className="text-sm text-gray-500 mt-0.5">Gemini AI ile otomatik ayrıştırılır</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* PDF Dosya Seçimi */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">PDF Dosyası *</label>
            <div
              onClick={() => !isSuccess && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                isSuccess
                  ? 'border-green-300 bg-green-50 cursor-default'
                  : file
                  ? 'border-indigo-400 bg-indigo-50 cursor-pointer'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-indigo-700">
                  <span className="text-xl">📄</span>
                  <span className="text-sm font-semibold truncate max-w-[240px]">{file.name}</span>
                  {!isSuccess && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                    >×</button>
                  )}
                </div>
              ) : (
                <div className="text-gray-400">
                  <p className="text-2xl mb-1">⬆️</p>
                  <p className="text-sm font-medium">PDF seç veya buraya sürükle</p>
                  <p className="text-xs mt-0.5">Metin içeren PDF, maks. 10 sayfa</p>
                </div>
              )}
            </div>
          </div>

          {/* Üniversite */}
          <CascadingInstitutionSelect
            showDepartment={false}
            initialUniversityName={defaultUniversity}
            initialUniversityId={initialUniversityId}
            lockedUniversity={lockedUniversityName}
            onChange={(sel) => {
              if (sel.universityName !== undefined) setUniversityName(sel.universityName);
            }}
          />
          {isLockedUniversityRole && (
            <p className="text-xs text-gray-400 -mt-1">Üniversite yetkilisi olarak veriler kendi üniversitenize kaydedilecek.</p>
          )}

          {/* Akademik Yıl */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Akademik Yıl *</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              disabled={isSuccess}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 focus:bg-white transition-colors appearance-none cursor-pointer disabled:opacity-60"
            >
              <option value="">— Akademik yıl seçin —</option>
              {ACADEMIC_YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {error && !isSuccess && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <span className="flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
              <span className="flex-shrink-0 text-lg">✅</span>
              <div>
                <p className="font-semibold">PDF başarıyla ayrıştırıldı ve sisteme eklendi!</p>
                {result && (
                  <p className="text-green-600 text-xs mt-0.5">{result.events_parsed} etkinlik eklendi</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {isSuccess ? (
              <button
                type="button"
                onClick={onComplete}
                className="flex-1 py-2.5 text-white font-semibold bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
              >
                Kapat
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                İptal
              </button>
            )}
            <button
              type="submit"
              disabled={uploading || !file || isSuccess}
              className={`flex-1 py-2.5 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                isSuccess
                  ? 'bg-green-600 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'
              }`}
            >
              {isSuccess ? (
                'Tamamlandı'
              ) : uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI analiz ediyor...
                </>
              ) : (
                '📤 Yükle ve Analiz Et'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
