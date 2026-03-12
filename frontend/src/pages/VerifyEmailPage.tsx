/**
 * VerifyEmailPage Component
 * 
 * Spec: 015-email-verification/spec.md
 * 
 * Email doğrulama sayfası:
 * - URL'den token alır (?token=...)
 * - Backend'e doğrulama isteği gönderir
 * - Başarılı: 3 saniye sonra login'e yönlendirir
 * - Hata: Token geçersiz/süresi dolmuş, tekrar gönderme formu gösterir
 * 
 * URL: /verify-email?token=...
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/config';
import axios from 'axios';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasRequested = useRef(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');

  const token = searchParams.get('token');

  const verifyEmail = useCallback(async (verificationToken: string) => {
    setStatus('loading');
    setMessage('Email adresiniz doğrulanıyor...');

    try {
      const response = await apiClient.post('/auth/verify-email', {
        token: verificationToken,
      });

      // Backend'den gelen mesajı al (zaten onaylıysa bile buradan mesaj gelir)
      const successMsg = response.data?.message || 'Email adresiniz başarıyla doğrulandı!';
      
      setStatus('success');
      setMessage(successMsg);

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      // Eğer backend "zaten onaylı" diye 200 dönüyorsa buraya düşmez.
      // Ama bir şekilde hata gelirse buradayız.
      setStatus('error');
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data;

        if (statusCode === 400) {
          setMessage(
            errorData?.detail || 
            'Geçersiz veya süresi dolmuş doğrulama token\'ı. Lütfen yeni bir doğrulama email\'i isteyin.'
          );
        } else {
          setMessage(
            errorData?.detail || 
            'Email doğrulanamadı. Lütfen tekrar deneyin veya destek ekibiyle iletişime geçin.'
          );
        }
      } else {
        setMessage('Ağ hatası. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.');
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (!token || hasRequested.current) return;
    hasRequested.current = true;
    verifyEmail(token);
  }, [token, verifyEmail]);

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setResendStatus('error');
      setResendMessage('Lütfen email adresinizi girin.');
      return;
    }

    setResendStatus('loading');
    setResendMessage('Doğrulama email\'i gönderiliyor...');

    try {
      const response = await apiClient.post('/auth/resend-verification', {
        email: email.trim(),
      });

      setResendStatus('success');
      setResendMessage(
        response.data?.message || 
        'Doğrulama email\'i gönderildi! Lütfen email\'inizi kontrol edin.'
      );
    } catch (error) {
      setResendStatus('error');
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data;

        if (statusCode === 429) {
          const retryAfter = errorData?.retry_after || 3600;
          const minutes = Math.ceil(retryAfter / 60);
          setResendMessage(
            `Çok fazla deneme yaptınız. Lütfen ${minutes} dakika sonra tekrar deneyin.`
          );
        } else if (statusCode === 400) {
          setResendMessage(
            errorData?.detail || 
            'Doğrulama email\'i gönderilemedi. Lütfen email adresinizi kontrol edin.'
          );
        } else {
          setResendMessage(
            errorData?.detail || 
            'Doğrulama email\'i gönderilemedi. Lütfen daha sonra tekrar deneyin.'
          );
        }
      } else {
        setResendMessage('Ağ hatası. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎓 KAMPÜS+
          </h1>
          <p className="text-xl text-blue-100">
            Email Doğrulama
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Email Doğrulandı!
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <p className="text-sm text-gray-500 mb-6">
                Giriş sayfasına yönlendiriliyorsunuz...
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
              >
                Giriş Sayfasına Git
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Doğrulama Başarısız
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>

              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Doğrulama Email'ini Tekrar Gönder
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Adresi
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="ornek@selcuk.edu.tr"
                    />
                  </div>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'loading'}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {resendStatus === 'loading' ? 'Gönderiliyor...' : 'Doğrulama Email\'ini Tekrar Gönder'}
                  </button>
                  
                  {resendStatus === 'success' && (
                    <div className="rounded-md bg-green-50 p-4">
                      <p className="text-sm text-green-800">{resendMessage}</p>
                    </div>
                  )}
                  
                  {resendStatus === 'error' && (
                    <div className="rounded-md bg-red-50 p-4">
                      <p className="text-sm text-red-800">{resendMessage}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Giriş Sayfasına Dön
                </Link>
              </div>
            </div>
          )}

          {status === 'idle' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Doğrulama hazırlanıyor...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

