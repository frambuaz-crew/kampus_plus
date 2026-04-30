import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth'; 
import axios from 'axios';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  // 🚀 Context'ten adminLogin fonksiyonunu çekiyoruz
  const { adminLogin } = useAuth(); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 🚀 ARTIK ÇOK DAHA TEMİZ: 
      // API isteği, Token kaydı ve User state güncellemesi tek satırda hallediliyor.
      await adminLogin({ email, password });
      
      // Giriş başarılı! Şimdi karanlık dashboard'a uçuyoruz.
      navigate('/admin/dashboard', { replace: true }); 

    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.detail?.error?.message || 'Invalid credentials';
        setError(msg);
      } else {
        setError('Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        
        {/* 🔐 Kırmızı Kilit İkonu */}
        <div className="flex justify-center mb-8">
          <div className="bg-red-600/20 p-5 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-500/20">
            <Lock size={48} className="text-red-500" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Admin Panel</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Authorized access only</p>
        </div>

        {/* Koyu Gri Form Kutusu */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 p-10 rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kgtu.edu.tr"
                className="w-full bg-gray-900/50 border border-gray-700 text-white px-6 py-4 rounded-2xl focus:ring-2 focus:ring-red-500/50 outline-none transition-all placeholder-gray-600 font-bold"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-900/50 border border-gray-700 text-white px-6 py-4 rounded-2xl focus:ring-2 focus:ring-red-500/50 outline-none transition-all placeholder-gray-600 font-bold"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold animate-shake">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-red-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <ShieldCheck size={22} />
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>

            <Link 
              to="/" 
              className="flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold pt-4"
            >
              <ArrowLeft size={16} /> Back to Student Portal
            </Link>
          </form>
        </div>

        <div className="mt-12 text-center px-8">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] leading-relaxed">
            ⚠️ This area is restricted to authorized administrators only. All access attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
};