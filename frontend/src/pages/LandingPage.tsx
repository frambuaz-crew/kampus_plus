/**
 * Landing Page - Ana Sayfa
 * 
 * Spec: 001-landing-page/spec.md
 * 
 * Public ana sayfa - kimlik doğrulaması gerektirmez
 * 
 * Modüler yapı:
 * - LandingHeader: Header component
 * - HeroSection: Hero section component
 * - LandingFooter: Footer component
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../app/components/Header.tsx';
import Sidebar from '../app/components/Sidebar.tsx';
import DashboardHero from '../app/components/DashboardHero.tsx';
import ContentCard from '../app/components/ContentCard';
import AuthModal from '../app/components/AuthModal';
import PreviewModal from '../app/components/PreviewModal';
import Footer from '../app/components/Footer';
import { mockCards } from '../app/data/mockCards';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('Tüm Üniversiteler');

  function handlePreview(card: any) {
    setSelectedCard(card);
    setPreviewModalOpen(true);
  }

  function handleLockedClick(card: any) {
    // Open auth modal that will navigate to register/login
    setSelectedCard(card);
    setAuthModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={() => navigate('/login')}
        onRegister={() => navigate('/register')}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        sidebarOpen={sidebarOpen}
      />

      {/* Mobile overlay menu (below header) */}
      {sidebarOpen && (
        <div className="md:hidden">
          <div
            className="fixed left-0 right-0 bg-black/40"
            style={{ top: '64px', bottom: 0, zIndex: 40 }}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className="fixed left-0 bg-white w-64 shadow-md overflow-auto"
            style={{ top: '64px', height: 'calc(100% - 64px)', zIndex: 50 }}
          >
            <div className="p-4 border-b">
              <div className="flex items-center">
                <span className="text-2xl mr-2">📚</span>
                <span className="font-bold text-lg">KAMPÜS+</span>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              <button onClick={() => { setSidebarOpen(false); if (!isAuthenticated) { setAuthModalOpen(true); } else { navigate('/'); } }} className="w-full text-left flex items-center gap-3 py-3 px-2 rounded-md hover:bg-indigo-50">
                <span className="w-8 h-8 rounded-md flex items-center justify-center text-lg">🏠</span>
                <span className="text-sm font-medium">Ana Sayfa</span>
              </button>
              <button onClick={() => { setSidebarOpen(false); if (!isAuthenticated) { setAuthModalOpen(true); } else { navigate('/dashboard/ai-assistant'); } }} className="w-full text-left flex items-center gap-3 py-3 px-2 rounded-md hover:bg-indigo-50">
                <span className="w-8 h-8 rounded-md flex items-center justify-center text-lg">🤖</span>
                <span className="text-sm font-medium">AI Asistanım</span>
              </button>
              <button onClick={() => { setSidebarOpen(false); if (!isAuthenticated) { setAuthModalOpen(true); } else { navigate('/forum'); } }} className="w-full text-left flex items-center gap-3 py-3 px-2 rounded-md hover:bg-indigo-50">
                <span className="w-8 h-8 rounded-md flex items-center justify-center text-lg">💬</span>
                <span className="text-sm font-medium">Forum</span>
              </button>
              <button onClick={() => { setSidebarOpen(false); if (!isAuthenticated) { setAuthModalOpen(true); } else { navigate('/dashboard/marketplace'); } }} className="w-full text-left flex items-center gap-3 py-3 px-2 rounded-md hover:bg-indigo-50">
                <span className="w-8 h-8 rounded-md flex items-center justify-center text-lg">🛒</span>
                <span className="text-sm font-medium">Pazar</span>
              </button>
              <button onClick={() => { setSidebarOpen(false); if (!isAuthenticated) { setAuthModalOpen(true); } else { navigate('/dashboard/career'); } }} className="w-full text-left flex items-center gap-3 py-3 px-2 rounded-md hover:bg-indigo-50">
                <span className="w-8 h-8 rounded-md flex items-center justify-center text-lg">💼</span>
                <span className="text-sm font-medium">Kariyer</span>
              </button>
              <div className="mt-4 border-t pt-3">
                <div className="text-xs text-gray-400 mb-2">— AKADEMİK —</div>
                <button onClick={() => { setSidebarOpen(false); if (!isAuthenticated) { setAuthModalOpen(true); } else { navigate('/dashboard/course-schedule'); } }} className="w-full text-left flex items-center gap-3 py-3 px-2 rounded-md hover:bg-indigo-50">
                  <span className="w-8 h-8 rounded-md flex items-center justify-center text-lg">📅</span>
                  <span className="text-sm font-medium">Ders Programım</span>
                </button>
                <button onClick={() => { setSidebarOpen(false); if (!isAuthenticated) { setAuthModalOpen(true); } else { navigate('/dashboard/academic-calendar'); } }} className="w-full text-left flex items-center gap-3 py-3 px-2 rounded-md hover:bg-indigo-50">
                  <span className="w-8 h-8 rounded-md flex items-center justify-center text-lg">🗓️</span>
                  <span className="text-sm font-medium">Akademik Takvim</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      <div className="flex">
        <Sidebar
          open={sidebarOpen}
          onRequestAuth={() => setAuthModalOpen(true)}
        />

        <main className={`flex-1 p-6 ${sidebarOpen ? 'lg:pl-0' : ''}`}>
          <DashboardHero onRegister={() => navigate('/register')} />

          {/* Today panels (Today Lessons & Upcoming Events) */}
          <section className="mt-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-700">Üniversite:</label>
              <select
                value={selectedUniversity}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedUniversity(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="Selçuk Üniversitesi">Selçuk Üniversitesi</option>
                <option value="Konya Teknik Üniversitesi">Konya Teknik Üniversitesi</option>
                <option value="Konya Gıda Tarım Üniversitesi">Konya Gıda Tarım Üniversitesi</option>
                <option value="Tüm Üniversiteler">Tüm Üniversiteler</option>
              </select>
            </div>
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">BUGÜN DERSLERİM</h4>
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">Henüz Veri Yok</div>
                  <p className="text-sm text-gray-500 mt-2">Derslerinizi görmek istiyorsanız kayıt yapın.</p>
                  <div className="mt-4">
                    <button onClick={() => navigate('/register')} className="px-4 py-2 rounded-md font-semibold text-white" style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>Kayıt Ol</button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* If authenticated, show real lessons - placeholder */}
                  <p className="text-sm text-gray-600">Bugün dersleriniz burada görünecek.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">YAKLAŞAN ETKİNLİKLER</h4>
              {/* Upcoming events are only visible to authenticated users (student's own university) */}
              {!isAuthenticated ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">Etkinlikleri görmek için lütfen giriş yapın.</div>
                  <p className="text-sm text-gray-500 mt-2">Kendi üniversitenize ait etkinlikleri görebilmek için giriş yapın.</p>
                  <div className="mt-4">
                    <button onClick={() => navigate('/login')} className="px-4 py-2 rounded-md font-semibold text-white" style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>Giriş Yap</button>
                  </div>
                </div>
              ) : (
                (() => {
                  const events = mockCards.filter((c) => c.isEvent && (selectedUniversity === 'Tüm Üniversiteler' || c.university === selectedUniversity));
                  if (events.length === 0) {
                    return <div className="text-sm text-gray-600">Seçili üniversite için etkinlik bulunamadı.</div>;
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {events.map((ev) => (
                        <ContentCard key={ev.id} card={{ ...ev, isLocked: false }} onPreview={() => handlePreview(ev)} onLockedClick={() => handleLockedClick(ev)} />
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
            </div>
          </section>

          <section className="mt-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockCards
                .filter((c) => selectedUniversity === 'Tüm Üniversiteler' || c.university === selectedUniversity)
                .map((card) => (
                  <ContentCard
                    key={card.id}
                    card={{ ...card, isLocked: !isAuthenticated && card.isLocked }}
                    onPreview={() => handlePreview(card)}
                    onLockedClick={() => handleLockedClick(card)}
                  />
                ))}
            </div>
          </section>
        </main>
      </div>

      <Footer />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onRegister={() => {
          setAuthModalOpen(false);
          navigate('/register');
        }}
        onLogin={() => {
          setAuthModalOpen(false);
          navigate('/login');
        }}
      />

      <PreviewModal
        open={previewModalOpen}
        card={selectedCard}
        onClose={() => setPreviewModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;

