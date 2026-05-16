import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import {
  createCourseNoteTopic,
  getCourseNoteTopics,
  type TopicItem,
} from '../../api/course_notes';
import { Search, Plus, X, BookOpen, GraduationCap, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';

export const CourseNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'university_admin';

  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Yeni havuz oluşturma formu
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTopics = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCourseNoteTopics(
        query ? { course_code: query } : undefined,
      );
      setTopics(data);
    } catch {
      setError('Dersler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics(searchQuery);
  }, [fetchTopics, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputValue.trim());
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newTitle.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createCourseNoteTopic({
        course_code: newCourseCode.trim(),
        title: newTitle.trim(),
      });
      setTopics((prev) => [created, ...prev]);
      setShowCreateForm(false);
      setNewCourseCode('');
      setNewTitle('');
    } catch {
      setCreateError('Havuz oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="bg-mesh relative">
        <div className="container mx-auto px-6 py-12 max-w-7xl relative z-10">
          
          {/* Header Section */}
          <header className="mb-12 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-indigo-500/50" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Bilgi Paylaştıkça Çoğalır</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">
                  Ders <span className="text-gradient">Notları</span>
                </h1>
                <p className="text-slate-500 font-medium max-w-xl leading-relaxed">
                  Üniversite hayatının en değerli hazinesi notlar! Ders koduna göre havuzları tara, eksiklerini tamamla veya kendi notlarını paylaşarak topluluğa katkı sağla.
                </p>
              </div>
              {isAdmin && (
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  YENİ HAVUZ OLUŞTUR
                </Button>
              )}
            </div>
          </header>

          {/* Search Bar Section */}
          <div className="mb-12 animate-slide-up">
            <form onSubmit={handleSearch} className="relative group max-w-2xl">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ders kodu ara (örn: CENG401, MATH101)..."
                className="h-16 pl-14 pr-32 bg-white/60 backdrop-blur-xl border-white rounded-3xl shadow-xl shadow-slate-200/50 text-base font-medium focus:bg-white transition-all ring-0 focus:ring-4 focus:ring-indigo-500/5"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => { setInputValue(''); setSearchQuery(''); }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <Button type="submit" className="h-11 rounded-2xl bg-indigo-600 text-white font-bold px-6 hover:bg-indigo-700 transition-all">
                  Ara
                </Button>
              </div>
            </form>
          </div>

          {/* Results Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-white/40 rounded-[2.5rem] border border-white" />
              ))}
            </div>
          ) : error ? (
            <Card className="p-12 text-center rounded-[3rem] border-none bg-red-50/50 text-red-600">
              <p className="font-bold">{error}</p>
              <Button variant="outline" className="mt-4 border-red-200 text-red-600" onClick={() => fetchTopics('')}>Tekrar Dene</Button>
            </Card>
          ) : topics.length === 0 ? (
            <Card className="p-20 text-center rounded-[3.5rem] border-dashed border-2 border-slate-200 bg-transparent shadow-none animate-slide-up">
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                {searchQuery ? `"${searchQuery}" için havuz bulunamadı.` : 'Henüz not havuzu yok.'}
              </h3>
              <p className="text-slate-400 font-medium mb-8">
                {isAdmin ? 'Hemen bir tane oluşturarak ilk adımı atabilirsin!' : 'Bir adminin yeni bir havuz oluşturmasını beklemelisin.'}
              </p>
              {isAdmin && (
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="bg-indigo-600 text-white rounded-2xl px-10 h-14 font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  İLK HAVUZU OLUŞTUR
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
              {topics.map((topic) => (
                <Card
                  key={topic.id}
                  onClick={() => navigate(`/dashboard/course-notes/${topic.id}`)}
                  className="group p-8 rounded-[2.5rem] border-white/60 bg-white/40 backdrop-blur-md hover:bg-white/80 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="px-4 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-black tracking-widest uppercase">
                        {topic.course_code}
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-900 mb-6 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {topic.title}
                    </h3>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                           {topic.creator?.first_name[0]}{topic.creator?.last_name[0]}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PAYLAŞAN</span>
                           <span className="text-xs font-bold text-slate-600">{topic.creator?.first_name} {topic.creator?.last_name}</span>
                         </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">NOT SAYISI</span>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-sm font-black text-slate-900">{topic.entry_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Decorative Sparkle */}
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all" />
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Topic Modal / Overlay */}
        {isAdmin && showCreateForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateForm(false)} />
            <Card className="relative w-full max-w-lg p-10 rounded-[3rem] shadow-2xl border-none bg-white animate-scale-up">
              <button 
                onClick={() => setShowCreateForm(false)}
                className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-10">
                <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Yeni Not Havuzu</h2>
                <p className="text-slate-400 font-medium mt-1">Bilgiyi topluluğa kazandırmaya hazırsın!</p>
              </div>

              <form onSubmit={handleCreateTopic} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">DERS KODU</label>
                  <Input
                    type="text"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                    placeholder="Örn: CENG401"
                    maxLength={20}
                    required
                    className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">HAVUZ BAŞLIĞI</label>
                  <Input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Örn: Algoritma Analizi ve Tasarımı"
                    maxLength={200}
                    required
                    className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 transition-all font-bold"
                  />
                </div>
                
                {createError && (
                  <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold animate-shake">
                    {createError}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:text-slate-600"
                  >
                    VAZGEÇ
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-[2] h-14 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                  >
                    {creating ? 'OLUŞTURULUYOR...' : 'HAVUZU OLUŞTUR'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
