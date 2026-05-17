import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, MessageSquare, ShoppingBag, Briefcase, CalendarDays, Users,
  ArrowRight, ChevronDown, Star, Zap, Shield, CheckCircle2, 
  Sparkles, Globe, Rocket, Menu, X
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Özellikler', href: '#features' },
  { label: 'Topluluk', href: '#testimonials' },
  { label: 'Sıkça Sorulanlar', href: '#faq' },
];

const FEATURES = [
  {
    icon: Bot,
    title: 'Akademik AI Asistanı',
    desc: 'Ders notlarını analiz eden, ödevlerine yardım eden ve sorularına 7/24 yanıt veren yapay zeka.',
    color: 'text-sky-600 bg-sky-50',
    border: 'border-sky-100',
  },
  {
    icon: MessageSquare,
    title: 'Öğrenci Forumu',
    desc: 'Kampüsündeki ve Türkiye genelindeki öğrencilerle tartış, not paylaş ve yardımlaş.',
    color: 'text-violet-600 bg-violet-50',
    border: 'border-violet-100',
  },
  {
    icon: ShoppingBag,
    title: 'Güvenli Pazar Yeri',
    desc: 'İkinci el kitap, elektronik eşya ve daha fazlasını sadece öğrenciler arasında al-sat.',
    color: 'text-emerald-600 bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: Briefcase,
    title: 'Kariyer & Staj',
    desc: 'Sektör liderlerinden staj fırsatları, yarı zamanlı işler ve proje ortaklıkları.',
    color: 'text-amber-600 bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: CalendarDays,
    title: 'Akademik Planlayıcı',
    desc: 'Ders programın, sınav tarihlerin ve önemli akademik duyurular tek bir panelde.',
    color: 'text-rose-600 bg-rose-50',
    border: 'border-rose-100',
  },
  {
    icon: Users,
    title: 'Geniş Kampüs Ağı',
    desc: 'İlgi alanlarına göre yeni arkadaşlar edin ve kulüp etkinliklerini takip et.',
    color: 'text-indigo-600 bg-indigo-50',
    border: 'border-indigo-100',
  },
];

const TESTIMONIALS = [
  {
    name: 'Ayşe Kaya',
    uni: 'Boğaziçi Üniversitesi',
    text: 'AI asistanı sınav haftalarımın kurtarıcısı oldu. Karmaşık konuları o kadar iyi özetliyor ki!',
    avatar: 'AK',
  },
  {
    name: 'Mert Demir',
    uni: 'ODTÜ',
    text: 'Pazar yeri üzerinden tüm hazırlık kitaplarımı çok uygun fiyata aldım. Sistem çok güvenli.',
    avatar: 'MD',
  },
  {
    name: 'Zeynep Aydın',
    uni: 'İTÜ',
    text: 'Kariyer bölümündeki staj ilanları sayesinde hayalimdeki şirkette çalışmaya başladım.',
    avatar: 'ZA',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white selection:bg-sky-100 selection:text-sky-900 overflow-x-hidden">
      
      {/* ─── Navbar ─── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-nav h-16 shadow-sm' : 'bg-transparent h-20'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-200 group-hover:scale-110 transition-transform duration-300">
              <span className="text-white font-black text-sm">K+</span>
            </div>
            <span className="font-bold text-slate-900 text-xl tracking-tight">KAMPUS<span className="text-sky-600">+</span></span>
          </button>

          <nav className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-semibold text-slate-600 hover:text-sky-600 transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-sky-600 after:transition-all hover:after:w-full"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => navigate('/login')}
              className="hidden md:block text-sm font-bold text-slate-700 hover:text-sky-600 transition-colors"
            >
              Giriş Yap
            </button>
            <button
              onClick={() => navigate('/register')}
              className="hidden md:block btn-premium bg-slate-900 text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-slate-800 shadow-lg shadow-slate-200"
            >
              Kayıt Ol
            </button>
            <button
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors ml-1"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <div className={`md:hidden fixed inset-x-0 top-[72px] bg-white/95 backdrop-blur-md shadow-lg border-t border-slate-100 transition-all duration-300 origin-top z-40 ${
        isMobileMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
      }`}>
        <div className="flex flex-col px-6 py-8 gap-6">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-bold text-slate-700 hover:text-sky-600 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div className="h-px bg-slate-100 my-2" />
          <button
            onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
            className="w-full text-center text-lg font-bold text-slate-700 hover:text-sky-600 transition-colors py-3"
          >
            Giriş Yap
          </button>
          <button
            onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
            className="w-full text-center bg-sky-600 text-white text-lg font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-sky-200"
          >
            Hemen Kayıt Ol
          </button>
        </div>
      </div>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 px-6 bg-mesh overflow-hidden">
        {/* Animated Blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl animate-pulse-slow -z-10" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl animate-pulse-slow delay-500 -z-10" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-sky-100/80 backdrop-blur-sm text-sky-700 text-[13px] font-bold px-4 py-2 rounded-full mb-8 border border-sky-200/50">
              <Sparkles className="w-4 h-4 text-sky-500" />
              Türkiye'nin En Modern Öğrenci Platformu
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-6 sm:mb-8">
              Üniversite Hayatını <br className="hidden sm:block" />
              <span className="text-gradient">Akıllandır.</span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed mb-8 sm:mb-10 max-w-lg">
              KAMPUS+ ile akademik başarını artır, güvenle alışveriş yap ve 
              hayalindeki kariyer fırsatlarını yakala. Hepsi tek bir yerde.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="btn-premium w-full sm:w-auto flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-sky-200 text-base"
              >
                Hemen Ücretsiz Katıl <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative animate-slide-in-right">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000" />
              <div className="relative rounded-[2.5rem] overflow-hidden border border-white/40 shadow-2xl aspect-[4/3] lg:aspect-square">
                <img 
                  src="/campus_hero.png" 
                  alt="Kampüs Hayatı" 
                  className="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-110"
                />
                {/* Overlay gradient for better contrast with floating elements */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
              </div>
            </div>

            {/* Floating Badges */}
            <div className="absolute -top-4 -right-2 sm:-top-6 sm:-right-6 glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl animate-float shadow-xl border border-white/50 z-10 max-w-[150px] sm:max-w-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Güvenli Pazar</p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900">Doğrulanmış Öğrenciler</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-2 sm:-bottom-10 sm:-left-10 glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl animate-float delay-500 shadow-xl border border-white/50 z-10 max-w-[150px] sm:max-w-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Star className="w-6 h-6 fill-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Yüksek Puan</p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900">4.9/5 Kullanıcı Memnuniyeti</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-16 sm:py-24 lg:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-slide-up">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 sm:mb-6 tracking-tight">
              İhtiyacın Olan <span className="text-sky-600">Her Şey</span> Burada
            </h2>
            <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto font-medium">
              Sadece bir uygulama değil, tüm üniversite hayatını organize edebileceğin bir ekosistem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, idx) => (
              <div
                key={f.title}
                onClick={() => navigate('/register')}
                className={`group p-8 rounded-[2rem] border cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-sky-100/50 hover:-translate-y-2 bg-white animate-slide-up delay-${(idx + 1) * 100}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 ${f.color}`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium mb-6">
                  {f.desc}
                </p>
                <div className="flex items-center text-sky-600 font-bold text-sm gap-2 group-hover:translate-x-1 transition-transform">
                  Keşfet <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof / Testimonials ─── */}
      <section id="testimonials" className="py-16 sm:py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 sm:mb-6">
                Öğrenciler <br /> 
                <span className="text-sky-600">Bize Güveniyor</span>
              </h2>
              <p className="text-slate-500 font-medium mb-8">
                Kampüsünü dijital dünyaya taşıyan binlerce öğrencinin deneyimlerine göz at.
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                ))}
                <span className="ml-2 font-bold text-slate-900">4.9 / 5.0</span>
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div key={t.name} className={`p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-300 ${i === 2 ? 'md:col-span-2' : ''}`}>
                  <p className="text-slate-600 italic mb-8 font-medium leading-relaxed">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center font-bold text-sky-600">
                      {t.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.name}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase">{t.uni}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="py-16 sm:py-24 lg:py-32 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-4">Sıkça Sorulan Sorular</h2>
            <p className="text-slate-500 font-medium">Aklınıza takılan soruların yanıtlarını burada bulabilirsiniz.</p>
          </div>
          
          <div className="space-y-4">
            {[
              { q: 'Platformu kullanmak ücretli mi?', a: 'Hayır, KAMPUS+ temel özellikleri tüm öğrenciler için tamamen ücretsizdir.' },
              { q: 'Sadece belirli üniversiteler mi katılabiliyor?', a: 'Hayır, Türkiye genelindeki tüm üniversite öğrencileri platforma kayıt olabilir.' },
              { q: 'Verilerim güvende mi?', a: 'Evet, verileriniz en üst düzey güvenlik standartlarıyla korunur ve üçüncü taraflarla paylaşılmaz.' },
              { q: 'AI Asistanı her ders için yardımcı olabilir mi?', a: 'Evet, AI asistanımız geniş bir akademik bilgi birikimine sahiptir ve çoğu branşta size rehberlik edebilir.' }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                <h4 className="font-bold text-slate-900 mb-2">{item.q}</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto relative bg-slate-900 rounded-3xl sm:rounded-[3rem] overflow-hidden p-8 sm:p-12 lg:p-24 text-center">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -z-0" />
          
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-6 sm:mb-8 tracking-tight">
              Kampüs Hayatını <br className="hidden sm:block" /> Bugün Değiştir.
            </h2>
            <p className="text-sky-100/60 text-base sm:text-lg lg:text-xl mb-10 sm:mb-12 max-w-2xl mx-auto font-medium">
              Sadece birkaç dakika içinde üye ol ve üniversitenin dijital dünyasına adım at. Üstelik tamamen ücretsiz.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                onClick={() => navigate('/register')}
                className="btn-premium w-full sm:w-auto bg-white text-slate-900 font-extrabold px-10 py-5 rounded-2xl text-lg hover:scale-105 transition-transform"
              >
                Hemen Ücretsiz Kaydol
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 text-white font-bold hover:text-sky-300 transition-colors"
              >
                Giriş Yap <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-16 flex flex-wrap justify-center gap-10 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
               <div className="flex items-center gap-2 text-white font-bold"><Globe className="w-5 h-5"/> Global Ağ</div>
               <div className="flex items-center gap-2 text-white font-bold"><Shield className="w-5 h-5"/> Güvenli Veri</div>
               <div className="flex items-center gap-2 text-white font-bold"><Rocket className="w-5 h-5"/> Hızlı Erişim</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-white border-t border-slate-100 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">K+</span>
              </div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">KAMPUS+</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Üniversite öğrencilerinin sosyal ve akademik hayatını kolaylaştırmak için geliştirildi.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Platform</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li onClick={() => navigate('/register')} className="hover:text-sky-600 cursor-pointer transition-colors">Forum</li>
              <li onClick={() => navigate('/register')} className="hover:text-sky-600 cursor-pointer transition-colors">Pazar Yeri</li>
              <li onClick={() => navigate('/register')} className="hover:text-sky-600 cursor-pointer transition-colors">Kariyer</li>
              <li onClick={() => navigate('/register')} className="hover:text-sky-600 cursor-pointer transition-colors">AI Asistan</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Kurumsal</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li className="hover:text-sky-600 cursor-pointer transition-colors">Hakkımızda</li>
              <li className="hover:text-sky-600 cursor-pointer transition-colors">Gizlilik Politikası</li>
              <li className="hover:text-sky-600 cursor-pointer transition-colors">Kullanım Koşulları</li>
              <li className="hover:text-sky-600 cursor-pointer transition-colors">İletişim</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Takipte Kal</h4>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-sky-50 hover:text-sky-600 cursor-pointer transition-all border border-slate-100">
                  <div className="w-4 h-4 bg-current rounded-sm opacity-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-bold">© 2026 KAMPUS+. TÜM HAKLARI SAKLIDIR.</p>
          <div className="flex gap-8 text-xs font-bold text-slate-400">
            <span className="hover:text-slate-900 cursor-pointer">TÜRKÇE</span>
            <span className="hover:text-slate-900 cursor-pointer">ENGLISH</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
