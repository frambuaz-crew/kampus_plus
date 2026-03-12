/**
 * Register Success Message Component
 * 
 * Spec: 002-register-page/spec.md
 * 
 * Kayıt başarılı olduktan sonra gösterilen başarı mesajı:
 * - Form kaybolur, yerine bu mesaj gösterilir
 * - Email adresi gösterilir
 * - "Giriş Sayfasına Dön" butonu
 * - Spam/Junk klasörü uyarısı
 */

import React from 'react';
import { Link } from 'react-router-dom';

interface RegisterSuccessMessageProps {
  email: string;
}

export const RegisterSuccessMessage: React.FC<RegisterSuccessMessageProps> = ({ email }) => {
  return (
    <div className="w-full max-w-md space-y-4 animate-fade-in">
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center shadow-sm">
        {/* Success Icon */}
        <div className="text-5xl mb-4">✅</div>
        
        {/* Title */}
        <h3 className="text-xl font-semibold text-green-900 mb-3">
          Kayıt Başarılı!
        </h3>
        
        {/* Email Info */}
        <p className="text-sm text-green-800 mb-2">
          <strong className="font-medium">{email}</strong> adresinize doğrulama linki gönderdik.
        </p>
        
        {/* Instructions */}
        <p className="text-sm text-green-700 mb-4">
          Lütfen email'inizi kontrol edin ve hesabınızı aktifleştirin.
        </p>
        
        {/* Spam Warning */}
        <p className="text-xs text-gray-600 mb-6">
          💡 Spam/Junk klasörünü de kontrol edin.
        </p>
        
        {/* Action Button */}
        <Link
          to="/login"
          className="inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Giriş Sayfasına Dön
        </Link>
      </div>
      
      {/* CSS Animation */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

