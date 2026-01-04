/**
 * ProtectedRoute Component
 * 
 * Spec: 004-dashboard/spec.md
 * 
 * Authentication ve email verification kontrolü yapan route wrapper.
 * - Authentication check (JWT token)
 * - Email verification check (opsiyonel, default: true)
 * - Loading state gösterimi
 * - Unauthenticated → /login redirect
 * - Unverified → /login redirect (requireVerified=true ise)
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
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

  // Authentication kontrolü - localStorage'dan da kontrol et
  const storedToken = localStorage.getItem('access_token');
  const storedUser = localStorage.getItem('user');
  const hasStoredAuth = storedToken && storedUser;
  
  if (!isAuthenticated && !hasStoredAuth) {
    console.log('ProtectedRoute: Not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }
  
  // Eğer state henüz güncellenmemişse ama localStorage'da varsa, bekle
  if (!isAuthenticated && hasStoredAuth && isLoading === false) {
    console.log('ProtectedRoute: State not updated yet, but auth exists in storage. Waiting...');
    // Kısa bir delay ver, state güncellensin
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // User bilgisini localStorage'dan da al (state güncellemesi gecikmeli olabilir)
  const actualUser = user || (storedUser ? JSON.parse(storedUser) : null);
  const actualRole = actualUser?.role;
  const actualIsVerified = actualUser?.is_verified;
  
  // Email verification kontrolü
  if (requireVerified && !actualIsVerified) {
    console.log('ProtectedRoute: Email not verified, redirecting to /login');
    return (
      <Navigate 
        to="/login" 
        state={{ error: 'Email adresinizi doğrulamanız gerekiyor' }} 
        replace 
      />
    );
  }

  // Role kontrolü
  if (requireRole && actualRole !== requireRole) {
    console.log('ProtectedRoute: Role mismatch', { 
      userRole: user?.role,
      storedUserRole: storedUser ? JSON.parse(storedUser)?.role : null,
      actualRole,
      requireRole 
    });
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
