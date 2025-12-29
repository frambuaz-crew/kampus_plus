/**
 * Main Layout Component
 * 
 * Professional layout with Header + Sidebar + Main Content
 * Used across all authenticated pages
 */

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header - Fixed at top */}
      <Header />
      
      {/* Main container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Fixed width */}
        <Sidebar />
        
        {/* Main Content Area - Flexible */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

