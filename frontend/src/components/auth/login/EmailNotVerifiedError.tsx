/**
 * Email Not Verified Error Component
 * 
 * Spec: 003-login-page/spec.md
 * 
 * Email doğrulanmamış kullanıcı giriş yapmaya çalıştığında gösterilen hata mesajı:
 * - Email doğrulanmamış uyarısı
 * - "Email Tekrar Gönder" butonu
 * - Spam/Junk klasörü uyarısı
 */

import React, { useState } from 'react';
import { apiClient } from '../../../api/config';
import axios from 'axios';

interface EmailNotVerifiedErrorProps {
  email: string;
  onResendSuccess?: () => void;
}

export const EmailNotVerifiedError: React.FC<EmailNotVerifiedErrorProps> = ({ 
  email, 
  onResendSuccess 
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      await apiClient.post('/auth/resend-verification', { email });
      setResendMessage('Doğrulama email\'i gönderildi. Lütfen email\'inizi kontrol edin.');
      
      if (onResendSuccess) {
        onResendSuccess();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 429) {
          setResendError('Çok fazla deneme yaptınız. Lütfen 1 saat sonra tekrar deneyin.');
        } else {
          setResendError('Email gönderilemedi. Lütfen tekrar deneyin.');
        }
      } else {
        setResendError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 animate-fade-in">
      {/* Error Icon and Title */}
      <div className="flex items-start space-x-3">
        <div className="text-2xl flex-shrink-0">❌</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-900 mb-1">
            Email Doğrulanmamış
          </h3>
          <p className="text-sm text-yellow-800 mb-3">
            Hesabınıza giriş yapmadan önce email adresinizi doğrulamanız gerekiyor.
          </p>

          {/* Resend Button */}
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={isResending}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isResending ? 'Gönderiliyor...' : 'Email Tekrar Gönder'}
          </button>

          {/* Success Message */}
          {resendMessage && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              {resendMessage}
            </div>
          )}

          {/* Error Message */}
          {resendError && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {resendError}
            </div>
          )}

          {/* Spam Warning */}
          <p className="mt-3 text-xs text-yellow-700">
            💡 Email'inizi kontrol edin. Spam/Junk klasörünü de kontrol edin.
          </p>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

