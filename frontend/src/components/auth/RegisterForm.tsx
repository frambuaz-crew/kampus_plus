/**
 * RegisterForm Component
 * 
 * Spec: 002-register-page/spec.md
 * 
 * Özellikler:
 * - .edu.tr email validation (Türkiye geneli)
 * - Şifre validation (min 8 karakter, 1 harf, 1 rakam)
 * - Bölüm dropdown (20 yaygın bölüm + "Diğer")
 * - Kullanım koşulları checkbox (zorunlu)
 * - Email doğrulama başarı mesajı
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { RegisterData } from '../../types/auth';
import { RegisterSuccessMessage } from './register';
import axios from 'axios';
import { getDepartments } from '../../api/auth'; // Yeni API fonksiyonu
import type { Department } from '../../types/department'; // Yeni tip tanımı

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = () => {
  const { register } = useAuth();
  
  // 1. Yeni State Tanımlamaları
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    department_id: '', // 'department' silindi, 'department_id' eklendi
    terms_accepted: false,
  });

  // 2. Sayfa açıldığında bölümleri çeken efekt
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await getDepartments();
        setDepartments(data);
      } catch (error) {
        console.error('Bölümler yüklenirken hata:', error);
      } finally {
        setIsLoadingDepts(false);
      }
    };
    fetchDepartments();
  }, []);

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

    // Department validation (GÜNCELLENDİ 🛠️)
    if (!formData.department_id) {
      newErrors.department_id = 'Bölüm seçmelisiniz';
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
        department_id: Number(formData.department_id), // GÜNCELLENDİ: String ID'yi Number yaptık 🔢
        terms_accepted: formData.terms_accepted,
      };

      await register(registerData);

      // Success - show email verification message
      setRegisteredEmail(formData.email.trim().toLowerCase());
      setIsSuccess(true);

      // Reset form (GÜNCELLENDİ 🧹)
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        department_id: '', // 'department' yerine 'department_id'
        terms_accepted: false,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) { // 👈 İşte bu kontrol için axios lazım!
        const status = error.response?.status;
        // ... hata mesajları ...
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

    // Hata temizleme (Önemli: department_id hatasını da yakalar)
    if (errors[name]) {
      const { [name]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  // Success message (form kaybolur, mesaj gösterilir)
  if (isSuccess) {
    return <RegisterSuccessMessage email={registeredEmail} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="ornek: ali@selcuk.edu.tr"
          className="mt-1 block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
          disabled={isLoading}
          autoComplete="email"
        />
        {errors.email && (
          <p className="mt-2 text-sm text-red-600 font-medium">{errors.email}</p>
        )}
      </div>

      {/* Ad ve Soyad */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-2">
            Ad
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Adınız"
            className="mt-1 block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            disabled={isLoading}
            autoComplete="given-name"
          />
          {errors.first_name && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-2">
            Soyad
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Soyadınız"
            className="mt-1 block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            disabled={isLoading}
            autoComplete="family-name"
          />
          {errors.last_name && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.last_name}</p>
          )}
        </div>
      </div>

      {/* Bölüm Seçimi (GÜNCELLENDİ 🚀) */}
      <div>
        <label htmlFor="department_id" className="block text-sm font-semibold text-gray-700 mb-2">
          Bölüm
        </label>
        <select
          id="department_id"
          name="department_id" // name="department" yerine "department_id"
          value={formData.department_id}
          onChange={handleChange}
          className="mt-1 block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white disabled:opacity-50"
          disabled={isLoading || isLoadingDepts} // Veri yüklenirken veya form submit edilirken pasif
        >
          <option value="">
            {isLoadingDepts ? 'Bölümler yükleniyor...' : 'Bölümünüzü seçin'}
          </option>
          {!isLoadingDepts && departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        {errors.department_id && (
          <p className="mt-2 text-sm text-red-600 font-medium">{errors.department_id}</p>
        )}
      </div>
      
      {/* Şifre */}
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
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
            className="mt-1 block w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            disabled={isLoading}
            autoComplete="new-password"
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

      {/* Şifre Tekrar */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
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
            className="mt-1 block w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            disabled={isLoading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none"
            tabIndex={-1}
            aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {showConfirmPassword ? (
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
        {errors.confirmPassword && (
          <p className="mt-2 text-sm text-red-600 font-medium">{errors.confirmPassword}</p>
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
            className="h-5 w-5 text-indigo-600 focus:ring-2 focus:ring-indigo-500 border-gray-300 rounded mt-1 cursor-pointer transition-all duration-200"
            disabled={isLoading}
          />
          <label htmlFor="terms_accepted" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer">
            <Link to="/terms" className="text-indigo-600 hover:text-indigo-700 transition-colors duration-200 hover:underline">
              Kullanım koşullarını
            </Link>{' '}
            ve gizlilik politikasını okudum, kabul ediyorum
          </label>
        </div>
        {errors.terms_accepted && (
          <p className="mt-2 text-sm text-red-600 font-medium">{errors.terms_accepted}</p>
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
        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Kaydediliyor...
          </>
        ) : (
          'Kayıt Ol'
        )}
      </button>

      {/* Login Link */}
      <div className="text-center text-sm text-gray-600 pt-2">
        Zaten hesabın var mı?{' '}
        <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors duration-200 hover:underline">
          Giriş yap
        </Link>
      </div>
    </form>
  );
};
