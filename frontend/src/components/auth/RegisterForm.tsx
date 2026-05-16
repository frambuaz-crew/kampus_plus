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

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { RegisterData } from '../../types/auth';
import type { InstitutionSelection } from '../institution/CascadingInstitutionSelect';
import { CascadingInstitutionSelect } from '../institution/CascadingInstitutionSelect';
import { useRegistration } from '../../contexts/RegistrationContext';
import { RegisterSuccessMessage } from './register';
import axios from 'axios';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = () => {
  const { register } = useAuth();
  const { regFormData, setRegFormData, clearRegFormData } = useRegistration();

  const [formData, setFormData] = useState(regFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Veri her değiştiğinde global context'i de güncelle
  React.useEffect(() => {
    setRegFormData(formData);
  }, [formData, setRegFormData]);

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

    // Üniversite ve bölüm validasyonu
    if (!formData.university_id) {
      newErrors.university = 'Üniversite seçmelisiniz';
    }
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
        university: formData.university,
        university_id: formData.university_id,   // ✅ UUID backend'e iletiliyor
        department_id: formData.department_id,
        terms_accepted: formData.terms_accepted,
      };

      await register(registerData);
      
      // Success - clear storage
      clearRegFormData();

      // Success - show email verification message
      setRegisteredEmail(formData.email.trim().toLowerCase());
      setIsSuccess(true);

      // Reset form (GÜNCELLENDİ 🧹)
      setFormData({
        email: '',
        university: '',
        university_id: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        department_id: '',
        terms_accepted: false,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) { // 👈 İşte bu kontrol için axios lazım!
        // ... hata mesajları ...
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstitutionChange = (selection: Partial<InstitutionSelection>) => {
    setFormData((prev) => ({
      ...prev,
      university:
        selection.universityName !== undefined
          ? selection.universityName
          : prev.university,
      university_id:
        selection.universityId !== undefined
          ? selection.universityId
          : prev.university_id,
      faculty_id:
        selection.facultyId !== undefined
          ? selection.facultyId
          : prev.faculty_id,
      department_id:
        selection.departmentId !== undefined
          ? selection.departmentId
          : prev.department_id,
    }));

    setErrors((prev) => {
      const next = { ...prev };
      if (selection.universityId !== undefined) {
        delete next.university;
      }
      if (selection.departmentId !== undefined) {
        delete next.department_id;
      }
      return next;
    });
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
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Success message (form kaybolur, mesaj gösterilir)
  if (isSuccess) {
    return <RegisterSuccessMessage email={registeredEmail} />;
  }

  const inp = (err: boolean) =>
    `w-full px-4 py-3 text-sm border rounded-2xl bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none transition-all ${err ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-sky-600 focus:ring-4 focus:ring-sky-100 focus:bg-white'}`;
  const errTxt = (msg: string) => <p className="mt-1 text-xs text-red-500">{msg}</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 w-full">
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
        <input id="email" name="email" type="email" value={formData.email} onChange={handleChange}
          placeholder="ali@uni.edu.tr" className={inp(!!errors.email)} disabled={isLoading} autoComplete="email" />
        {errors.email && errTxt(errors.email)}
      </div>

      {/* Ad & Soyad */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-1.5">Ad</label>
          <input id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange}
            placeholder="Adınız" className={inp(!!errors.first_name)} disabled={isLoading} autoComplete="given-name" />
          {errors.first_name && errTxt(errors.first_name)}
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-1.5">Soyad</label>
          <input id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange}
            placeholder="Soyadınız" className={inp(!!errors.last_name)} disabled={isLoading} autoComplete="family-name" />
          {errors.last_name && errTxt(errors.last_name)}
        </div>
      </div>

      {/* Üniversite / Bölüm */}
      <div>
        <CascadingInstitutionSelect 
          showDepartment={true} 
          onChange={handleInstitutionChange}
          initialUniversityId={formData.university_id}
          initialFacultyId={formData.faculty_id}
          initialDepartmentId={formData.department_id}
        />
        {(errors.university || errors.department_id) && errTxt(errors.university ?? errors.department_id ?? '')}
      </div>

      {/* Şifre & Şifre Tekrar (Yan Yana) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Şifre</label>
          <div className="relative">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password}
              onChange={handleChange} placeholder="En az 8 karakter" className={`${inp(!!errors.password)} pr-10`}
              disabled={isLoading} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showPassword
                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              }
            </button>
          </div>
          {errors.password && errTxt(errors.password)}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">Şifre Tekrar</label>
          <div className="relative">
            <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword} onChange={handleChange} placeholder="Şifrenizi onaylayın"
              className={`${inp(!!errors.confirmPassword)} pr-10`} disabled={isLoading} autoComplete="new-password" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showConfirmPassword
                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              }
            </button>
          </div>
          {errors.confirmPassword && errTxt(errors.confirmPassword)}
        </div>
      </div>

      {/* Kullanım Koşulları */}
      <div className="pt-1">
        <div className="flex items-start gap-2">
          <input id="terms_accepted" name="terms_accepted" type="checkbox" checked={formData.terms_accepted}
            onChange={handleChange} className="w-4 h-4 mt-0.5 accent-sky-600 cursor-pointer rounded flex-shrink-0" disabled={isLoading} />
          <label htmlFor="terms_accepted" className="text-[11px] text-slate-500 cursor-pointer leading-tight">
            Kayıt olarak <Link to="/terms" className="text-sky-600 font-bold hover:underline">Kullanım Koşullarını</Link> ve <Link to="/privacy" className="text-sky-600 font-bold hover:underline">Gizlilik Politikasını</Link> kabul etmiş sayılırsınız.
          </label>
        </div>
        {errors.terms_accepted && errTxt(errors.terms_accepted)}
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={isLoading}
        className="btn-premium w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-sky-100">
        {isLoading ? (
          <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>Kaydediliyor...</>
        ) : 'Kayıt Ol'}
      </button>

    </form>
  );
};
