import React, { useEffect, useState } from 'react';
import {
  Users, GraduationCap, AlertTriangle,
  MessageSquare, Bot, CheckCircle,
} from 'lucide-react';
import { getDashboardStats } from '../../api/admin_dashboard';
import type { DashboardStatsResponse } from '../../api/admin_dashboard';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Bekleyen Katkı',
      value: stats?.pending_contributions,
      Icon: GraduationCap,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Rapor Edilen',
      value: stats?.reported_items,
      Icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Yeni Mesaj',
      value: stats?.new_messages,
      Icon: MessageSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Toplam Kullanıcı',
      value: stats?.total_users,
      Icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'AI Mesaj (Bugün)',
      value: stats?.ai_messages_today,
      Icon: Bot,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Onaylanmış Veri',
      value: stats?.approved_data,
      Icon: CheckCircle,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hoş Geldin, Yönetici! 👋</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Sistemin genel durumu ve bekleyen işlemler</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const StatIcon = stat.Icon;
          return (
            <div
              key={idx}
              className="bg-white shadow-xl shadow-slate-200/40 border border-slate-100/50 p-8 rounded-[2.5rem] flex items-center gap-6 hover:shadow-2xl hover:shadow-sky-200/20 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`${stat.bg} ${stat.color} p-5 rounded-2xl group-hover:scale-110 transition-transform`}>
                <StatIcon size={32} />
              </div>
              <div>
                {loading ? (
                  <div className="h-10 w-16 bg-slate-100 rounded-lg animate-pulse mb-1" />
                ) : (
                  <p className="text-4xl font-black text-slate-900 mb-1">
                    {stat.value?.toLocaleString('tr-TR') ?? '—'}
                  </p>
                )}
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
