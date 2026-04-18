import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, MessageSquare,
  ShoppingBag, Briefcase, Bot, Users,
  Mail, LogOut, ShieldAlert, BookOpen
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Admin Sidebar Linkleri
  const menuItems = [
    { path: '/admin/dashboard',                       icon: <LayoutDashboard size={20} />, label: 'Ana Sayfa'        },
    { path: '/admin/academic/pending-contributions',  icon: <GraduationCap size={20} />,   label: 'Akademik Takvim' },
    { path: '/admin/schedules',                       icon: <BookOpen size={20} />,         label: 'Ders Programları' },
    { path: '/admin/forum',                           icon: <MessageSquare size={20} />,   label: 'Forum'            },
    { path: '/admin/marketplace',                     icon: <ShoppingBag size={20} />,     label: 'Pazar Yeri'       },
    { path: '/admin/career',                          icon: <Briefcase size={20} />,       label: 'Kariyer'          },
    { path: '/admin/ai/settings',                     icon: <Bot size={20} />,             label: 'Yapay Zeka'       },
    { path: '/admin/users',                           icon: <Users size={20} />,           label: 'Kullanıcılar'     },
    { path: '/admin/messages',                        icon: <Mail size={20} />,            label: 'Mesajlar'         },
  ];

  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden font-sans">
      
      {/* 🌑 ADMIN SIDEBAR */}
      <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-900/20">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">ADMIN <span className="text-red-600">PANEL</span></span>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
                location.pathname.startsWith(item.path)
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {item.icon}
              <span className="text-sm tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 w-full px-5 py-4 text-gray-500 hover:text-red-500 font-bold transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* 🖥️ MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0a]">
        
        {/* ADMIN HEADER */}
        <header className="h-20 bg-gray-900/50 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-10">
          <h2 className="text-lg font-black text-white uppercase tracking-widest">
            {menuItems.find(m => location.pathname.startsWith(m.path))?.label || 'Dashboard'}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="text-right mr-2">
              <p className="text-sm font-black text-white">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">System Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-red-500">
              {user?.first_name[0]}{user?.last_name[0]}
            </div>
          </div>
        </header>

        {/* DİNAMİK İÇERİK (ROUTELAR BURAYA BASILIR) */}
        <div className="flex-1 overflow-y-auto p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};