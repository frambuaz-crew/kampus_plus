/**
 * RegisterForm Component
 * 
 * Spec: 002-register-page/spec.md
 * 
 * Özellikler:
 * - .edu.tr email validation (Türkiye geneli)
 * - Şifre validation (min 8 karakter, 1 harf, 1 rakam)
 * - Öğrenci numarası validation (6-15 karakter, sadece rakam)
 * - Bölüm dropdown (20 yaygın bölüm + "Diğer")
 * - Kullanım koşulları checkbox (zorunlu)
 * - Email doğrulama başarı mesajı
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { RegisterData } from '../../types/auth';
import axios from 'axios';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const DEPARTMENTS = [
  'Bilgisayar Mühendisliği',
  'Yazılım Mühendisliği',
  'Elektrik-Elektronik Mühendisliği',
  'Makine Mühendisliği',
  'Endüstri Mühendisliği',
  'İnşaat Mühendisliği',
  'Mimarlık',
  'Hukuk',
  'Tıp',
  'İşletme',
  'İktisat',
  'Psikoloji',
  'İletişim',
  'Türk Dili ve Edebiyatı',
  'Matematik',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Tarih',
  'Diğer',
];

export const RegisterForm: React.FC<RegisterFormProps> = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    student_id: '',
    department: '',
    terms_accepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation (.edu.tr)
    if (!formData.email) {
      newErrors.email = 'Email adresi gereklidir';
    } else {
      const emailLower = formData.email.toLowerCase().trim();
      if (!emailLower.endsWith('.edu.tr')) {
        newErrors.email = 'Lütfen üniversite email adresinizi kullanın (.edu.tr)';
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu\.tr$/.test(emailLower)) {
        newErrors.email = 'Geçerli bir email adresi girin';
      }
    }

    // Password validation (min 8 karakter, 1 harf, 1 rakam)
    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    } else {
      if (formData.password.length < 8) {
        newErrors.password = 'Şifre en az 8 karakter olmalıdır';
      } else {
        const hasLetter = /[a-zA-Z]/.test(formData.password);
        const hasDigit = /[0-9]/.test(formData.password);
        if (!hasLetter || !hasDigit) {
          newErrors.password = 'Şifre en az 1 harf ve 1 rakam içermelidir';
        }
      }
    }

    // Confirm password
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    // First name validation (min 2 karakter, sadece harf ve boşluk)
    if (!formData.first_name) {
      newErrors.first_name = 'Ad gereklidir';
    } else if (formData.first_name.length < 2) {
      newErrors.first_name = 'Ad en az 2 karakter olmalıdır';
    } else if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(formData.first_name)) {
      newErrors.first_name = 'Ad sadece harf ve boşluk içerebilir';
    }

    // Last name validation (min 2 karakter, sadece harf ve boşluk)
    if (!formData.last_name) {
      newErrors.last_name = 'Soyad gereklidir';
    } else if (formData.last_name.length < 2) {
      newErrors.last_name = 'Soyad en az 2 karakter olmalıdır';
    } else if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(formData.last_name)) {
      newErrors.last_name = 'Soyad sadece harf ve boşluk içerebilir';
    }

    // Student ID validation (sadece rakam, 6-15 karakter)
    if (!formData.student_id) {
      newErrors.student_id = 'Öğrenci numarası gereklidir';
    } else if (!/^\d+$/.test(formData.student_id)) {
      newErrors.student_id = 'Öğrenci numarası sadece rakam içermelidir';
    } else if (formData.student_id.length < 6 || formData.student_id.length > 15) {
      newErrors.student_id = 'Öğrenci numarası 6-15 karakter arası olmalıdır';
    }

    // Department validation
    if (!formData.department) {
      newErrors.department = 'Bölüm seçmelisiniz';
    }

    // Terms accepted validation
    if (!formData.terms_accepted) {
      newErrors.terms_accepted = 'Kullanım koşullarını kabul etmelisiniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const registerData: RegisterData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        student_id: formData.student_id,
        department: formData.department,
        terms_accepted: formData.terms_accepted,
      };

      await register(registerData);

      // Success - show email verification message
      setRegisteredEmail(formData.email.trim().toLowerCase());
      setIsSuccess(true);

      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        student_id: '',
        department: '',
        terms_accepted: false,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;

        if (status === 409) {
          setErrors({ general: 'Bu email adresi zaten kayıtlı. Giriş yapmayı deneyin.' });
        } else if (status === 400) {
          setErrors({ general: errorData?.message || 'Geçersiz kayıt bilgileri' });
        } else if (status === 429) {
          setErrors({ general: 'Çok fazla deneme yaptınız. Lütfen 10 dakika sonra tekrar deneyin.' });
        } else {
          setErrors({ general: errorData?.message || 'Kayıt başarısız. Lütfen tekrar deneyin.' });
        }
      } else {
        setErrors({ general: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      const { [name]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  // Success message (form kaybolur, mesaj gösterilir)
  if (isSuccess) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-md bg-green-50 p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">Kayıt Başarılı!</h3>
          <p className="text-sm text-green-800 mb-2">
            <strong>{registeredEmail}</strong> adresinize doğrulama linki gönderdik.
          </p>
          <p className="text-sm text-green-700 mb-4">
            Lütfen email'inizi kontrol edin ve hesabınızı aktifleştirin.
          </p>
          <p className="text-xs text-gray-600 mb-4">
            Spam/Junk klasörünü de kontrol edin.
          </p>
          <Link
            to="/login"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            Giriş Sayfasına Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="ornek: ali@selcuk.edu.tr"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isLoading}
          autoComplete="email"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Ad ve Soyad */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            Ad
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Adınız"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
            autoComplete="given-name"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Soyad
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Soyadınız"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
            autoComplete="family-name"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
          )}
        </div>
      </div>

      {/* Öğrenci Numarası */}
      <div>
        <label htmlFor="student_id" className="block text-sm font-medium text-gray-700 mb-1">
          Öğrenci Numarası
        </label>
        <input
          id="student_id"
          name="student_id"
          type="text"
          value={formData.student_id}
          onChange={handleChange}
          placeholder="Örnek: 123456789"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isLoading}
        />
        {errors.student_id && (
          <p className="mt-1 text-sm text-red-600">{errors.student_id}</p>
        )}
      </div>

      {/* Bölüm */}
      <div>
        <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
          Bölüm
        </label>
        <select
          id="department"
          name="department"
          value={formData.department}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isLoading}
        >
          <option value="">Bölümünüzü seçin</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
        {errors.department && (
          <p className="mt-1 text-sm text-red-600">{errors.department}</p>
        )}
      </div>

      {/* Şifre */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Şifre
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder="En az 8 karakter"
            className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
            autoComplete="new-password"
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

      {/* Şifre Tekrar */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Şifre Tekrar
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Şifrenizi tekrar girin"
            className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Kullanım Koşulları */}
      <div>
        <div className="flex items-start">
          <input
            id="terms_accepted"
            name="terms_accepted"
            type="checkbox"
            checked={formData.terms_accepted}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
            disabled={isLoading}
          />
          <label htmlFor="terms_accepted" className="ml-2 block text-sm text-gray-700">
            <Link to="/terms" className="text-indigo-600 hover:text-indigo-700">
              Kullanım koşullarını
            </Link>{' '}
            ve gizlilik politikasını okudum, kabul ediyorum
          </label>
        </div>
        {errors.terms_accepted && (
          <p className="mt-1 text-sm text-red-600">{errors.terms_accepted}</p>
        )}
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{errors.general}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Kaydediliyor...' : 'Kayıt Ol'}
      </button>

      {/* Login Link */}
      <div className="text-center text-sm text-gray-600">
        Zaten hesabın var mı?{' '}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Giriş yap
        </Link>
      </div>
    </form>
  );
};
