/**
 * Sidebar Navigation Component
 * 
 * Spec: 004-dashboard/spec.md
 * 
 * Sidebar yapısı:
 * 1. 🏠 Ana Sayfa
 * 2. 🤖 AI Asistanım
 * 3. 💬 Forum
 * 4. 🛒 Pazar
 * 5. 💼 Kariyer
 * ── AKADEMİK ──
 * 6. 📅 Ders Programım
 * 7. ⏰ Akademik Takvim
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Navigation items - Spec'e göre (004-dashboard)
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: '🏠', path: '/dashboard' },
    { id: 'ai-assistant', label: 'AI Asistanım', icon: '🤖', path: '/dashboard/ai-assistant' },
    { id: 'forum', label: 'Forum', icon: '💬', path: '/dashboard/forum' },
    { id: 'marketplace', label: 'Pazar', icon: '🛒', path: '/dashboard/marketplace' },
    { id: 'career', label: 'Kariyer', icon: '💼', path: '/dashboard/career' },
    { id: 'network', label: 'Ağım', icon: '👥', path: '/dashboard/network' },
  ];

  const academicItems: NavItem[] = [
    { id: 'course-schedule', label: 'Ders Programım', icon: '📅', path: '/dashboard/course-schedule' },
    { id: 'academic-calendar', label: 'Akademik Takvim', icon: '⏰', path: '/dashboard/academic-calendar' },
  ];

  const adminItems: NavItem[] = ['admin', 'university_admin'].includes(user?.role ?? '')
    ? [{ id: 'admin-panel', label: 'Admin Paneli', icon: '🛡️', path: '/admin' }]
    : [];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <nav className="flex-1 px-3 py-6 space-y-6">
        {/* Ana Menü Öğeleri */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'
                  }
                `}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* AKADEMİK Grup Başlığı */}
        <div className="px-3 pt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            ── AKADEMİK ──
          </h3>
        </div>

        {/* Akademik Menü Öğeleri */}
        <div className="space-y-1">
          {academicItems.map((item) => {
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'
                  }
                `}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Admin Menü Öğeleri */}
        {adminItems.length > 0 && (
          <div className="space-y-1 border-t border-gray-100 pt-4">
            {adminItems.map((item) => {
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center px-3 py-2.5 rounded-lg
                    text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'
                    }
                  `}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
};

