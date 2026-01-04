/**
 * Main Layout Component
 * 
 * Spec: 004-dashboard/spec.md
 * 
 * Dashboard sayfalarının ortak layout yapısı:
 * - Header (üst bar): Logo, Arama, Bildirimler, Mesajlar, Profil
 * - Sidebar (sol menü): Navigation items
 * - Main Content (sağ alan): Sayfa içeriği
 * 
 * Kullanım: Tüm authenticated dashboard sayfalarında kullanılır
 * - Dashboard, AI Assistant, Forum, Marketplace, Career, vb.
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
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

