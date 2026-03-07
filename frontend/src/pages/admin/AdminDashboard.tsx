import React from 'react';
import { 
  Users, GraduationCap, AlertTriangle, 
  MessageSquare, Bot, CheckCircle,
} from 'lucide-react';

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

    </div>
  );
};