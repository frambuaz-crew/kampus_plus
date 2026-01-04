/**
 * useAuth Hook
 * 
 * Spec: 003-login-page/spec.md, 004-dashboard/spec.md
 * 
 * Authentication context'e erişim için custom hook.
 * AuthProvider içinde kullanılmalıdır.
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextType } from '../types/auth';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
