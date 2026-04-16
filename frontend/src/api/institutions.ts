/**
 * Kurumsal hiyerarşi API — University → Faculty → Department
 */

import { apiClient } from './config';

export interface UniversityItem {
  id: string;
  name: string;
  university_type: string;
  city?: string | null;
}

export interface FacultyItem {
  id: string;
  name: string;
  university_id: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  faculty_id: string;
}

export const getUniversities = async (city?: string): Promise<UniversityItem[]> => {
  const res = await apiClient.get<UniversityItem[]>('/institutions/universities', {
    params: city ? { city } : undefined,
  });
  return res.data;
};

export const getFaculties = async (universityId: string): Promise<FacultyItem[]> => {
  const res = await apiClient.get<FacultyItem[]>(
    `/institutions/universities/${universityId}/faculties`
  );
  return res.data;
};

export const getDepartments = async (facultyId: string): Promise<DepartmentItem[]> => {
  const res = await apiClient.get<DepartmentItem[]>(
    `/institutions/faculties/${facultyId}/departments`
  );
  return res.data;
};
