import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, UserX, Search, Eye, Shield, ShieldOff,
  CheckCircle, RefreshCw, AlertCircle, X, Calendar, Mail,
  Building2, BookOpen, Hash, Clock, ChevronLeft, ChevronRight,
  UserCog,
} from 'lucide-react';
import {
  getAdminUserStats,
  getAdminUsers,
  toggleUserBlock,
  toggleUserVerification,
  changeUserRole,
} from '../../api/users';
import type { AdminUser, AdminUserStats, UserStatus } from '../../types/admin';

import { useAuth } from '../../hooks/useAuth';

// ─── Constants ───────────────────────────────────────────────────────────────

type Tab = 'all' | 'verified' | 'blocked';
const LIMIT = 20;

const TABS = [
  { key: 'all' as Tab,      label: 'Tüm Kullanıcılar', icon: <Users size={16} /> },
  { key: 'verified' as Tab, label: 'Doğrulanmış',       icon: <UserCheck size={16} /> },
  { key: 'blocked' as Tab,  label: 'Engellenenler',     icon: <UserX size={16} /> },
];

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  student:          { label: 'Öğrenci',      className: 'bg-blue-50 text-blue-600 border border-blue-100' },
  instructor:       { label: 'Eğitmen',      className: 'bg-purple-50 text-purple-650 border border-purple-100' },
  admin:            { label: 'Admin',         className: 'bg-red-50 text-red-600 border border-red-100' },
  university_admin: { label: 'Üniv. Admin',  className: 'bg-orange-50 text-orange-600 border border-orange-100' },
};

// This role is managed outside the standard admin panel and must never appear in pickers.
const PROTECTED_ROLE = 'admin';

const ROLE_OPTIONS = [
  { value: 'student',          label: 'Öğrenci' },
  { value: 'instructor',       label: 'Eğitmen' },
  { value: 'university_admin', label: 'Üniversite Admin' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function initials(u: AdminUser): string {
  return `${u.first_name.charAt(0)}${u.last_name.charAt(0)}`.toUpperCase();
}

// ─── Detail Row (used inside modals) ─────────────────────────────────────────

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}> = ({ icon, label, value, mono, children }) => (
  <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
    <span className="text-slate-400 mt-0.5 shrink-0 w-4 flex justify-center">{icon}</span>
    <span className="text-xs text-slate-400 w-28 shrink-0 pt-0.5">{label}</span>
    {children ?? (
      <span className={`text-[11px] ${mono ? 'font-mono text-[11px] break-all text-slate-500' : 'font-medium text-slate-705 text-slate-700'}`}>
        {value || '—'}
      </span>
    )}
  </div>
);

// ─── Inspect Modal ────────────────────────────────────────────────────────────

const UserInspectModal: React.FC<{
  user: AdminUser;
  onClose: () => void;
}> = ({ user, onClose }) => {
  const roleInfo = ROLE_CONFIG[user.role] ?? { label: user.role, className: 'bg-slate-100 text-slate-600 border border-slate-200' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sm font-black text-sky-600 shrink-0 border border-sky-100">
              {initials(user)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-slate-400 truncate">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status badges */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0 flex-wrap">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${user.is_active ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
            {user.is_active ? '● Aktif' : '● Engelli'}
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${user.is_verified ? 'bg-green-50 border-green-100 text-green-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
            {user.is_verified ? '✓ Doğrulanmış' : '⚠ Doğrulanmamış'}
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${roleInfo.className}`}>
            {roleInfo.label}
          </span>
        </div>

        {/* Details */}
        <div className="px-6 py-3 overflow-y-auto flex-1 min-h-0 bg-white">
          <DetailRow icon={<Hash size={12} />}       label="Kullanıcı ID"   value={user.id}               mono />
          <DetailRow icon={<Mail size={12} />}        label="E-posta"        value={user.email} />
          <DetailRow icon={<Building2 size={12} />}   label="Üniversite"     value={user.university ?? undefined} />
          <DetailRow icon={<BookOpen size={12} />}    label="Bölüm"          value={user.department ?? undefined} />
          <DetailRow icon={<UserCog size={12} />}     label="Sınıf"          value={user.grade ?? undefined} />
          <DetailRow icon={<Calendar size={12} />}    label="Kayıt Tarihi"   value={fmtDateLong(user.created_at)} />
          <DetailRow icon={<Clock size={12} />}       label="Son Giriş"      value={fmtDateLong(user.last_login)} />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-100 border border-slate-200 text-slate-650 rounded-xl hover:bg-slate-200 hover:text-slate-800 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Role Change Modal ────────────────────────────────────────────────────────

const RoleChangeModal: React.FC<{
  user: AdminUser;
  onClose: () => void;
  onConfirm: (role: string) => Promise<void>;
}> = ({ user, onClose, onConfirm }) => {
  const { user: currentUser } = useAuth();
  const [selected, setSelected] = useState(user.role);
  const [saving, setSaving] = useState(false);

  const filteredOptions = ROLE_OPTIONS.filter(opt => {
    if (currentUser?.role === 'university_admin' && opt.value === 'university_admin') {
      return false;
    }
    return true;
  });

  const handleSave = async () => {
    if (selected === user.role) { onClose(); return; }
    setSaving(true);
    try {
      await onConfirm(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-905 text-slate-900">Rol Değiştir</h3>
            <p className="text-xs text-slate-400 mt-0.5">{user.first_name} {user.last_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          {filteredOptions.map(opt => {
            const cfg = ROLE_CONFIG[opt.value];
            const isActive = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  isActive
                    ? 'border-sky-600 bg-sky-50 text-sky-600'
                    : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg?.className ?? ''}`}>
                  {cfg?.label ?? opt.label}
                </span>
                <span className="flex-1 text-left text-xs">{opt.label}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 text-slate-650 rounded-xl hover:bg-slate-200 hover:text-slate-800 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || selected === user.role}
            className="px-3 py-1.5 text-xs font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-500 disabled:opacity-40 shadow-md shadow-sky-500/10 transition-colors"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stats Skeleton ───────────────────────────────────────────────────────────

const StatSkeleton: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] p-5 border border-slate-100/55 animate-pulse shadow-sm">
    <div className="h-4 w-20 bg-slate-100 rounded mb-2.5" />
    <div className="h-8 w-12 bg-slate-50 rounded" />
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AdminUsersPage: React.FC = () => {
  // Stats
  const [stats, setStats]               = useState<AdminUserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // List
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Filters & pagination
  const [activeTab, setActiveTab]             = useState<Tab>('all');
  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                       = useState(1);

  // Modals & action state
  const [inspectUser, setInspectUser]     = useState<AdminUser | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<AdminUser | null>(null);
  const [processingBlock, setProcessingBlock]   = useState<string | null>(null);
  const [processingVerify, setProcessingVerify] = useState<string | null>(null);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch stats (once on mount) ──────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        setStatsLoading(true);
        const s = await getAdminUserStats();
        setStats(s);
      } catch {
        // stats failure is non-critical
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  // ── Fetch user list ──────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
        status: activeTab as UserStatus,
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch {
      setError('Kullanıcılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, activeTab]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  // ── Tab change resets page ───────────────────────────────────────────────
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // ── Block / Unblock ──────────────────────────────────────────────────────
  const handleBlock = async (user: AdminUser) => {
    const willBlock = user.is_active;
    const label = willBlock ? 'engellemek' : 'engeli kaldırmak';
    if (!confirm(`${user.first_name} ${user.last_name} kullanıcısını ${label} istediğinize emin misiniz?`)) return;
    try {
      setProcessingBlock(user.id);
      await toggleUserBlock(user.id, willBlock);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !willBlock } : u));
      if (inspectUser?.id === user.id) setInspectUser(prev => prev ? { ...prev, is_active: !willBlock } : null);
    } catch {
      setError('İşlem başarısız oldu.');
    } finally {
      setProcessingBlock(null);
    }
  };

  // ── Verify ───────────────────────────────────────────────────────────────
  const handleVerify = async (user: AdminUser) => {
    try {
      setProcessingVerify(user.id);
      await toggleUserVerification(user.id, true);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_verified: true } : u));
      if (inspectUser?.id === user.id) setInspectUser(prev => prev ? { ...prev, is_verified: true } : null);
      // Update stats optimistically
      setStats(prev => prev ? { ...prev, verified: prev.verified + 1, unverified: Math.max(0, prev.unverified - 1) } : null);
    } catch {
      setError('Doğrulama işlemi başarısız oldu.');
    } finally {
      setProcessingVerify(null);
    }
  };

  // ── Role Change ───────────────────────────────────────────────────────────
  const handleRoleChange = async (role: string) => {
    if (!roleChangeUser) return;
    const user = roleChangeUser;
    try {
      await changeUserRole(user.id, role);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u));
      if (inspectUser?.id === user.id) setInspectUser(prev => prev ? { ...prev, role } : null);
      setRoleChangeUser(null);
    } catch {
      setError('Rol değiştirme başarısız oldu.');
      setRoleChangeUser(null);
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / LIMIT);

  // ─────────────────────────────────────────────────────────────────────────

  const statCards = [
    { label: 'Toplam Kullanıcı',  value: stats?.total,      color: 'text-sky-600'  },
    { label: 'Doğrulanmış',        value: stats?.verified,   color: 'text-green-600' },
    { label: 'Doğrulanmamış',      value: stats?.unverified, color: 'text-amber-605' },
    { label: 'Engelli',            value: stats?.blocked,    color: 'text-red-655'   },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Modals */}
      {inspectUser && (
        <UserInspectModal user={inspectUser} onClose={() => setInspectUser(null)} />
      )}
      {roleChangeUser && (
        <RoleChangeModal
          user={roleChangeUser}
          onClose={() => setRoleChangeUser(null)}
          onConfirm={handleRoleChange}
        />
      )}

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Users size={22} className="text-sky-600 animate-pulse" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kullanıcı Yönetimi</h1>
        </div>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">Kayıtlı kullanıcıları görüntüleyin, hesap durumlarını yönetin.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map(s => (
              <div key={s.label} className="bg-white shadow-xl shadow-slate-200/40 border border-slate-100 rounded-[2.5rem] p-5 hover:shadow-2xl hover:shadow-sky-200/20 hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">{s.label}</p>
                <p className={`text-3xl font-black ${s.color} mt-1`}>
                  {s.value?.toLocaleString('tr-TR') ?? '—'}
                </p>
              </div>
            ))
        }
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-white shadow-sm border border-slate-100 p-1 rounded-xl">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="İsim, kullanıcı adı veya e-posta…"
            className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 w-72 shadow-sm font-medium"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white shadow-xl shadow-slate-200/40 rounded-[2.5rem] border border-slate-100/50 overflow-hidden">
        {/* Table header bar */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-500">
              {loading ? 'Yükleniyor…' : `${total.toLocaleString('tr-TR')} kullanıcı`}
            </span>
          </div>
          <button
            onClick={() => void fetchUsers()}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[1fr_110px_140px_110px_auto] gap-4 px-6 py-3 bg-slate-50/50 border-b border-slate-100">
          {['Kullanıcı', 'Rol', 'Bölüm', 'Kayıt', 'İşlemler'].map(h => (
            <span key={h} className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 text-xs font-semibold text-red-655 flex items-center gap-2 bg-red-50 border border-red-100 p-3 rounded-xl">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 bg-slate-100 rounded" />
                  <div className="h-3 w-52 bg-slate-55 bg-slate-50 rounded" />
                </div>
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
                <div className="h-5 w-28 bg-slate-50 rounded hidden md:block" />
                <div className="h-5 w-20 bg-slate-50 rounded hidden md:block" />
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-slate-100 rounded-lg" />
                  <div className="h-7 w-16 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users size={36} className="text-slate-350 mb-3" />
            <p className="text-sm font-semibold text-slate-400">
              {debouncedSearch ? 'Arama sonucu bulunamadı.' : 'Bu filtrede kullanıcı yok.'}
            </p>
          </div>
        )}

        {/* User rows */}
        {!loading && users.length > 0 && (
          <div className="divide-y divide-slate-100">
            {users.map(user => {
              const roleInfo = ROLE_CONFIG[user.role] ?? { label: user.role, className: 'bg-slate-100 text-slate-600 border border-slate-200' };
              const isBlockingThis = processingBlock === user.id;
              const isVerifyingThis = processingVerify === user.id;
              const isProtected = user.role === PROTECTED_ROLE;

              return (
                <div
                  key={user.id}
                  className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Avatar + name + email */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                      {initials(user)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        {!user.is_active && (
                          <span className="text-[9px] font-extrabold bg-red-50 border border-red-100 text-red-600 px-2 py-0.5 rounded-full shrink-0">
                            Engelli
                          </span>
                        )}
                        {user.is_active && !user.is_verified && (
                          <span className="text-[9px] font-extrabold bg-amber-50 border border-amber-100 text-amber-600 px-2 py-0.5 rounded-full shrink-0">
                            Doğrulanmamış
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="hidden md:flex w-[110px] shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${roleInfo.className}`}>
                      {roleInfo.label}
                    </span>
                  </div>

                  {/* Department */}
                  <div className="hidden md:block w-[140px] shrink-0">
                    <p className="text-xs text-slate-700 font-semibold truncate">{user.department ?? '—'}</p>
                    {user.university && (
                      <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{user.university}</p>
                    )}
                  </div>

                  {/* Registration date */}
                  <div className="hidden md:block w-[110px] shrink-0">
                    <p className="text-xs text-slate-500 font-medium">{fmtDate(user.created_at)}</p>
                    {user.last_login && (
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">↩ {fmtDate(user.last_login)}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* İncele — always visible */}
                    <button
                      onClick={() => setInspectUser(user)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100 transition-colors"
                      title="İncele"
                    >
                      <Eye size={12} />
                      <span className="hidden sm:inline">İncele</span>
                    </button>

                    {/* Engelle / Aktifleştir — hidden for protected role */}
                    {!isProtected && (
                      <button
                        onClick={() => void handleBlock(user)}
                        disabled={isBlockingThis}
                        title={user.is_active ? 'Engelle' : 'Engeli Kaldır'}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors disabled:opacity-40 ${
                          user.is_active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {isBlockingThis
                           ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          : user.is_active ? <ShieldOff size={12} /> : <Shield size={12} />}
                        <span className="hidden lg:inline">
                          {user.is_active ? 'Engelle' : 'Aktifleştir'}
                        </span>
                      </button>
                    )}

                    {/* Doğrula — only for unverified + active non-protected users */}
                    {!isProtected && !user.is_verified && user.is_active && (
                      <button
                        onClick={() => void handleVerify(user)}
                        disabled={isVerifyingThis}
                        title="E-postayı Doğrula"
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-40"
                      >
                        {isVerifyingThis
                          ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          : <CheckCircle size={12} />}
                        <span className="hidden lg:inline">Doğrula</span>
                      </button>
                    )}

                    {/* Rol Değiştir — hidden for protected role */}
                    {!isProtected && (
                      <button
                        onClick={() => setRoleChangeUser(user)}
                        title="Rol Değiştir"
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      >
                        <UserCog size={12} />
                        <span className="hidden lg:inline">Rol</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sayfa {page} / {totalPages} — Toplam {total.toLocaleString('tr-TR')} kullanıcı
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 text-slate-650 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
              >
                <ChevronLeft size={13} /> Önceki
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 text-slate-650 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
              >
                Sonraki <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
