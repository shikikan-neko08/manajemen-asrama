import React, { useEffect, useState } from 'react';
import {
  BedDouble,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  DoorOpen,
  FileBarChart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { useDorm } from '../context/DormContext';
import { ActivePage } from '../types/dorm';
import { canAccessPage } from '../utils/permissions';
import { DashboardPage } from './pages/DashboardPage';
import { PenghuniPage } from './pages/PenghuniPage';
import { GedungKamarPage } from './pages/GedungKamarPage';
import { AbsensiPage } from './pages/AbsensiPage';
import { PerizinanPage } from './pages/PerizinanPage';
import { PelanggaranPage } from './pages/PelanggaranPage';
import { TamuLogPage } from './pages/TamuLogPage';
import { InventarisPage } from './pages/InventarisPage';
import { KegiatanPage } from './pages/KegiatanPage';
import { KesehatanPage } from './pages/KesehatanPage';
import { TagihanPage } from './pages/TagihanPage';
import { LaporanPage } from './pages/LaporanPage';
import { PengaturanPage } from './pages/PengaturanPage';

interface NavItem {
  id: ActivePage;
  label: string;
  shortLabel: string;
  group: 'Utama' | 'Operasional' | 'Sarana & Keuangan' | 'Sistem';
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Beranda', group: 'Utama', icon: LayoutDashboard },
  { id: 'penghuni', label: 'Data Penghuni', shortLabel: 'Penghuni', group: 'Utama', icon: Users },
  { id: 'gedung-kamar', label: 'Gedung & Kamar', shortLabel: 'Kamar', group: 'Utama', icon: BedDouble },
  { id: 'absensi', label: 'Absensi Asrama', shortLabel: 'Absensi', group: 'Operasional', icon: CalendarCheck },
  { id: 'perizinan', label: 'Perizinan', shortLabel: 'Izin', group: 'Operasional', icon: DoorOpen },
  { id: 'pelanggaran', label: 'Pelanggaran & Poin', shortLabel: 'Poin', group: 'Operasional', icon: ShieldAlert },
  { id: 'tamu-log', label: 'Tamu & Keluar-Masuk', shortLabel: 'Gerbang', group: 'Operasional', icon: DoorOpen },
  { id: 'kegiatan', label: 'Kegiatan & Pengumuman', shortLabel: 'Kegiatan', group: 'Operasional', icon: CalendarDays },
  { id: 'inventaris', label: 'Inventaris & Perawatan', shortLabel: 'Inventaris', group: 'Sarana & Keuangan', icon: Package },
  { id: 'kesehatan', label: 'Kesehatan Ringkas', shortLabel: 'Kesehatan', group: 'Sarana & Keuangan', icon: HeartPulse },
  { id: 'tagihan', label: 'Tagihan Asrama', shortLabel: 'Tagihan', group: 'Sarana & Keuangan', icon: CreditCard },
  { id: 'laporan', label: 'Laporan & Ekspor', shortLabel: 'Laporan', group: 'Sistem', icon: FileBarChart },
  { id: 'pengaturan', label: 'Pengaturan & Peran', shortLabel: 'Pengaturan', group: 'Sistem', icon: Settings },
];

export const AppShell: React.FC = () => {
  const { db, currentUser, activeRole, authStatus, loginAs, logout } = useDorm();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isProduction = authStatus.mode === 'production';

  const allowedItems = currentUser
    ? NAV_ITEMS.filter((item) => canAccessPage(currentUser, item.id, authStatus.roles))
    : [];

  useEffect(() => {
    if (currentUser && !canAccessPage(currentUser, activePage, authStatus.roles)) {
      setActivePage('dashboard');
    }
  }, [currentUser, activePage, authStatus.roles]);

  if (!currentUser) return null;

  const activeNav = NAV_ITEMS.find((i) => i.id === activePage) ?? NAV_ITEMS[0];

  const groups: NavItem['group'][] = ['Utama', 'Operasional', 'Sarana & Keuangan', 'Sistem'];

  // Pick up to 4 core mobile bottom tabs tailored to role
  const mobileBottomIds: ActivePage[] =
    currentUser.peran === 'Keamanan'
      ? ['dashboard', 'tamu-log', 'perizinan', 'penghuni']
      : currentUser.peran === 'Wali'
      ? ['dashboard', 'penghuni', 'absensi', 'tagihan']
      : ['dashboard', 'penghuni', 'absensi', 'perizinan'];

  const mobileBottomItems = mobileBottomIds
    .map((id) => allowedItems.find((i) => i.id === id))
    .filter((i): i is NavItem => Boolean(i));

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActivePage} />;
      case 'penghuni':
        return <PenghuniPage />;
      case 'gedung-kamar':
        return <GedungKamarPage />;
      case 'absensi':
        return <AbsensiPage />;
      case 'perizinan':
        return <PerizinanPage />;
      case 'pelanggaran':
        return <PelanggaranPage />;
      case 'tamu-log':
        return <TamuLogPage />;
      case 'inventaris':
        return <InventarisPage />;
      case 'kegiatan':
        return <KegiatanPage />;
      case 'kesehatan':
        return <KesehatanPage />;
      case 'tagihan':
        return <TagihanPage />;
      case 'laporan':
        return <LaporanPage />;
      case 'pengaturan':
        return <PengaturanPage />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen no-print">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="text-lg font-bold text-slate-900 tracking-tight font-display">
            SIM-Asrama
          </div>
          <div className="text-xs text-slate-500 truncate mt-0.5">
            {db.pengaturan.namaLembaga}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((grp) => {
            const grpItems = allowedItems.filter((i) => i.group === grp);
            if (grpItems.length === 0) return null;
            return (
              <div key={grp}>
                <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
                  {grp}
                </div>
                <div className="space-y-0.5">
                  {grpItems.map((item) => {
                    const Icon = item.icon;
                    const active = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActivePage(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                          active
                            ? 'bg-teal-700 text-white font-medium'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
          <div className="px-2">
            <div className="text-xs font-semibold text-slate-900 truncate">{currentUser.nama}</div>
            <div className="text-[11px] text-slate-500 truncate">
              {activeRole.nama} · {isProduction ? 'Production' : 'Demo'}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isProduction ? 'Keluar Akun' : 'Ganti Peran / Keluar'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 no-print">
          <div className="min-w-0 flex items-center gap-2 text-sm">
            <span className="hidden sm:inline text-slate-400">SIM-Asrama</span>
            <span className="hidden sm:inline text-slate-300">/</span>
            <h1 className="font-bold text-slate-900 text-base sm:text-lg truncate">
              {activeNav.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {!isProduction ? (
              <select
                value={currentUser.id}
                onChange={(e) => loginAs(e.target.value)}
                aria-label="Pindah akun pengguna"
                className="hidden sm:block text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 max-w-[220px] truncate focus:outline-none focus:border-teal-600"
              >
                {db.pengguna.map((u) => (
                  <option key={u.id} value={u.id}>
                    [{u.peran}] {u.nama}
                  </option>
                ))}
              </select>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-900">{currentUser.nama}</span>
                <span aria-hidden="true">·</span>
                <span>{activeRole.nama}</span>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {renderPage()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 grid grid-cols-5 h-16 no-print"
        aria-label="Navigasi utama mobile"
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActivePage(item.id);
                setMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? 'text-teal-700' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-[64px]">{item.shortLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
            mobileMenuOpen ? 'text-teal-700' : 'text-slate-500'
          }`}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span>Menu</span>
        </button>
      </nav>

      {/* Mobile Full Menu Sheet */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] no-print"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute bottom-16 inset-x-0 bg-white border-t border-slate-200 rounded-t-2xl p-4 max-h-[75vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="text-sm font-bold text-slate-900">{currentUser.nama}</div>
                <div className="text-xs text-slate-500">
                  {activeRole.nama} · {currentUser.jabatan}
                </div>
              </div>
              {!isProduction && (
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    loginAs(e.target.value);
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 max-w-[160px]"
                >
                  {db.pengguna.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.peran}] {u.nama}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {allowedItems.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActivePage(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-medium min-h-[44px] ${
                      active
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
