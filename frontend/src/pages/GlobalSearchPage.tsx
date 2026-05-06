import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { apiClient } from '../api/config';
import {
  Search,
  MessageSquare,
  ShoppingBag,
  Briefcase,
  User,
  Loader2,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';

interface SearchHit {
  id: string;
  title: string;
  snippet?: string | null;
  href: string;
  type: string;
  image_url?: string | null;
}

interface SearchSection {
  title: string;
  hits: SearchHit[];
  total: number;
}

interface GlobalSearchResponse {
  query: string;
  results: Record<string, SearchSection>;
}

const icons: Record<string, React.FC<{ className?: string }>> = {
  forum: MessageSquare,
  marketplace: ShoppingBag,
  career: Briefcase,
  user: User,
  page: LayoutDashboard,
  pages: LayoutDashboard,
};

export const GlobalSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramQuery = useMemo(() => searchParams.get('q')?.trim() || '', [searchParams]);

  const [input, setInput] = useState(paramQuery);
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setInput(paramQuery);
  }, [paramQuery]);

  const fetchSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setData(null);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await apiClient.get<GlobalSearchResponse>('/search', { params: { q, limit: 10 } });
      setData(res.data);
    } catch (e) {
      console.error('Search error:', e);
      setData(null);
      setErr('Arama yapılamadı. Giriş yaptığınızdan emin olun ve tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSearch(paramQuery);
  }, [paramQuery, fetchSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (t.length < 2) {
      setErr('En az 2 karakter girin.');
      return;
    }
    setErr(null);
    setSearchParams({ q: t });
  };

  return (
    <MainLayout>
      <div className="w-full min-h-screen bg-slate-50 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Search className="w-6 h-6 text-slate-500" />
            Arama
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Sayfalara hızlı git, forum / pazar / kariyer ve kullanıcılar içinde arayın.
          </p>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm">
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Örn. kariyer, pazar, ders notu, @kullanıcı…"
                className="flex-1 min-w-0 px-4 py-2.5 text-sm border-0 rounded-lg focus:ring-0 focus:outline-none bg-transparent"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Ara
              </button>
            </div>
            {err && <p className="text-sm text-red-500 mt-2">{err}</p>}
          </form>

          {paramQuery && paramQuery.length < 2 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
              Aramak için en az 2 karakter gerekir.
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Aranıyor…
            </div>
          )}

          {!loading && data && paramQuery.length >= 2 && (
            <>
              {(() => {
                const totalHits = Object.values(data.results).reduce((sum, s) => sum + s.total, 0);
                return (
                  <p className="text-sm text-slate-500 mb-4">
                    <strong className="text-slate-800">{totalHits}</strong> sonuç: &ldquo;{data.query}&rdquo;
                  </p>
                );
              })()}

              {Object.values(data.results).every((s) => s.hits.length === 0) ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Sonuç bulunamadı</p>
                  <p className="text-sm text-slate-400 mt-1">Farklı kelimeler veya kısayol adları deneyin (ör. kariyer, pazar).</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(data.results).map(([key, section]) => {
                    if (section.hits.length === 0) return null;
                    return (
                      <div key={key}>
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          {section.title}
                        </h2>
                        <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                          {section.hits.map((hit) => {
                            const iconKey = hit.type === 'page' ? 'page' : hit.type;
                            const Icon = icons[iconKey] || Search;
                            return (
                              <li key={`${hit.type}-${hit.id}`}>
                                <Link
                                  to={hit.href}
                                  className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors group"
                                >
                                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 group-hover:bg-sky-50 group-hover:text-[#0ea5e9]">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0ea5e9] truncate">
                                      {hit.title}
                                    </p>
                                    {hit.snippet && (
                                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{hit.snippet}</p>
                                    )}
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!paramQuery && !loading && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-700 font-medium">Ne aramak istersiniz?</p>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                <strong className="text-slate-600">kariyer</strong>, <strong className="text-slate-600">pazar</strong>, <strong className="text-slate-600">mesaj</strong> gibi kısa kelimelerle
                sayfalara gidebilir; ilan ve konu aramak için 2+ karakter yazın.
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
