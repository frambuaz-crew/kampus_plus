/**
 * CascadingInstitutionSelect
 *
 * University → Faculty → Department basamaklı dropdown bileşeni.
 *
 * Props:
 *  - showDepartment: false ise Fakülte + Bölüm dropdown'ları gösterilmez
 *    (Akademik Takvim modalı sadece üniversite seçer).
 *  - onChange: seçilen değerler değiştiğinde çağrılır.
 *  - initialUniversityName: metin olarak seçili üniversiteyi API'den bulmak için.
 */

import React, { useEffect, useState } from 'react';
import {
  getDepartments,
  getFaculties,
  getUniversities,
  type DepartmentItem,
  type FacultyItem,
  type UniversityItem,
} from '../../api/institutions';

export interface InstitutionSelection {
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
  departmentId: string;
  departmentName: string;
}

interface Props {
  showDepartment?: boolean;
  initialUniversityName?: string;
  initialUniversityId?: string;
  initialFacultyId?: string;
  initialDepartmentId?: string;
  /** Ayarlandığında üniversite dropdown'ı gizlenir, değer kilitli gösterilir. */
  lockedUniversity?: string;
  onChange: (selection: Partial<InstitutionSelection>) => void;
}

const SELECT_CLS =
  'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 ' +
  'focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 ' +
  'focus:bg-white transition-colors appearance-none cursor-pointer ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const CascadingInstitutionSelect: React.FC<Props> = ({
  showDepartment = true,
  initialUniversityName = '',
  initialUniversityId = '',
  initialFacultyId = '',
  initialDepartmentId = '',
  lockedUniversity,
  onChange,
}) => {
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  const [selectedUnivId, setSelectedUnivId] = useState<string>(initialUniversityId || '');
  const [selectedFacId, setSelectedFacId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [hasUserChangedUniversity, setHasUserChangedUniversity] = useState(false);

  const [loadingUni, setLoadingUni] = useState(true);
  const [loadingFac, setLoadingFac] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);

  // ── INFINITE LOOP KIRICI REF ──────────────────────────────────────────────
  const hasInitializedRef = React.useRef(false);

  const loadFaculties = (universityId: string) => {
    if (!universityId) {
      setFaculties([]);
      setSelectedFacId('');
      setDepartments([]);
      setSelectedDeptId('');
      return;
    }

    setLoadingFac(true);
    getFaculties(universityId)
      .then((data) => {
        setFaculties(data || [])
      })
      .catch(() => {
        setFaculties([])
      })
      .finally(() => setLoadingFac(false));

    setSelectedFacId('');
    setDepartments([]);
    setSelectedDeptId('');
  };

  const isPrefilledUniversity = Boolean(initialUniversityId);

  // ── Başlangıçta kilitli üniversite varsa doğrudan fakülteleri çek ─────────
  useEffect(() => {
    // Eğer ID yoksa veya zaten bir kere çalıştıysa DUR
    if (!initialUniversityId || hasInitializedRef.current) return;

    hasInitializedRef.current = true; // Sadece BİR KERE çalışmasını sağla
    setSelectedUnivId(initialUniversityId);
    loadFaculties(initialUniversityId);

    if (lockedUniversity) {
      try {
        onChange({
          universityId: initialUniversityId,
          universityName: lockedUniversity,
        });
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUniversityId, lockedUniversity]);

  // ── Üniversiteleri yükle ──────────────────────────────────────────────────
  useEffect(() => {
    setLoadingUni(true);
    getUniversities()
      .then((data) => {
        setUniversities(data);

        const effectiveName = lockedUniversity ?? initialUniversityName;
        const match =
          data.find((u) => u.id === initialUniversityId) ||
          (effectiveName && data.find((u) => u.name.toLowerCase() === effectiveName.toLowerCase()));

        if (match) {
          const uid = match.id;
          setSelectedUnivId((prev) => prev || uid);
          try {
            onChange({ universityId: uid, universityName: match.name });
          } catch {
            /* ignore */
          }
          loadFaculties(uid);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoadingUni(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUniversityId, initialUniversityName, lockedUniversity]);

  // ── Üniversite değişince fakülteleri yükle ────────────────────────────────
  useEffect(() => {
    if (!selectedUnivId) {
      setFaculties([]);
      setSelectedFacId('');
      setDepartments([]);
      setSelectedDeptId('');
      return;
    }
    
    // 🎯 DÜZELTME: Eğer initial ID varsa ama kullanıcı henüz dokunmadıysa bile yükle
    // isPrefilledUniversity kontrolü kilitli (locked) senaryolar içindi,
    // hafızadan geri yükleme senaryosu için yüklemeyi zorunlu kılıyoruz.
    loadFaculties(selectedUnivId);
  }, [selectedUnivId]);

  // ── Varsayılan fakülteyi uygula ──────────────────────────────────────────
  useEffect(() => {
    if (!showDepartment || !initialFacultyId || !faculties.length) return;

    const match = faculties.find((f) => f.id === initialFacultyId);
    if (!match) return;

    setSelectedFacId(match.id);
    // onChange'i burada tekrar çağırmaya gerek yok çünkü RegisterForm'da zaten var
  }, [faculties, initialFacultyId, onChange, selectedFacId, showDepartment]);

  // ── Fakülte değişince bölümleri yükle ────────────────────────────────────
  useEffect(() => {
    if (!selectedFacId || !showDepartment) {
      setDepartments([]);
      setSelectedDeptId('');
      return;
    }

    setLoadingDept(true);
    getDepartments(selectedFacId)
      .then((data) => {
        setDepartments(data);
      })
      .catch(() => {
        setDepartments([]);
      })
      .finally(() => setLoadingDept(false));
    
    setSelectedDeptId('');
  }, [selectedFacId, showDepartment]);

  // ── Varsayılan bölümü uygula ─────────────────────────────────────────────
  useEffect(() => {
    if (!showDepartment || !initialDepartmentId || !departments.length) return;

    const match = departments.find((d) => d.id === initialDepartmentId);
    if (!match) return;

    setSelectedDeptId(match.id);
    // onChange'i burada tekrar çağırmaya gerek yok
  }, [departments, initialDepartmentId, onChange, selectedDeptId, showDepartment]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUnivChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = universities.find((u) => u.id === id)?.name ?? '';
    setHasUserChangedUniversity(true);
    setSelectedUnivId(id);
    onChange({ universityId: id, universityName: name, facultyId: '', facultyName: '', departmentId: '', departmentName: '' });
  };

  const handleFacChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = faculties.find((f) => f.id === id)?.name ?? '';
    setSelectedFacId(id);
    onChange({ facultyId: id, facultyName: name, departmentId: '', departmentName: '' });
  };

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = departments.find((d) => d.id === id)?.name ?? '';
    setSelectedDeptId(id);
    onChange({ departmentId: id, departmentName: name });
  };

  return (
    <div className="space-y-3.5">
      {/* Üniversite */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Üniversite{!lockedUniversity && ' *'}
        </label>
        {lockedUniversity ? (
          <div className="flex items-center gap-2 border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50">
            <span className="text-sm text-slate-700 font-medium flex-1 truncate">{lockedUniversity}</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">Kilitli</span>
          </div>
        ) : (
          <select
            value={selectedUnivId}
            onChange={handleUnivChange}
            disabled={loadingUni}
            className={`${SELECT_CLS} rounded-2xl px-4 py-3`}
          >
            <option value="">
              {loadingUni ? 'Yükleniyor...' : '— Üniversite seçin —'}
            </option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {showDepartment && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fakülte */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Fakülte *
            </label>
            <select
              value={selectedFacId}
              onChange={handleFacChange}
              disabled={!selectedUnivId || faculties.length === 0}
              className={`${SELECT_CLS} rounded-2xl px-4 py-3`}
            >
              <option value="">
                {loadingFac
                  ? 'Yükleniyor...'
                  : !selectedUnivId
                  ? '— Önce üniversite seçin —'
                  : '— Fakülte seçin —'}
              </option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bölüm */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Bölüm *
            </label>
            <select
              value={selectedDeptId}
              onChange={handleDeptChange}
              disabled={!selectedFacId || departments.length === 0}
              className={`${SELECT_CLS} rounded-2xl px-4 py-3`}
            >
              <option value="">
                {loadingDept
                  ? 'Yükleniyor...'
                  : !selectedFacId
                  ? '— Önce fakülte seçin —'
                  : '— Bölüm seçin —'}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
