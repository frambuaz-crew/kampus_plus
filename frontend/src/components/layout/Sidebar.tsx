import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Button } from '../ui/button';

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

const mobileNav = [
  { name: 'Anasayfa', icon: Home, path: '/dashboard' },
  { name: 'AI', icon: Bot, path: '/dashboard/ai-assistant' },
  { name: 'Forum', icon: MessageSquare, path: '/dashboard/forum' },
  { name: 'Pazar', icon: ShoppingBag, path: '/dashboard/marketplace' },
  { name: 'Kariyer', icon: Briefcase, path: '/dashboard/career' },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onCollapsedChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = (['admin', 'university_admin'] as const).includes(user?.role as 'admin' | 'university_admin');

  return (
    <>
      <TooltipProvider delayDuration={0}>
        <aside
          className={cn(
            'bg-white/80 backdrop-blur-xl border-r border-slate-100 flex flex-col transition-all duration-300 hidden md:flex shrink-0 relative z-20 shadow-sm shadow-slate-200/50',
            collapsed ? 'w-20' : 'w-64'
          )}
        >
          {/* Logo area */}
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
                  <span className="font-black text-lg text-slate-900 tracking-tight leading-none">KAMPUS<span className="text-sky-500">+</span></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Öğrenci Paneli</span>
                </div>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-200 cursor-pointer" onClick={() => navigate('/dashboard')}>
                  <span className="text-white font-black text-sm">K+</span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-hidden py-4">
            {navigation.map((section, idx) => (
              <div key={section.section} className={cn("mb-8", idx === 0 && "mt-2")}>
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

          {/* Bottom Actions */}
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 z-50 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 px-4">
          {mobileNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1.5 px-2 py-1 rounded-xl transition-all flex-1',
                  isActive
                    ? 'text-sky-600 scale-110'
                    : 'text-slate-400'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-bold tracking-tight">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};

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
            'after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-6 after:w-1 after:bg-sky-600 after:rounded-r-full'
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
