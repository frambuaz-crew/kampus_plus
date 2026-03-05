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
import { EmailNotVerifiedError } from './login';
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

  const handleResendSuccess = () => {
    // Email gönderildiğinde hata mesajını temizle
    setErrors({});
    setEmailNotVerified(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.email;
                return next;
              });
            }
          }}
          placeholder="ornek@selcuk.edu.tr"
          className="mt-1 block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
          disabled={isLoading}
          autoComplete="email"
        />
        {errors.email && (
          <p className="mt-2 text-sm text-red-600 font-medium">{errors.email}</p>
        )}
      </div>

      {/* Password Input */}
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
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
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.password;
                  return next;
                });
              }
            }}
            placeholder="••••••••"
            className="mt-1 block w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-2 text-sm text-red-600 font-medium">{errors.password}</p>
        )}
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center">
        <input
          id="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-5 w-5 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer transition-all duration-200"
          disabled={isLoading}
        />
        <label htmlFor="remember-me" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
          Beni Hatırla (30 gün)
        </label>
      </div>

      {/* Email Not Verified Error */}
      {emailNotVerified && (
        <EmailNotVerifiedError 
          email={email} 
          onResendSuccess={handleResendSuccess}
        />
      )}

      {/* General Error Message */}
      {errors.general && !emailNotVerified && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{errors.general}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Giriş yapılıyor...
          </>
        ) : (
          'Giriş Yap'
        )}
      </button>

      {/* Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm pt-2">
        <Link
          to="/forgot-password"
          className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-200 hover:underline"
        >
          Şifremi Unuttum?
        </Link>
        <div className="text-gray-600">
          Hesabın yok mu?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors duration-200 hover:underline">
            Kayıt ol
          </Link>
        </div>
      </div>
    </form>
  );
};
