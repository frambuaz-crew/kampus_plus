import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { Bot, ShoppingBag, Briefcase, MessageSquare } from 'lucide-react';

const FEATURES = [
  { icon: Bot, text: 'AI destekli akademik asistan' },
  { icon: MessageSquare, text: 'Binlerce öğrenciyle forum' },
  { icon: ShoppingBag, text: 'İkinci el pazar yeri' },
  { icon: Briefcase, text: 'Staj ve kariyer fırsatları' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">

      {/* ─── Left panel ─── */}
      <div className="hidden lg:flex lg:w-[45%] bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0ea5e9]/10 rounded-full" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#0ea5e9]/5 rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#0ea5e9] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">K+</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">KAMPUS+</span>
          </button>
        </div>

        {/* Center content */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
              Kampüs hayatın<br />tek platformda.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Türkiye'nin en kapsamlı üniversite öğrenci platformuna giriş yap.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#0ea5e9]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-[#0ea5e9]" />
                </div>
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-2">
            {[{ v: '12K+', l: 'Öğrenci' }, { v: '350+', l: 'Üniversite' }].map((s) => (
              <div key={s.l}>
                <p className="text-[#0ea5e9] text-2xl font-extrabold">{s.v}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="relative text-slate-600 text-xs">
          © 2026 Kampus+. Tüm hakları saklıdır.
        </p>
      </div>

      {/* ─── Right panel ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K+</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">KAMPUS+</span>
          </button>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Tekrar hoş geldin</h1>
            <p className="text-slate-500 text-sm">Hesabına giriş yap ve devam et</p>
          </div>

          <LoginForm
            onSuccess={(user) => {
              const redirectTarget =
                user.role === 'admin' || user.role === 'university_admin'
                  ? '/admin/dashboard'
                  : '/dashboard';
              window.location.href = redirectTarget;
            }}
          />

          <p className="mt-6 text-center text-sm text-slate-500">
            Hesabın yok mu?{' '}
            <Link to="/register" className="text-[#0ea5e9] font-semibold hover:underline">
              Kayıt ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
