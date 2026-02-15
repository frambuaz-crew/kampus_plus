import React from 'react';
import { useNavigate } from 'react-router-dom';

type Props = {
  isAuthenticated: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
};

const Header: React.FC<Props> = ({ isAuthenticated, onLogin, onRegister, onToggleSidebar, sidebarOpen }) => {
  const navigate = useNavigate();

  const menuItems = [
    { key: 'home', label: 'Ana Sayfa', icon: '🏠' },
    { key: 'ai', label: 'AI Asistanım', icon: '🤖' },
    { key: 'forum', label: 'Forum', icon: '💬' },
    { key: 'market', label: 'Pazar', icon: '🛒' },
    { key: 'career', label: 'Kariyer', icon: '💼' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            {/* Hamburger only on small screens */}
            <button className="md:hidden p-2" onClick={onToggleSidebar} aria-label="Toggle menu">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
              <span className="text-2xl mr-2" aria-hidden>📚</span>
              <span className="font-bold text-lg text-gray-900">KAMPÜS+</span>
            </div>
          </div>

          {/* Desktop auth buttons visible on md+ */}
          <div className="hidden md:flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <button onClick={onLogin} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Giriş Yap</button>
                <button onClick={onRegister} className="px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>Kayıt Ol</button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button className="text-sm text-gray-700">Profil</button>
              </div>
            )}
          </div>

          {/* Mobile compact auth (small) shown on md:hidden */}
          <div className="md:hidden flex items-center gap-2">
            {!isAuthenticated ? (
              <>
                <button onClick={onLogin} className="px-3 py-1 rounded-md text-xs border">Giriş</button>
                <button onClick={onRegister} className="px-3 py-1 rounded-md text-xs text-white" style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>Kayıt</button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

