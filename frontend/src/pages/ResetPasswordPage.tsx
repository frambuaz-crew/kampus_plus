/**
 * Reset Password Page
 * 
 * Spec: 017-reset-password/spec.md
 * 
 * Şifre sıfırlama sayfası (token ile)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../api/config';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

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
      } catch (err: any) {
        setIsValid(false);
        setError(err.response?.data?.error?.message || 'Token geçersiz veya süresi dolmuş');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <p className="text-gray-600">Token kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎓 KAMPÜS+
          </h1>
          <p className="text-xl text-purple-100">
            Şifre Sıfırlama
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {isSuccess ? (
            <div className="text-center">
              <span className="text-6xl block mb-4">✅</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Şifre Başarıyla Sıfırlandı
              </h2>
              <p className="text-gray-600 mb-6">
                Yeni şifrenizle giriş yapabilirsiniz.
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
              >
                Giriş Yap
              </Link>
            </div>
          ) : !isValid ? (
            <div className="text-center">
              <span className="text-6xl block mb-4">❌</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Geçersiz Token
              </h2>
              <p className="text-gray-600 mb-6">
                {error || 'Token geçersiz veya süresi dolmuş. Lütfen yeni bir şifre sıfırlama isteği gönderin.'}
              </p>
              <Link
                to="/forgot-password"
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Yeni şifre sıfırlama isteği gönder
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Yeni Şifre Belirle
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Yeni Şifre
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="En az 8 karakter"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Şifre Tekrar
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Şifreyi tekrar girin"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
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

