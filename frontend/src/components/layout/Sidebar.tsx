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
  { name: 'Ayarlar', icon: Settings, path: '/dashboard/settings' },
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
            'bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 hidden md:flex shrink-0',
            collapsed ? 'w-16' : 'w-60'
          )}
        >
          {/* Logo area (only when not collapsed) */}
          {!collapsed && (
            <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/dashboard')}
              >
                <div className="w-6 h-6 rounded-md bg-[#0ea5e9] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">K+</span>
                </div>
                <span className="font-bold text-base text-[#0ea5e9]">KAMPUS+</span>
              </div>
              {onCollapsedChange && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onCollapsedChange(true)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Collapsed expand button */}
          {collapsed && onCollapsedChange && (
            <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onCollapsedChange(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3">
            {navigation.map((section) => (
              <div key={section.section} className="mb-4">
                {!collapsed && (
                  <p className="px-4 mb-1.5 text-[11px] font-semibold text-sidebar-foreground/50 tracking-wider uppercase">
                    {section.section}
                  </p>
                )}
                {collapsed && <div className="h-px bg-sidebar-border mx-3 mb-2" />}
                <div className="space-y-0.5 px-2">
                  {section.items.map((item) => (
                    <NavItem key={item.path} item={item} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom navigation */}
          <div className="border-t border-sidebar-border p-2 space-y-0.5">
            {bottomNav.map((item) =>
              item.adminOnly && !isAdmin ? null : (
                <NavItem key={item.path} item={item} collapsed={collapsed} />
              )
            )}
          </div>
        </aside>
      </TooltipProvider>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-colors flex-1',
                  isActive
                    ? 'text-[#0ea5e9]'
                    : 'text-slate-500 hover:text-slate-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-[#0ea5e9]' : '')} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </>
              )}
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
  const content = (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm',
          'text-slate-600 hover:bg-sky-50 hover:text-[#0ea5e9]',
          collapsed && 'justify-center px-2',
          isActive && 'bg-sky-50 text-[#0ea5e9] font-semibold border-l-2 border-[#0ea5e9] ml-[-2px] pl-[14px]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={cn('h-4 w-4 shrink-0', isActive ? 'text-[#0ea5e9]' : 'text-slate-500')}
          />
          {!collapsed && <span>{item.name}</span>}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.name}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
