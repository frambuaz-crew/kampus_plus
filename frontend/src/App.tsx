import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NewDashboard } from './pages/NewDashboard';
import { ChatTestPage } from './pages/ChatTestPage';
import { ChatPage } from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import { ForumPage } from './pages/ForumPage';
import { CoursesPage } from './pages/CoursesPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
// EMAIL VERIFICATION DISABLED - TODO: Re-enable in production
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* EMAIL VERIFICATION DISABLED - TODO: Re-enable in production */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

          {/* Protected Routes - Student Only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <NewDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat-test"
            element={
              <ProtectedRoute>
                <ChatTestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsPage />
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
            path="/courses"
            element={
              <ProtectedRoute>
                <CoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <StatisticsPage />
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
          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <HelpPage />
              </ProtectedRoute>
            }
          />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
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
            AI-Powered Learning Platform
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Welcome Back
          </h2>
          <LoginForm
            onSuccess={() => {
              // Redirect to dashboard
              window.location.href = '/dashboard';
            }}
          />
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Register here
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-center">
            <div className="text-2xl mb-1">🔐</div>
            <p className="text-xs">Secure</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-center">
            <div className="text-2xl mb-1">🤖</div>
            <p className="text-xs">AI-Powered</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-white text-center">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-xs">Fast</p>
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
            Join the Future of Learning
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Create Account
          </h2>
          <RegisterForm />
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                Login here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
