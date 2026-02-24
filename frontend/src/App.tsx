import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NewDashboard } from './pages/NewDashboard';
import { ChatPage } from './pages/ChatPage';
import { ForumPage } from './pages/ForumPage';
import { SettingsPage } from './pages/SettingsPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { GlobalSearchPage } from './pages/GlobalSearchPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MessagesPage } from './pages/MessagesPage';
import { MessagesChatPage } from './pages/MessagesChatPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { CareerPage } from './pages/CareerPage';
import { CourseSchedulePage } from './pages/CourseSchedulePage';
import { AcademicCalendarPage } from './pages/AcademicCalendarPage';
import { Error404Page } from './pages/Error404Page';
import { Error500Page } from './pages/Error500Page';
import { Error403Page } from './pages/Error403Page';
import { AuthProvider } from './contexts/AuthContext';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLayout } from './components/layout/AdminLayout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />

          {/* Protected Routes - Dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requireRole="student">
                <NewDashboard />
              </ProtectedRoute>} 
            />
          <Route
            path="/dashboard/search"
            element={
              <ProtectedRoute>
                <GlobalSearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/ai-assistant"
            element={
              <ProtectedRoute>
                <AIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/forum"
            element={
              <ProtectedRoute>
                <ForumPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/marketplace"
            element={
              <ProtectedRoute>
                <MarketplacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/career"
            element={
              <ProtectedRoute>
                <CareerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/course-schedule"
            element={
              <ProtectedRoute>
                <CourseSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/academic-calendar"
            element={
              <ProtectedRoute>
                <AcademicCalendarPage />
              </ProtectedRoute>
            }
          />

          {/* 👤 Profil Rotaları (Güncellendi) */}
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile/:username"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/messages/:id"
            element={
              <ProtectedRoute>
                <MessagesChatPage />
              </ProtectedRoute>
            }
          />

          {/* ================= 🛡️ ADMIN PROTECTED ROUTES ================= */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} /> 
            <Route path="academic/pending-contributions" element={<div>Bekleyen Katkılar Gelecek</div>} />
            <Route path="academic/course-schedule" element={<div>Ders Programı Yönetimi Gelecek</div>} />
            <Route path="academic/calendar" element={<div>Akademik Takvim Yönetimi Gelecek</div>} />
            <Route path="moderation/marketplace-reports" element={<div>Marketplace Raporları Gelecek</div>} />
            <Route path="moderation/career-reports" element={<div>Kariyer Raporları Gelecek</div>} />
            <Route path="ai/settings" element={<div>AI Ayarları Gelecek</div>} />
            <Route path="ai/knowledge-base" element={<div>Knowledge Base Gelecek</div>} />
            <Route path="ai/stats" element={<div>AI İstatistikleri Gelecek</div>} />
            <Route path="users" element={<div>Kullanıcı Yönetimi Gelecek</div>} />
            <Route path="messages" element={<div>İletişim Mesajları Gelecek</div>} />
          </Route>

          {/* Legacy Routes */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forum"
            element={
              <ProtectedRoute>
                <ForumPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Error Pages */}
          <Route path="/404" element={<Error404Page />} />
          <Route path="/500" element={<Error500Page />} />
          <Route path="/403" element={<Error403Page />} />

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;