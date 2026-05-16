import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  noScroll?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, noScroll = false }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen flex bg-slate-50 relative overflow-hidden font-body selection:bg-sky-100 selection:text-sky-900">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-100/40 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[100px] animate-pulse-slow delay-500" />
      </div>

      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      <div className="flex flex-col flex-1 min-w-0 relative z-10 overflow-hidden">
        <Header />
        <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
          <div className={`flex-1 flex flex-col min-h-0 animate-fade-in ${!noScroll ? 'overflow-y-auto custom-scrollbar' : ''}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
