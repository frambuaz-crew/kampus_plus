import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Home,
  Bot,
  MessageSquare,
  ShoppingBag,
  Briefcase,
  Calendar,
  CalendarDays,
  BookOpen,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { TooltipProvider } from '../ui/tooltip';

// ─── Desktop Navigation ────────────────────────────────────────────────────────

const navigation = [
  {
    section: 'GENEL',
    items: [
      { name: 'Ana Sayfa', icon: Home, path: '/dashboard' },
      { name: 'AI Asistanım', icon: Bot, path: '/dashboard/ai-assistant' },
      { name: 'Forum', icon: MessageSquare, path: '/dashboard/forum' },
      { name: 'Pazar', icon: ShoppingBag, path: '/dashboard/marketplace' },
      { name: 'Kariyer', icon: Briefcase, path: '/dashboard/career' },
    ],
  },
  {
    section: 'AKADEMİK',
    items: [
      { name: 'Ders Programım', icon: Calendar, path: '/dashboard/course-schedule' },
      { name: 'Akademik Takvim', icon: CalendarDays, path: '/dashboard/academic-calendar' },
      { name: 'Ders Notları', icon: BookOpen, path: '/dashboard/course-notes' },
    ],
  },
];

const bottomNav = [
  { name: 'Admin Paneli', icon: Shield, path: '/admin', adminOnly: true },
];

// ─── Mobile Navigation ─────────────────────────────────────────────────────────

/** 4 items shown directly in the bottom bar */
const mobileMainNav = [
  { name: 'Anasayfa', icon: Home, path: '/dashboard' },
  { name: 'AI', icon: Bot, path: '/dashboard/ai-assistant' },
  { name: 'Forum', icon: MessageSquare, path: '/dashboard/forum' },
  { name: 'Pazar', icon: ShoppingBag, path: '/dashboard/marketplace' },
];

/** Items shown inside the "Daha Fazla" bottom sheet */
const mobileMoreItems = [
  {
    section: 'GENEL',
    items: [
      { name: 'Kariyer', icon: Briefcase, path: '/dashboard/career' },
    ],
  },
  {
    section: 'AKADEMİK',
    items: [
      { name: 'Ders Programım', icon: Calendar, path: '/dashboard/course-schedule' },
      { name: 'Akademik Takvim', icon: CalendarDays, path: '/dashboard/academic-calendar' },
      { name: 'Ders Notları', icon: BookOpen, path: '/dashboard/course-notes' },
    ],
  },
  {
    section: 'HESAP',
    items: [
      { name: 'Ayarlar', icon: Settings, path: '/dashboard/settings' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onCollapsedChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = (['admin', 'university_admin'] as const).includes(
    user?.role as 'admin' | 'university_admin'
  );
  const [moreOpen, setMoreOpen] = useState(false);

  // Highlight "Daha Fazla" if current page is one of the more-items
  const moreItemPaths = mobileMoreItems.flatMap((s) => s.items.map((i) => i.path));
  const isMoreActive = moreItemPaths.some((p) => location.pathname.startsWith(p));

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
      <TooltipProvider delayDuration={0}>
        <aside
          className={cn(
            'bg-white/80 backdrop-blur-xl border-r border-slate-100 flex flex-col transition-all duration-300 hidden md:flex shrink-0 relative z-20 shadow-sm shadow-slate-200/50',
            collapsed ? 'w-20' : 'w-64'
          )}
        >
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 mb-2">
            {!collapsed ? (
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => navigate('/dashboard')}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-200 group-hover:scale-105 transition-transform">
                  <span className="text-white font-black text-sm">K+</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-lg text-slate-900 tracking-tight leading-none">
                    KAMPUS<span className="text-sky-500">+</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Öğrenci Paneli
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <div
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-200 cursor-pointer"
                  onClick={() => navigate('/dashboard')}
                >
                  <span className="text-white font-black text-sm">K+</span>
                </div>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex-1 overflow-hidden py-4">
            {navigation.map((section, idx) => (
              <div key={section.section} className={cn('mb-8', idx === 0 && 'mt-2')}>
                {!collapsed && (
                  <p className="px-7 mb-3 text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
                    {section.section}
                  </p>
                )}
                {collapsed && <div className="h-px bg-slate-100 mx-4 mb-4" />}
                <div className="space-y-1.5 px-4">
                  {section.items.map((item) => (
                    <NavItem key={item.path} item={item} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div className="p-4 mt-auto border-t border-slate-50 space-y-1.5">
            {bottomNav.map((item) =>
              item.adminOnly && !isAdmin ? null : (
                <NavItem key={item.path} item={item} collapsed={collapsed} />
              )
            )}
            {!collapsed && (
              <button
                onClick={() => onCollapsedChange?.(!collapsed)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all font-bold text-xs mt-4"
              >
                <ChevronLeft className="h-4 w-4" />
                Menüyü Daralt
              </button>
            )}
            {collapsed && (
              <button
                onClick={() => onCollapsedChange?.(!collapsed)}
                className="w-full flex items-center justify-center py-2.5 text-slate-400 hover:text-sky-600 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </aside>
      </TooltipProvider>

      {/* ── Mobile Bottom Navigation Bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 z-50 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileMainNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl transition-all flex-1',
                  isActive ? 'text-sky-600 scale-110' : 'text-slate-400'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
            </NavLink>
          ))}

          {/* Daha Fazla button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl transition-all flex-1',
              isMoreActive ? 'text-sky-600 scale-110' : 'text-slate-400'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-tight">Daha Fazla</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Bottom Sheet ───────────────────────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60]"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet panel */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-black text-xs">K+</span>
                </div>
                <span className="font-black text-slate-900 text-sm tracking-tight">Tüm Sayfalar</span>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav items */}
            <div className="px-4 py-4 pb-24 overflow-y-auto max-h-[70vh]">
              {mobileMoreItems.map((section) => (
                <div key={section.section} className="mb-5">
                  <p className="px-2 mb-2 text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
                    {section.section}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMoreOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium text-left',
                            isActive
                              ? 'bg-sky-50 text-sky-600 font-bold'
                              : 'text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.name}
                          {isActive && (
                            <div className="ml-auto w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {isAdmin && (
                <div className="mb-4">
                  <p className="px-2 mb-2 text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
                    YÖNETİM
                  </p>
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setMoreOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium text-sky-600 hover:bg-sky-50"
                  >
                    <Shield className="h-5 w-5 shrink-0" />
                    Admin Paneli
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  item,
  collapsed,
}: {
  item: { name: string; icon: React.ElementType; path: string };
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-sm group relative',
          'text-slate-500 hover:text-sky-600 hover:bg-sky-50/50',
          collapsed && 'justify-center px-0 h-12 w-12 mx-auto',
          isActive && [
            'bg-sky-50 text-sky-600 font-bold shadow-sm shadow-sky-100',
            'after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-6 after:w-1 after:bg-sky-600 after:rounded-r-full',
          ]
        )
      }
    >
      <item.icon className={cn('h-5 w-5 shrink-0 transition-transform group-hover:scale-110')} />
      {!collapsed && <span className="tracking-tight">{item.name}</span>}
      {collapsed && (
        <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">
          {item.name}
        </div>
      )}
    </NavLink>
  );
}
