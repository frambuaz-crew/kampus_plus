import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, MessageSquare, ShoppingBag, Briefcase, CalendarDays, Users,
  ArrowRight, ChevronDown, Star, Zap, Shield,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Özellikler', href: '#features' },
  { label: 'Forum', href: '/register' },
  { label: 'Pazar', href: '/register' },
  { label: 'Kariyer', href: '/register' },
  { label: 'AI Asistanı', href: '/register' },
];

const FEATURES = [
  {
    icon: Bot,
    title: 'AI Asistanı',
    desc: 'Akademik sorularına anında yanıt al, ödevlerinde yardım iste',
    route: '/dashboard/ai-assistant',
    color: 'text-[#0ea5e9] bg-[#e0f2fe]',
  },
  {
    icon: MessageSquare,
    title: 'Forum',
    desc: 'Üniversiteli arkadaşlarınla tartış, deneyimlerini paylaş',
    route: '/forum',
    color: 'text-violet-600 bg-violet-50',
  },
  {
    icon: ShoppingBag,
    title: 'Pazar',
    desc: 'İkinci el kitap, elektronik ve daha fazlası al-sat',
    route: '/dashboard/marketplace',
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    icon: Briefcase,
    title: 'Kariyer',
    desc: 'İş ilanları, staj fırsatları ve proje ortaklıkları',
    route: '/dashboard/career',
    color: 'text-amber-600 bg-amber-50',
  },
  {
    icon: CalendarDays,
    title: 'Akademik Araçlar',
    desc: 'Ders programın, akademik takvim ve önemli tarihler',
    route: '/dashboard',
    color: 'text-rose-600 bg-rose-50',
  },
  {
    icon: Users,
    title: 'Ağ',
    desc: 'Kampüsünden ve diğer üniversitelerden arkadaş edin',
    route: '/dashboard',
    color: 'text-indigo-600 bg-indigo-50',
  },
];

const STATS = [
  { value: '12.000+', label: 'Öğrenci' },
  { value: '350+', label: 'Üniversite' },
  { value: '500K+', label: 'Forum Gönderisi' },
];

const TESTIMONIALS = [
  {
    name: 'Ayşe K.',
    uni: 'Boğaziçi Üniversitesi',
    text: 'AI asistanı sayesinde ders çalışma sürem yarıya indi. Harika bir platform!',
  },
  {
    name: 'Mert D.',
    uni: 'ODTÜ',
    text: 'Staj ilanını Kariyer bölümünden buldum. Tek platform, her şey var.',
  },
  {
    name: 'Zeynep A.',
    uni: 'İTÜ',
    text: 'Pazar bölümünden ders kitaplarımı ucuza aldım. Kesinlikle tavsiye ederim.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K+</span>
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">KAMPUS+</span>
          </button>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              l.href.startsWith('#') ? (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {l.label}
                </a>
              ) : (
                <button
                  key={l.label}
                  onClick={() => navigate(l.href)}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {l.label}
                </button>
              )
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              Giriş Yap
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Kayıt Ol
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="bg-gradient-to-b from-slate-50 to-white pt-20 pb-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#e0f2fe] text-[#0284c7] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5" />
              Türkiye'nin #1 Öğrenci Platformu
            </div>

            <h1 className="text-5xl font-extrabold text-slate-900 leading-tight tracking-tight mb-5">
              Kampüs Hayatını Yönet,{' '}
              <span className="text-[#0ea5e9]">Geleceğini Şekillendir</span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-lg">
              Türkiye'nin en kapsamlı üniversite öğrenci platformu. AI asistanı,
              forum, pazar yeri ve kariyer fırsatları tek bir yerde.
            </p>

            <div className="flex items-center gap-4 mb-12">
              <button
                onClick={() => navigate('/register')}
                className="flex items-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-lg shadow-sky-200"
              >
                Hemen Başla <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
              >
                Nasıl Çalışır <ChevronDown className="w-4 h-4" />
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-10">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold text-[#0ea5e9]">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right – Dashboard Preview Card */}
          <div className="relative">
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200 overflow-hidden">
              {/* Card header */}
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-slate-400">kampusplus.com/dashboard</span>
              </div>

              {/* Preview body */}
              <div className="p-6 min-h-[320px] flex flex-col gap-4">
                {/* Top badge */}
                <div className="flex justify-end">
                  <span className="bg-[#0ea5e9] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    247 aktif ilan
                  </span>
                </div>

                {/* Mock stats row */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Mesajlar', value: '3', color: 'bg-sky-50 border-sky-100' },
                    { label: 'AI Kredisi', value: '50', color: 'bg-violet-50 border-violet-100' },
                    { label: 'İlanlarım', value: '2', color: 'bg-emerald-50 border-emerald-100' },
                    { label: 'Arkadaşlar', value: '12', color: 'bg-amber-50 border-amber-100' },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl border p-3 ${item.color}`}>
                      <p className="text-lg font-bold text-slate-900">{item.value}</p>
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent activity mock */}
                <div className="space-y-2 mt-2">
                  {[
                    { icon: '💬', text: 'Forum\'da yeni yanıt', time: '2dk' },
                    { icon: '📦', text: 'Pazar ilanınıza mesaj', time: '5dk' },
                    { icon: '💼', text: 'Staj başvurusu onaylandı', time: '1sa' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-xs text-slate-600 flex-1">{item.text}</span>
                      <span className="text-[10px] text-slate-400">{item.time}</span>
                    </div>
                  ))}
                </div>

                {/* AI button */}
                <button
                  onClick={() => navigate('/register')}
                  className="mt-auto flex items-center gap-2 text-sm text-[#0ea5e9] font-medium hover:underline"
                >
                  <Bot className="w-4 h-4" />
                  AI ile soru sor
                </button>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-semibold text-slate-700">4.9/5 öğrenci memnuniyeti</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Kampüs Hayatın İçin Her Şey</h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              Akademik başarıdan sosyal hayata kadar ihtiyacın olan tüm araçlar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <button
                key={f.title}
                onClick={() => navigate('/register')}
                className="group text-left p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all bg-white"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Öğrenciler Ne Diyor?</h2>
            <p className="text-sm text-slate-500">Binlerce öğrencinin güvendiği platform</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.uni}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-6 bg-[#0ea5e9]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <Shield className="w-3.5 h-3.5" />
            Ücretsiz · Güvenli · Öğrencilere Özel
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Hemen Katıl, Ücretsiz Başla
          </h2>
          <p className="text-sky-100 text-base mb-8 max-w-lg mx-auto">
            Binlerce öğrenciye katıl. Dakikalar içinde hesabını oluştur ve tüm özelliklere eriş.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 bg-white text-[#0ea5e9] hover:bg-sky-50 font-bold px-8 py-3.5 rounded-xl transition-colors text-sm shadow-xl"
            >
              Ücretsiz Hesap Oluştur <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">K+</span>
            </div>
            <span className="font-bold text-white text-base">KAMPUS+</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 Kampus+. Tüm hakları saklıdır.</p>
          <div className="flex gap-6 text-xs">
            <a href="#" className="hover:text-white transition-colors">Gizlilik</a>
            <a href="#" className="hover:text-white transition-colors">Kullanım Koşulları</a>
            <a href="#" className="hover:text-white transition-colors">İletişim</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
