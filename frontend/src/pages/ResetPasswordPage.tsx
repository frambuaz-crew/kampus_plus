import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/config';
import { ChevronLeft, Lock, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import axios from 'axios';

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
        token: token,
        new_password: password,
        confirm_password: confirmPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error?.message || 'Bir hata oluştu');
      } else {
        setError('Bir hata oluştu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 overflow-hidden relative font-body">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow delay-700" />
      </div>

      <div className="max-w-md w-full relative z-10 animate-slide-up">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-3 group mb-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-900/50 group-hover:scale-110 transition-transform">
              <span className="text-white font-black text-lg">K+</span>
            </div>
            <span className="text-white font-bold text-3xl tracking-tight">KAMPUS<span className="text-sky-400">+</span></span>
          </button>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-white/20">
          {isValidating ? (
            <div className="text-center py-10">
              <RefreshCw className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-bold">Güvenlik kontrolü yapılıyor...</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">Şifre Sıfırlandı</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Yeni şifreniz başarıyla kaydedildi. Artık giriş yapabilirsiniz.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl"
              >
                Giriş Yap
              </button>
            </div>
          ) : !isValid ? (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">Geçersiz Bağlantı</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                {error || 'Bu bağlantının süresi dolmuş veya geçersiz olabilir.'}
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-bold transition-all"
              >
                Yeni bir link iste <ChevronLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-sky-600" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-black text-slate-900 leading-tight">Şifreyi <span className="text-sky-600">Yenile</span></h1>
                  <p className="text-slate-400 text-sm font-medium">Yeni güvenli şifreni belirle</p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                      placeholder="••••••••"
                    />
                    <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                    Şifre Tekrar
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                      placeholder="••••••••"
                    />
                    <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl text-sm font-bold animate-shake">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl transition-all font-bold shadow-xl shadow-sky-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
                </button>
              </form>

              <div className="mt-8 text-center border-t border-slate-50 pt-6">
                <Link
                  to="/login"
                  className="text-slate-400 hover:text-sky-600 font-bold text-sm transition-colors"
                >
                  Giriş sayfasına dön
                </Link>
              </div>
            </>
          )}
        </div>
        
        <p className="text-center mt-10 text-slate-500 text-xs font-bold uppercase tracking-widest opacity-50">
          © 2026 KAMPUS+ PLATFORM
        </p>
      </div>
    </div>
  );
};