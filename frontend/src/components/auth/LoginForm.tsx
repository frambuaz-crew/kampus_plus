/**
 * LoginForm Component
 * 
 * Spec: 003-login-page/spec.md
 * 
 * Özellikler:
 * - Email ve şifre ile giriş
 * - "Beni Hatırla" checkbox (refresh token süresini 30 güne çıkarır)
 * - Şifre göster/gizle ikonu
 * - Email doğrulanmamış hatası için "Email Tekrar Gönder" butonu
 * - "Şifremi Unuttum" ve "Kayıt ol" linkleri
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { LoginCredentials, User } from '../../types/auth';
import { apiClient } from '../../api/config';
import axios from 'axios';

interface LoginFormProps {
  onSuccess?: (user: User) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email adresi gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Geçerli bir email adresi girin';
    }

    if (!password) {
      newErrors.password = 'Şifre gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setEmailNotVerified(false);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const credentials: LoginCredentials = { 
        email, 
        password,
        remember_me: rememberMe
      };
      const user = await login(credentials);

      if (onSuccess) {
        onSuccess(user);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = errorData?.error?.message || errorData?.message || 'Bir hata oluştu';
        const errorCode = errorData?.error?.code;

        console.error('Login error:', { status, errorData, error });

        if (status === 401) {
          setErrors({ general: 'Email veya şifre hatalı' });
        } else if (status === 403) {
          if (errorCode === 'EMAIL_NOT_VERIFIED') {
            setEmailNotVerified(true);
            setErrors({ general: errorMessage || 'Email adresiniz doğrulanmamış' });
          } else if (errorCode === 'ACCOUNT_INACTIVE') {
            setErrors({ general: errorMessage || 'Hesabınız devre dışı bırakılmış' });
          } else {
            setErrors({ general: errorMessage });
          }
        } else if (status === 429) {
          setErrors({ general: 'Çok fazla deneme yaptınız. Lütfen 10 dakika sonra tekrar deneyin.' });
        } else if (status === 500) {
          setErrors({ general: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
        } else if (status === 0 || !status) {
          // Network error (CORS, connection refused, etc.)
          setErrors({ general: 'Backend\'e bağlanılamıyor. Backend çalışıyor mu? (http://localhost:8000)' });
        } else {
          setErrors({ general: errorMessage });
        }
      } else {
        setErrors({ general: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResendingEmail(true);
    try {
      await apiClient.post('/auth/resend-verification', { email });
      setErrors({ general: 'Doğrulama email\'i gönderildi. Lütfen email\'inizi kontrol edin.' });
      setEmailNotVerified(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 429) {
          setErrors({ general: 'Çok fazla deneme yaptınız. Lütfen 1 saat sonra tekrar deneyin.' });
        } else {
          setErrors({ general: 'Email gönderilemedi. Lütfen tekrar deneyin.' });
        }
      }
    } finally {
      setIsResendingEmail(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) {
              const { email: _, ...rest } = errors;
              setErrors(rest);
            }
          }}
          placeholder="Email adresiniz"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isLoading}
          autoComplete="email"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Password Input */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Şifre
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                const { password: _, ...rest } = errors;
                setErrors(rest);
              }
            }}
            placeholder="Şifreniz"
            className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        )}
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center">
        <input
          id="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          disabled={isLoading}
        />
        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
          Beni Hatırla (30 gün)
        </label>
      </div>

      {/* General Error Message */}
      {errors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{errors.general}</p>
          
          {/* Email Not Verified - Resend Button */}
          {emailNotVerified && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingEmail}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isResendingEmail ? 'Gönderiliyor...' : 'Email Tekrar Gönder'}
              </button>
              <p className="mt-2 text-xs text-gray-600">
                Email'inizi kontrol edin. Spam/Junk klasörünü de kontrol edin.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>

      {/* Links */}
      <div className="flex items-center justify-between text-sm">
        <Link
          to="/forgot-password"
          className="text-indigo-600 hover:text-indigo-700"
        >
          Şifremi Unuttum?
        </Link>
        <div className="text-gray-600">
          Hesabın yok mu?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Kayıt ol
          </Link>
        </div>
      </div>
    </form>
  );
};
