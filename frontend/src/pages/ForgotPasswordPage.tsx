import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/config';
import { ChevronLeft, Mail, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background decoration (AuthPage style) */}
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

        {/* Content Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-white/20">
          {isSuccess ? (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">Email Gönderildi</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Şifre sıfırlama linki <span className="text-slate-900 font-bold underline decoration-sky-500 underline-offset-4">{email}</span> adresine başarıyla gönderildi.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl"
              >
                Giriş Yap
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-sky-600" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-black text-slate-900 leading-tight">Şifremi <span className="text-sky-600">Unuttum</span></h1>
                  <p className="text-slate-400 text-sm font-medium">Güvenli bir şekilde sıfırla</p>
                </div>
              </div>

              <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                Üniversite email adresini gir, sana özel şifre sıfırlama linkini hemen gönderelim.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                    Email Adresi
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-5 py-4 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                      placeholder="ali@uni.edu.tr"
                    />
                    <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
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
                  className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl transition-all font-bold shadow-xl shadow-sky-100 disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Gönderiliyor...</span>
                    </div>
                  ) : (
                    'Sıfırlama Linki Gönder'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-600 font-bold text-sm transition-all group"
                >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
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

