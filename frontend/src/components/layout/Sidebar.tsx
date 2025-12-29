/**
 * Professional Sidebar Navigation Component
 * 
 * Features:
 * - Modern, clean design
 * - Active state indicators
 * - Hover effects
 * - Icon + text navigation
 * - Organized sections
 * - Smooth animations
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation structure
  const navSections: NavSection[] = [
    {
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/dashboard' },
      ],
    },
    {
      title: 'MAIN',
      items: [
        { id: 'chat', label: 'AI Assistant', icon: '🤖', path: '/chat', badge: 0 },
        { id: 'courses', label: 'My Courses', icon: '📚', path: '/courses' },
        { id: 'documents', label: 'Documents', icon: '📄', path: '/documents' },
        { id: 'forum', label: 'Forum', icon: '💬', path: '/forum' },
      ],
    },
    {
      title: 'OTHER',
      items: [
        { id: 'stats', label: 'Statistics', icon: '📊', path: '/stats' },
        { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
      ],
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Sidebar Content */}
      <nav className="flex-1 px-3 py-6 space-y-8">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {/* Section Title */}
            {section.title && (
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>
            )}

            {/* Navigation Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.path);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                      text-sm font-medium transition-all duration-200
                      ${active
                        ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    
                    {/* Badge (if exists) */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - Help Section */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => handleNavigation('/help')}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <span className="text-xl">❓</span>
          <span>Help & Support</span>
        </button>
      </div>
    </aside>
  );
};

