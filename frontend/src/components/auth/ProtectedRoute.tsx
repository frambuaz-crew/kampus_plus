import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
  requireRole?: 'admin' | 'student' | 'instructor';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireVerified = true,
  requireRole
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation(); // 🚀 Mevcut konumu alıyoruz

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Authentication kontrolü - localStorage fallback
  const storedToken = localStorage.getItem('access_token') || localStorage.getItem('admin_token');
  const storedUser = localStorage.getItem('user');
  const hasStoredAuth = storedToken && (storedUser || isAuthenticated);
  
  if (!isAuthenticated && !hasStoredAuth) {
    // 🎯 KRİTİK: Eğer admin rolü gerekiyorsa, admin login'e; yoksa normal login'e
    const redirectPath = requireRole === 'admin' ? "/admin/login" : "/login";
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  const actualUser = user || (storedUser ? JSON.parse(storedUser) : null);
  const actualRole = actualUser?.role;
  const actualIsVerified = actualUser?.is_verified;
  
  // Email verification kontrolü
  if (requireVerified && !actualIsVerified) {
    // Admin kullanıcıları genellikle manuel onaylandığı için bu kontrolü opsiyonel bırakabiliriz
    // Ama spec gereği koruyoruz
    return (
      <Navigate 
        to="/login" 
        state={{ error: 'Email adresinizi doğrulamanız gerekiyor', from: location }} 
        replace 
      />
    );
  }

  // Role kontrolü — admin her rotaya erişebilir (süper kullanıcı)
  if (requireRole && actualRole !== requireRole && actualRole !== 'admin') {
    console.warn('Erişim Reddedildi: Rol uyumsuzluğu', { actualRole, requireRole });
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};