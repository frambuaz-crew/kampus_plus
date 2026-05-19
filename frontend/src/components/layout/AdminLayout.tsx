import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, MessageSquare,
  ShoppingBag, Briefcase, Bot, Users,
  Mail, LogOut, ShieldAlert, BookOpen, UserCircle, NotebookText,
  Menu, X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Admin Sidebar Linkleri
  const menuItems = [
    { path: '/admin/dashboard',                       icon: <LayoutDashboard size={20} />, label: 'Ana Sayfa'        },
    { path: '/admin/academic/pending-contributions',  icon: <GraduationCap size={20} />,   label: 'Akademik Takvim' },
    { path: '/admin/schedules',                       icon: <BookOpen size={20} />,         label: 'Ders Programları' },
    { path: '/admin/course-notes',                    icon: <NotebookText size={20} />,     label: 'Ders Notları'     },
    { path: '/admin/forum',                           icon: <MessageSquare size={20} />,   label: 'Forum'            },
    { path: '/admin/marketplace',                     icon: <ShoppingBag size={20} />,     label: 'Pazar Yeri'       },
    { path: '/admin/career',                          icon: <Briefcase size={20} />,       label: 'Kariyer'          },
    { path: '/admin/ai/settings',                     icon: <Bot size={20} />,             label: 'Yapay Zeka'       },
    { path: '/admin/users',                           icon: <Users size={20} />,           label: 'Kullanıcılar'     },
    { path: '/admin/messages',                        icon: <Mail size={20} />,            label: 'Mesajlar'         },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans bg-mesh relative">
      
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 🌑 ADMIN SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 flex flex-col transform transition-transform duration-300 lg:static lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-sky-900/10">
              <ShieldAlert size={24} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900">ADMIN <span className="text-sky-600">PANEL</span></span>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all ${
                location.pathname.startsWith(item.path)
                  ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span className="text-sm tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-1">
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              navigate('/dashboard');
            }}
            className="flex items-center gap-4 w-full px-5 py-3.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 font-bold rounded-2xl transition-all"
          >
            <UserCircle size={20} />
            <span className="text-sm">Öğrenci Görünümüne Geç</span>
          </button>
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-4 w-full px-5 py-3.5 text-slate-500 hover:bg-red-50 hover:text-red-600 font-bold rounded-2xl transition-all"
          >
            <LogOut size={20} />
            <span className="text-sm">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* 🖥️ MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
        
        {/* ADMIN HEADER */}
        <header className="h-20 bg-white/60 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-3">
            {/* Menu toggle button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-widest truncate max-w-[200px] sm:max-w-none">
              {menuItems.find(m => location.pathname.startsWith(m.path))?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right mr-2 hidden sm:block">
              <p className="text-sm font-black text-slate-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-sky-600 font-bold uppercase tracking-widest">System Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center font-bold text-sky-600">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
          </div>
        </header>

        {/* DİNAMİK İÇERİK (ROUTELAR BURAYA BASILIR) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};