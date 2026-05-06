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
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Rapor Edilen',
      value: stats?.reported_items,
      Icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Yeni Mesaj',
      value: stats?.new_messages,
      Icon: MessageSquare,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Toplam Kullanıcı',
      value: stats?.total_users,
      Icon: Users,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
    },
    {
      label: 'AI Mesaj (Bugün)',
      value: stats?.ai_messages_today,
      Icon: Bot,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Onaylanmış Veri',
      value: stats?.approved_data,
      Icon: CheckCircle,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">HOŞGELDİN, ADMIN!</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Sistemin genel durumu ve bekleyen işlemler</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const StatIcon = stat.Icon;
          return (
            <div
              key={idx}
              className="bg-gray-900/40 border border-gray-800 p-8 rounded-[2rem] flex items-center gap-6 hover:border-gray-700 transition-all group"
            >
              <div className={`${stat.bg} ${stat.color} p-5 rounded-2xl group-hover:scale-110 transition-transform`}>
                <StatIcon size={32} />
              </div>
              <div>
                {loading ? (
                  <div className="h-10 w-16 bg-gray-700/50 rounded-lg animate-pulse mb-1" />
                ) : (
                  <p className="text-4xl font-black text-white mb-1">
                    {stat.value?.toLocaleString('tr-TR') ?? '—'}
                  </p>
                )}
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
