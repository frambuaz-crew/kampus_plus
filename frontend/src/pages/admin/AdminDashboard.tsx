/**
 * Admin Dashboard
 * 
 * Central admin panel for platform management
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Check if user is admin
  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const adminCards = [
    {
      title: 'User Management',
      icon: '👥',
      description: 'Manage students and accounts',
      path: '/admin/users',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Content Moderation',
      icon: '🛡️',
      description: 'Review flagged forum posts',
      path: '/admin/moderation',
      color: 'from-red-500 to-red-600',
    },
    {
      title: 'System Logs',
      icon: '📋',
      description: 'View system logs and activity',
      path: '/admin/logs',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Analytics',
      icon: '📊',
      description: 'Platform usage statistics',
      path: '/admin/analytics',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Documents',
      icon: '📄',
      description: 'Manage document storage',
      path: '/admin/documents',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      title: 'Settings',
      icon: '⚙️',
      description: 'System configuration',
      path: '/admin/settings',
      color: 'from-gray-500 to-gray-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Admin Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">🔐</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                <p className="text-sm text-gray-400">KAMPÜS+ Administration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-red-400">Administrator</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.first_name}! 👋
          </h2>
          <p className="text-red-100">
            You have administrative access to the platform. Use your powers wisely.
          </p>
        </div>

        {/* Admin Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {adminCards.map((card, index) => (
            <button
              key={index}
              onClick={() => navigate(card.path)}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 hover:shadow-xl transition-all text-left group"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-gray-400">{card.description}</p>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Users</span>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-white">1,247</p>
            <p className="text-xs text-green-400 mt-2">↑ 12% this month</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Active Sessions</span>
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-3xl font-bold text-white">142</p>
            <p className="text-xs text-blue-400 mt-2">Right now</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Flagged Posts</span>
              <span className="text-2xl">🚩</span>
            </div>
            <p className="text-3xl font-bold text-white">7</p>
            <p className="text-xs text-red-400 mt-2">Needs review</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">System Health</span>
              <span className="text-2xl">💚</span>
            </div>
            <p className="text-3xl font-bold text-white">99.8%</p>
            <p className="text-xs text-green-400 mt-2">All systems operational</p>
          </div>
        </div>

        {/* TODO Section */}
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <span className="text-3xl">🚧</span>
            <div>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">
                Admin Panel Under Construction
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Admin features are currently being developed. Placeholder pages will be added soon:
              </p>
              <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                <li>User management (view, edit, suspend users)</li>
                <li>Forum moderation (review flagged content)</li>
                <li>System logs and audit trail</li>
                <li>Analytics dashboard</li>
                <li>Document management</li>
                <li>Platform settings</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

