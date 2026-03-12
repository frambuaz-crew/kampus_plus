/**
 * API Configuration
 * 
 * Spec: 003-login-page/spec.md, 004-dashboard/spec.md
 * 
 * Axios instance ve interceptor'lar:
 * - Request interceptor: JWT token ekleme
 * - Response interceptor: Token refresh (401 durumunda)
 * - Refresh token httpOnly cookie olarak backend'den gelir
 */

import axios from 'axios';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const normalizeApiBaseUrl = (rawUrl?: string): string => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  const normalized = trimmed.replace(/\/+$/, '');

  if (normalized.endsWith('/api/v1')) {
    return normalized;
  }

  if (normalized.endsWith('/v1')) {
    return normalized.replace(/\/v1$/, '/api/v1');
  }

  if (normalized.endsWith('/api')) {
    return `${normalized}/v1`;
  }

  return `${normalized}/api/v1`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // AI chat endpoint 45s backend timeout'una karşı güvenli tampon
  timeout: 60000,
});

// Request interceptor: JWT token ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
