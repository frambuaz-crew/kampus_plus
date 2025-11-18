import { useState } from 'react'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { LoginForm } from './components/auth/LoginForm'
import { RegisterForm } from './components/auth/RegisterForm'
import { useAuth } from './hooks/useAuth'

function AuthDemo() {
  const { user, isAuthenticated, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(true)

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome, {user.first_name} {user.last_name}!
            </h2>
            <p className="text-gray-600 mt-2">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
              {user.role.toUpperCase()}
            </span>
          </div>
          
          <div className="space-y-4 mt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-medium">✅ Authentication Successful!</p>
              <p className="text-green-700 text-xs mt-1">JWT token stored in localStorage</p>
            </div>
            
            <button
              onClick={() => logout()}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🎓 KAMPÜS+ AI Platform
          </h1>
          <p className="text-xl text-gray-600">
            Üniversite için AI destekli hibrit bilgi platformu
          </p>
          <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            ✅ T045-T047 + T051 Complete: Auth Components Ready!
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex justify-center mb-8 space-x-4">
          <button
            onClick={() => setShowLogin(true)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              showLogin
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Login Form
          </button>
          <button
            onClick={() => setShowLogin(false)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              !showLogin
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Register Form
          </button>
        </div>

        {/* Form Container */}
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {showLogin ? 'Sign In' : 'Create Account'}
          </h2>
          
          {showLogin ? (
            <LoginForm onSuccess={() => console.log('Login successful!')} />
          ) : (
            <RegisterForm onSuccess={() => {
              console.log('Registration successful!')
              setShowLogin(true)
            }} />
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowLogin(!showLogin)}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              {showLogin
                ? "Don't have an account? Register"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="font-bold text-gray-900 mb-2">JWT Authentication</h3>
            <p className="text-sm text-gray-600">
              Secure token-based auth with automatic refresh
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-3">✨</div>
            <h3 className="font-bold text-gray-900 mb-2">Form Validation</h3>
            <p className="text-sm text-gray-600">
              Real-time validation with error messages
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="font-bold text-gray-900 mb-2">Tailwind CSS</h3>
            <p className="text-sm text-gray-600">
              Modern, responsive design system
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthDemo />
    </AuthProvider>
  )
}

export default App
