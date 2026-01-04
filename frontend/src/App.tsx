import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NewDashboard } from './pages/NewDashboard';
import { ChatPage } from './pages/ChatPage';
import { ForumPage } from './pages/ForumPage';
import { SettingsPage } from './pages/SettingsPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { LandingPage } from './pages/LandingPage';
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
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />

          {/* Protected Routes - Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <NewDashboard />
              </ProtectedRoute>
            }
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
          <Route
            path="/dashboard/profile"
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

          {/* Legacy Routes (for backward compatibility) */}
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
          {/* Legacy route for backward compatibility */}
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

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎓 KAMPÜS+
          </h1>
          <p className="text-xl text-blue-100">
            AI Destekli Öğrenme Platformu
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Tekrar Hoş Geldin
          </h2>
          <LoginForm
            onSuccess={() => {
              window.location.href = '/dashboard';
            }}
          />
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Hesabın yok mu?{' '}
              <a href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Kayıt ol
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-center">
            <div className="text-2xl mb-1">🔐</div>
            <p className="text-xs">Güvenli</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-center">
            <div className="text-2xl mb-1">🤖</div>
            <p className="text-xs">AI Destekli</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-center">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-xs">Hızlı</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎓 KAMPÜS+
          </h1>
          <p className="text-xl text-purple-100">
            Öğrenmenin Geleceğine Katıl
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Hesap Oluştur
          </h2>
          <RegisterForm />
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Zaten hesabın var mı?{' '}
              <a href="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                Giriş yap
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
