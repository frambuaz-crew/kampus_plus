import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../api/config';
import axios from 'axios';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Token geçerliliğini kontrol et
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsValid(false);
        setError('Token bulunamadı');
        return;
      }

      try {
        await apiClient.get(`/auth/reset-password/validate?token=${token}`);
        setIsValid(true);
      } catch (err: unknown) {
        setIsValid(false);
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error?.message || 'Token geçersiz veya süresi dolmuş');
        } else {
          setError('Token geçersiz veya süresi dolmuş');
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side kontroller
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      return;
    }

    setIsLoading(true);

    try {
      // 🚀 DÜZELTME: Backend'in beklediği tüm alanları gönderiyoruz
      await apiClient.post('/auth/reset-password', {
        token: token,
        new_password: password,
        confirm_password: confirmPassword, // ✅ Eksik olan alan eklendi
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      // Backend'den dönen spesifik hata mesajını göster
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error?.message || 'Bir hata oluştu');
      } else {
        setError('Bir hata oluştu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Yükleme ekranı
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center animate-pulse">
          <p className="text-gray-600 font-medium text-lg">Güvenlik kontrolü yapılıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
            🎓 KAMPÜS+
          </h1>
          <p className="text-xl text-purple-50. font-medium opacity-90">
            Şifre Sıfırlama
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">
          {isSuccess ? (
            <div className="text-center animate-fade-in">
              <span className="text-6xl block mb-6 drop-shadow-sm">✅</span>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Şifre Başarıyla Sıfırlandı
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Artık yeni şifrenizle giriş yapmaya hazırsınız!
              </p>
              <Link
                to="/login"
                className="block w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all font-bold shadow-lg active:scale-95"
              >
                Giriş Yap
              </Link>
            </div>
          ) : !isValid ? (
            <div className="text-center animate-fade-in">
              <span className="text-6xl block mb-6">❌</span>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Geçersiz Bağlantı
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {error || 'Bu linkin süresi dolmuş olabilir.'}
              </p>
              <Link
                to="/forgot-password"
                className="inline-block text-indigo-600 hover:text-indigo-800 font-bold border-b-2 border-indigo-600 pb-1"
              >
                Yeni bir link iste →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Yeni Şifre Belirle
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    Yeni Şifre
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                    placeholder="En az 8 karakter"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                    Şifre Tekrar
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                    placeholder="Şifreyi tekrar girin"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium animate-shake">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all font-bold shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-gray-100 pt-6">
                <Link
                  to="/login"
                  className="text-gray-500 hover:text-indigo-600 font-bold text-sm transition-colors"
                >
                  ← Giriş sayfasına dön
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};