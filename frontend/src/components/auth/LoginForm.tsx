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
        const redirectTarget =
          user.role === 'admin' || user.role === 'university_admin'
            ? '/admin/dashboard'
            : '/dashboard';
        navigate(redirectTarget);
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

  const inputClass = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 text-sm border rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none transition-all
    ${hasError ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/15 focus:bg-white'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
          }}
          placeholder="ornek@uni.edu.tr"
          className={inputClass(!!errors.email)}
          disabled={isLoading}
          autoComplete="email"
        />
        {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Şifre
          </label>
          <Link to="/forgot-password" className="text-xs text-[#0ea5e9] hover:underline">
            Şifremi unuttum
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => { const n = { ...prev }; delete n.password; return n; });
            }}
            placeholder="••••••••"
            className={`${inputClass(!!errors.password)} pr-10`}
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
      </div>

      {/* Remember Me */}
      <div className="flex items-center gap-2">
        <input
          id="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="w-4 h-4 accent-[#0ea5e9] cursor-pointer rounded"
          disabled={isLoading}
        />
        <label htmlFor="remember-me" className="text-sm text-slate-600 cursor-pointer select-none">
          Beni hatırla (30 gün)
        </label>
      </div>

      {/* Email Not Verified */}
      {emailNotVerified && (
        <EmailNotVerifiedError email={email} onResendSuccess={handleResendSuccess} />
      )}

      {/* General error */}
      {errors.general && !emailNotVerified && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-sky-200 mt-2"
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Giriş yapılıyor...
          </>
        ) : 'Giriş Yap'}
      </button>
    </form>
  );
};
