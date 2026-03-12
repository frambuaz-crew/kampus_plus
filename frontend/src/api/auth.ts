import apiClient from './config'; // config.ts'deki yapılandırmayı kullanıyoruz
import type { Department } from '../types/department';
import type { RegisterData, LoginCredentials, LoginResponse } from '../types/auth';

/**
 * Kayıt formundaki dropdown için bölümleri çeker.
 */
export const getDepartments = async (): Promise<Department[]> => {
  // apiClient kullanımı sayesinde base URL ve header'lar otomatik eklenir
  const response = await apiClient.get<Department[]>('/auth/departments');
  return response.data;
};

/**
 * Yeni kullanıcı kaydı oluşturur.
 */
export const register = async (data: RegisterData): Promise<void> => {
  await apiClient.post('/auth/register', data);
};

/**
 * Kullanıcı girişi yapar.
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return response.data;
};