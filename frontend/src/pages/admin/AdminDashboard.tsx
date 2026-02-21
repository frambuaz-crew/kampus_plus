import React from 'react';
import { 
  Users, GraduationCap, AlertTriangle, 
  MessageSquare, Bot, CheckCircle, 
  ArrowRight, Calendar, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  // 🚀 İKONLARI BİLEŞEN OLARAK SAKLIYORUZ (TypeScript dostu yöntem)
  const stats = [
    { label: 'Bekleyen Katkı', value: '12', Icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Rapor Edilen', value: '7', Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Yeni Mesaj', value: '3', Icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Toplam Kullanıcı', value: '1,247', Icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'AI Mesaj (Bugün)', value: '2,543', Icon: Bot, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Onaylanmış Veri', value: '45', Icon: CheckCircle, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  ];

  const quickAccess = [
    { label: 'Ders Programı Yönetimi', path: '/admin/academic/course-schedule', Icon: Calendar },
    { label: 'Akademik Takvim Yönetimi', path: '/admin/academic/calendar', Icon: Clock },
    { label: 'Bekleyen Katkılar', path: '/admin/academic/pending-contributions', Icon: GraduationCap, count: 12 },
    { label: 'Rapor Edilen İçerikler', path: '/admin/moderation/reports', Icon: AlertTriangle },
    { label: 'AI Assistant Ayarları', path: '/admin/ai/settings', Icon: Bot },
    { label: 'Kullanıcı Yönetimi', path: '/admin/users', Icon: Users },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 👋 Karşılama - Spec 2.2 gereği */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">HOŞGELDİN, ADMIN!</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Sistemin genel durumu ve bekleyen işlemler</p>
      </div>

      {/* 📊 İstatistik Kartları - Spec 2.2 gereği */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const StatIcon = stat.Icon; // 💡 Değişkene atayarak bileşen olarak kullanıyoruz
          return (
            <div key={idx} className="bg-gray-900/40 border border-gray-800 p-8 rounded-[2rem] flex items-center gap-6 hover:border-gray-700 transition-all group">
              <div className={`${stat.bg} ${stat.color} p-5 rounded-2xl group-hover:scale-110 transition-transform`}>
                <StatIcon size={32} /> 
              </div>
              <div>
                <p className="text-4xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ⚡ Hızlı Erişim - Spec 2.3 gereği */}
      <div className="space-y-6">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
          <div className="w-2 h-8 bg-red-600 rounded-full"></div>
          HIZLI ERİŞİM
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickAccess.map((item, idx) => {
            const ItemIcon = item.Icon; // 💡 Değişkene atayarak bileşen olarak kullanıyoruz
            return (
              <Link 
                key={idx} 
                to={item.path}
                className="bg-gray-900/60 border border-gray-800 hover:border-red-600/50 p-6 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4 text-gray-300 group-hover:text-white">
                  <div className="text-gray-500 group-hover:text-red-500 transition-colors">
                    <ItemIcon size={24} />
                  </div>
                  <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
                  {item.count && (
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black ml-1">
                      {item.count}
                    </span>
                  )}
                </div>
                <ArrowRight size={18} className="text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};