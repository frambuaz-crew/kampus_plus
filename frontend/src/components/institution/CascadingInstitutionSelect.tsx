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
  onChange: (selection: Partial<InstitutionSelection>) => void;
}

const SELECT_CLS =
  'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 ' +
  'focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50 ' +
  'focus:bg-white transition-colors appearance-none cursor-pointer ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const CascadingInstitutionSelect: React.FC<Props> = ({
  showDepartment = true,
  initialUniversityName = '',
  onChange,
}) => {
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  const [selectedUnivId, setSelectedUnivId] = useState('');
  const [selectedFacId, setSelectedFacId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const [loadingUni, setLoadingUni] = useState(true);
  const [loadingFac, setLoadingFac] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);

  // ── Üniversiteleri yükle ──────────────────────────────────────────────────
  useEffect(() => {
    setLoadingUni(true);
    getUniversities()
      .then((data) => {
        setUniversities(data);
        // Varsayılan üniversite adı verildiyse eşleştir
        if (initialUniversityName) {
          const match = data.find(
            (u) => u.name.toLowerCase() === initialUniversityName.toLowerCase()
          );
          if (match) {
            setSelectedUnivId(match.id);
            onChange({ universityId: match.id, universityName: match.name });
          }
        }
      })
      .catch(() => {/* sessizce geç */})
      .finally(() => setLoadingUni(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Üniversite değişince fakülteleri yükle ────────────────────────────────
  useEffect(() => {
    if (!selectedUnivId) {
      setFaculties([]);
      setSelectedFacId('');
      setDepartments([]);
      setSelectedDeptId('');
      return;
    }
    setLoadingFac(true);
    getFaculties(selectedUnivId)
      .then(setFaculties)
      .catch(() => setFaculties([]))
      .finally(() => setLoadingFac(false));
    setSelectedFacId('');
    setDepartments([]);
    setSelectedDeptId('');
  }, [selectedUnivId]);

  // ── Fakülte değişince bölümleri yükle ────────────────────────────────────
  useEffect(() => {
    if (!selectedFacId || !showDepartment) {
      setDepartments([]);
      setSelectedDeptId('');
      return;
    }
    setLoadingDept(true);
    getDepartments(selectedFacId)
      .then(setDepartments)
      .catch(() => setDepartments([]))
      .finally(() => setLoadingDept(false));
    setSelectedDeptId('');
  }, [selectedFacId, showDepartment]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUnivChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = universities.find((u) => u.id === id)?.name ?? '';
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
    <div className={`grid gap-3 ${showDepartment ? 'grid-cols-1' : 'grid-cols-1'}`}>
      {/* Üniversite */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Üniversite *
        </label>
        <select
          value={selectedUnivId}
          onChange={handleUnivChange}
          disabled={loadingUni}
          className={SELECT_CLS}
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
      </div>

      {/* Fakülte — sadece showDepartment=true ise */}
      {showDepartment && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Fakülte *
          </label>
          <select
            value={selectedFacId}
            onChange={handleFacChange}
            disabled={!selectedUnivId || loadingFac}
            className={SELECT_CLS}
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
      )}

      {/* Bölüm — sadece showDepartment=true ise */}
      {showDepartment && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Bölüm *
          </label>
          <select
            value={selectedDeptId}
            onChange={handleDeptChange}
            disabled={!selectedFacId || loadingDept}
            className={SELECT_CLS}
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
      )}
    </div>
  );
};
