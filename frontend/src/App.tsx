import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NewDashboard } from './pages/NewDashboard';
import { ChatPage } from './pages/ChatPage';
import { ForumPage } from './pages/ForumPage';
import { SettingsPage } from './pages/SettingsPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
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
import { NetworkPage } from './pages/Network/NetworkPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { CareerPage } from './pages/CareerPage';
import { CourseSchedulePage } from './pages/CourseSchedulePage';
import { AcademicCalendarPage } from './pages/AcademicCalendarPage';
import { CourseNotesPage } from './pages/course-notes/CourseNotesPage';
import { CourseNoteDetailPage } from './pages/course-notes/CourseNoteDetailPage';
import { Error404Page } from './pages/Error404Page';
import { Error500Page } from './pages/Error500Page';
import { Error403Page } from './pages/Error403Page';
import { AuthProvider } from './contexts/AuthContext';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAcademicPage } from './pages/admin/AdminAcademicPage';
import { AdminForumPage } from './pages/admin/AdminForumPage';
import { AdminMarketplacePage } from './pages/admin/AdminMarketplacePage';
import { AdminCareerPage } from './pages/admin/AdminCareerPage';
import { AdminAIPage } from './pages/admin/AdminAIPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminMessagesPage } from './pages/admin/AdminMessagesPage';
import { AdminSchedulePage } from './pages/admin/AdminSchedulePage';
import { AdminCourseNotesPage } from './pages/admin/AdminCourseNotesPage';
import { AdminCourseNoteDetailPage } from './pages/admin/AdminCourseNoteDetailPage';
import { AdminLayout } from './components/layout/AdminLayout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/register" element={<AuthPage initialMode="register" />} />
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
                <ChatPage />
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
            path="/dashboard/forum/:id"
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
            path="/dashboard/marketplace/:id"
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
            path="/dashboard/career/:id"
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
          <Route
            path="/dashboard/course-notes"
            element={
              <ProtectedRoute>
                <CourseNotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/course-notes/:id"
            element={
              <ProtectedRoute>
                <CourseNoteDetailPage />
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
            path="/dashboard/network"
            element={
              <ProtectedRoute>
                <NetworkPage />
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
            {/* Academic */}
            <Route path="academic" element={<Navigate to="/admin/academic/pending-contributions" replace />} />
            <Route path="academic/pending-contributions" element={<AdminAcademicPage />} />
            <Route path="academic/course-schedule" element={<AdminAcademicPage />} />
            <Route path="academic/calendar" element={<AdminAcademicPage />} />
            {/* Forum */}
            <Route path="forum" element={<AdminForumPage />} />
            {/* Marketplace */}
            <Route path="marketplace" element={<AdminMarketplacePage />} />
            <Route path="moderation/marketplace-reports" element={<AdminMarketplacePage />} />
            {/* Career */}
            <Route path="career" element={<AdminCareerPage />} />
            <Route path="moderation/career-reports" element={<AdminCareerPage />} />
            {/* AI */}
            <Route path="ai" element={<Navigate to="/admin/ai/settings" replace />} />
            <Route path="ai/settings" element={<AdminAIPage />} />
            <Route path="ai/knowledge-base" element={<AdminAIPage />} />
            <Route path="ai/stats" element={<AdminAIPage />} />
            {/* Schedules */}
            <Route path="schedules" element={<AdminSchedulePage />} />
            {/* Course Notes */}
            <Route path="course-notes" element={<AdminCourseNotesPage />} />
            <Route path="course-notes/:id" element={<AdminCourseNoteDetailPage />} />
            {/* Users & Messages */}
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="messages" element={<AdminMessagesPage />} />
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