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

// ─── Constants ───────────────────────────────────────────────────────────────

type Tab = 'all' | 'verified' | 'blocked';
const LIMIT = 20;

const TABS = [
  { key: 'all' as Tab,      label: 'Tüm Kullanıcılar', icon: <Users size={16} /> },
  { key: 'verified' as Tab, label: 'Doğrulanmış',       icon: <UserCheck size={16} /> },
  { key: 'blocked' as Tab,  label: 'Engellenenler',     icon: <UserX size={16} /> },
];

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  student:          { label: 'Öğrenci',      className: 'bg-blue-500/10 text-blue-400' },
  instructor:       { label: 'Eğitmen',      className: 'bg-purple-500/10 text-purple-400' },
  admin:            { label: 'Admin',         className: 'bg-red-500/10 text-red-400' },
  university_admin: { label: 'Üniv. Admin',  className: 'bg-orange-500/10 text-orange-400' },
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
  <div className="flex items-start gap-3 py-2 border-b border-gray-800/60 last:border-0">
    <span className="text-gray-600 mt-0.5 shrink-0 w-4 flex justify-center">{icon}</span>
    <span className="text-xs text-gray-500 w-28 shrink-0 pt-0.5">{label}</span>
    {children ?? (
      <span className={`text-xs ${mono ? 'font-mono text-[11px] break-all text-gray-400' : 'font-medium text-gray-300'}`}>
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
  const roleInfo = ROLE_CONFIG[user.role] ?? { label: user.role, className: 'bg-gray-700 text-gray-400' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-sm font-black text-red-400 shrink-0">
              {initials(user)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status badges */}
        <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${user.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {user.is_active ? '● Aktif' : '● Engelli'}
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${user.is_verified ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {user.is_verified ? '✓ Doğrulanmış' : '⚠ Doğrulanmamış'}
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${roleInfo.className}`}>
            {roleInfo.label}
          </span>
        </div>

        {/* Details */}
        <div className="px-6 py-2 overflow-y-auto flex-1 min-h-0">
          <DetailRow icon={<Hash size={12} />}       label="Kullanıcı ID"   value={user.id}               mono />
          <DetailRow icon={<Mail size={12} />}        label="E-posta"        value={user.email} />
          <DetailRow icon={<Building2 size={12} />}   label="Üniversite"     value={user.university ?? undefined} />
          <DetailRow icon={<BookOpen size={12} />}    label="Bölüm"          value={user.department ?? undefined} />
          <DetailRow icon={<UserCog size={12} />}     label="Sınıf"          value={user.grade ?? undefined} />
          <DetailRow icon={<Calendar size={12} />}    label="Kayıt Tarihi"   value={fmtDateLong(user.created_at)} />
          <DetailRow icon={<Clock size={12} />}       label="Son Giriş"      value={fmtDateLong(user.last_login)} />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
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
  const [selected, setSelected] = useState(user.role);
  const [saving, setSaving] = useState(false);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Rol Değiştir</h3>
            <p className="text-xs text-gray-500 mt-0.5">{user.first_name} {user.last_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          {ROLE_OPTIONS.map(opt => {
            const cfg = ROLE_CONFIG[opt.value];
            const isActive = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  isActive
                    ? 'border-red-600 bg-red-600/10 text-white'
                    : 'border-gray-800 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg?.className ?? ''}`}>
                  {cfg?.label ?? opt.label}
                </span>
                <span className="flex-1 text-left text-xs">{opt.label}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-800 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-gray-200 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || selected === user.role}
            className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
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
  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 animate-pulse">
    <div className="h-7 w-16 bg-gray-700 rounded mb-2" />
    <div className="h-3 w-24 bg-gray-800 rounded" />
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
    { label: 'Toplam Kullanıcı',  value: stats?.total,      color: 'text-blue-400'  },
    { label: 'Doğrulanmış',        value: stats?.verified,   color: 'text-green-400' },
    { label: 'Doğrulanmamış',      value: stats?.unverified, color: 'text-amber-400' },
    { label: 'Engelli',            value: stats?.blocked,    color: 'text-red-400'   },
  ];

  return (
    <div>
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
          <Users size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">Kullanıcı Yönetimi</h1>
        </div>
        <p className="text-sm text-gray-500">Kayıtlı kullanıcıları görüntüleyin, hesap durumlarını yönetin.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map(s => (
              <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className={`text-2xl font-black ${s.color}`}>
                  {s.value?.toLocaleString('tr-TR') ?? '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))
        }
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="İsim, kullanıcı adı veya e-posta…"
            className="bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-red-500 w-72"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {/* Table header bar */}
        <div className="px-6 py-3.5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-300">
              {loading ? 'Yükleniyor…' : `${total.toLocaleString('tr-TR')} kullanıcı`}
            </span>
          </div>
          <button
            onClick={() => void fetchUsers()}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[1fr_110px_140px_110px_auto] gap-4 px-6 py-2 bg-gray-800/40 border-b border-gray-800/60">
          {['Kullanıcı', 'Rol', 'Bölüm', 'Kayıt', 'İşlemler'].map(h => (
            <span key={h} className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 text-sm text-red-400 flex items-center gap-2 bg-red-500/10 p-3 rounded-lg">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-gray-800">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 bg-gray-800 rounded" />
                  <div className="h-3 w-52 bg-gray-800/70 rounded" />
                </div>
                <div className="h-5 w-16 bg-gray-800 rounded-full" />
                <div className="h-5 w-28 bg-gray-800/60 rounded hidden md:block" />
                <div className="h-5 w-20 bg-gray-800/60 rounded hidden md:block" />
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-gray-800 rounded-lg" />
                  <div className="h-7 w-16 bg-gray-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users size={36} className="text-gray-700 mb-3" />
            <p className="text-sm font-semibold text-gray-500">
              {debouncedSearch ? 'Arama sonucu bulunamadı.' : 'Bu filtrede kullanıcı yok.'}
            </p>
          </div>
        )}

        {/* User rows */}
        {!loading && users.length > 0 && (
          <div className="divide-y divide-gray-800">
            {users.map(user => {
              const roleInfo = ROLE_CONFIG[user.role] ?? { label: user.role, className: 'bg-gray-700 text-gray-400' };
              const isBlockingThis = processingBlock === user.id;
              const isVerifyingThis = processingVerify === user.id;
              const isProtected = user.role === PROTECTED_ROLE;

              return (
                <div
                  key={user.id}
                  className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-800/40 transition-colors"
                >
                  {/* Avatar + name + email */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-black text-gray-400 shrink-0">
                      {initials(user)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-200 truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        {!user.is_active && (
                          <span className="text-[10px] font-bold bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full shrink-0">
                            Engelli
                          </span>
                        )}
                        {user.is_active && !user.is_verified && (
                          <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">
                            Doğrulanmamış
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="hidden md:flex w-[110px] shrink-0">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${roleInfo.className}`}>
                      {roleInfo.label}
                    </span>
                  </div>

                  {/* Department */}
                  <div className="hidden md:block w-[140px] shrink-0">
                    <p className="text-xs text-gray-400 truncate">{user.department ?? '—'}</p>
                    {user.university && (
                      <p className="text-[10px] text-gray-600 truncate">{user.university}</p>
                    )}
                  </div>

                  {/* Registration date */}
                  <div className="hidden md:block w-[110px] shrink-0">
                    <p className="text-xs text-gray-500">{fmtDate(user.created_at)}</p>
                    {user.last_login && (
                      <p className="text-[10px] text-gray-700 mt-0.5">↩ {fmtDate(user.last_login)}</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* İncele — always visible */}
                    <button
                      onClick={() => setInspectUser(user)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
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
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 ${
                          user.is_active
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
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
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-40"
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
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-gray-700/60 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-gray-200 transition-colors"
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
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Sayfa {page} / {totalPages} — {total.toLocaleString('tr-TR')} kullanıcı
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={13} /> Önceki
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40 transition-colors"
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
