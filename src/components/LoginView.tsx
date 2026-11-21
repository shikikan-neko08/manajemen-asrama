import React, { useState } from 'react';
import {
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useDorm } from '../context/DormContext';
import { PeranPengguna } from '../types/dorm';

const ROLE_META: Record<
  PeranPengguna,
  { title: string; summary: string; icon: React.FC<{ className?: string }> }
> = {
  Admin: {
    title: 'Administrator Asrama',
    summary:
      'Kelola seluruh data master, pengguna, gedung, kamar, keuangan, role, dan laporan lengkap.',
    icon: KeyRound,
  },
  Pembina: {
    title: 'Pembina / Musyrif Asrama',
    summary:
      'Kelola penghuni gedung tanggung jawab, catat absensi harian, setujui izin, pelanggaran, & inventaris.',
    icon: UserCheck,
  },
  Keamanan: {
    title: 'Petugas Keamanan / Piket',
    summary:
      'Catat keluar-masuk santri sesuai surat izin aktif serta kelola buku tamu penjenguk.',
    icon: ShieldCheck,
  },
  Wali: {
    title: 'Wali Santri (Akses Baca)',
    summary:
      'Pantau informasi kamar anak, riwayat absensi, perizinan, catatan pembinaan, & status tagihan.',
    icon: Users,
  },
};

export const LoginView: React.FC = () => {
  const {
    db,
    authStatus,
    authLoading,
    loginAs,
    loginWithCredentials,
    claimAdminSetup,
    resetDemoData,
  } = useDorm();

  const [selectedRole, setSelectedRole] = useState<PeranPengguna | 'Semua'>('Semua');

  // Production login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // First-run Admin claim states
  const [claimUser, setClaimUser] = useState('admin');
  const [claimPass, setClaimPass] = useState('');
  const [claimConfirm, setClaimConfirm] = useState('');

  const roles: (PeranPengguna | 'Semua')[] = ['Semua', 'Admin', 'Pembina', 'Keamanan', 'Wali'];

  const filteredUsers =
    selectedRole === 'Semua'
      ? db.pengguna
      : db.pengguna.filter((u) => u.peran === selectedRole);

  const handleProductionLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    const res = await loginWithCredentials(username, password);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.message);
    }
  };

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (claimPass !== claimConfirm) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setSubmitting(true);
    const res = await claimAdminSetup({
      username: claimUser,
      password: claimPass,
      activateProduction: true,
    });
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm text-slate-600">Memuat status sistem asrama...</div>
      </div>
    );
  }

  // PRODUCTION MODE LOGIN OR FIRST-RUN CLAIM
  if (authStatus.mode === 'production') {
    const needsAdminClaim = !authStatus.adminClaimed && !authStatus.envAdminConfigured;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-11 h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SIM-Asrama</h1>
              <p className="text-xs sm:text-sm text-slate-600">{db.pengaturan.namaLembaga}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            {needsAdminClaim ? (
              <>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md mb-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Aktivasi Awal Production</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Buat Akun Administrator Utama
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    Mode Production aktif dan belum ada kata sandi Administrator yang tersimpan. Tentukan username & kata sandi untuk mengamankan sistem.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleClaimAdmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Username Administrator *
                    </label>
                    <input
                      required
                      type="text"
                      value={claimUser}
                      onChange={(e) => setClaimUser(e.target.value)}
                      autoComplete="username"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kata Sandi Baru (min. 6 karakter) *
                    </label>
                    <input
                      required
                      minLength={6}
                      type="password"
                      value={claimPass}
                      onChange={(e) => setClaimPass(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ulangi Kata Sandi *
                    </label>
                    <input
                      required
                      minLength={6}
                      type="password"
                      value={claimConfirm}
                      onChange={(e) => setClaimConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg min-h-[42px]"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan & Masuk sebagai Admin'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md mb-2">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Login Production</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Masuk ke SIM-Asrama</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Masukkan username dan kata sandi yang diberikan oleh Administrator asrama.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleProductionLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Username
                    </label>
                    <input
                      required
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Contoh: admin, zaki, hendra"
                      autoComplete="username"
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                        aria-label="Tampilkan atau sembunyikan kata sandi"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg min-h-[42px]"
                  >
                    {submitting ? 'Memverifikasi...' : 'Masuk'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="max-w-md w-full mx-auto pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
          Mode Production aktif · Autentikasi aman berbasis kata sandi terenkripsi
        </div>
      </div>
    );
  }

  // DEMO MODE QUICK ROLE PICKER
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-5xl w-full mx-auto my-auto py-6">
        {/* Header Lembaga */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                SIM-Asrama
              </h1>
              <p className="text-sm text-slate-600">{db.pengaturan.namaLembaga}</p>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
            <span>Mode Demo</span>
            <span aria-hidden="true">·</span>
            <span>{db.gedung.length} Gedung</span>
            <span aria-hidden="true">·</span>
            <span>{db.kamar.length} Kamar</span>
            <span aria-hidden="true">·</span>
            <span>{db.penghuni.filter((p) => p.status !== 'Lulus').length} Penghuni Aktif</span>
          </div>
        </div>

        {/* Intro & Role Filter */}
        <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
              Masuk ke Sistem Manajemen Asrama
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Pilih peran di bawah untuk mencoba aplikasi secara cepat. Untuk penggunaan production dengan username & kata sandi, aktifkan melalui menu <strong>Pengaturan → Deployment</strong> saat masuk sebagai Admin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start md:self-auto">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[34px] ${
                  selectedRole === r
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'Wali' ? 'Wali Santri' : r}
              </button>
            ))}
          </div>
        </div>

        {/* User Account Picker Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.map((user) => {
            const meta = ROLE_META[user.peran];
            const Icon = meta.icon;
            const customRole = authStatus.roles.find((r) => r.id === user.roleId);
            const gedungNames =
              user.gedungIds && user.gedungIds.length > 0
                ? db.gedung
                    .filter((g) => user.gedungIds?.includes(g.id))
                    .map((g) => g.nama)
                    .join(', ')
                : null;
            const anakNames =
              user.penghuniIds && user.penghuniIds.length > 0
                ? db.penghuni
                    .filter((p) => user.penghuniIds?.includes(p.id))
                    .map((p) => p.nama)
                    .join(', ')
                : null;

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => loginAs(user.id)}
                className="group text-left bg-white border border-slate-200 hover:border-teal-600 rounded-xl p-5 transition-all flex flex-col justify-between gap-4 focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-teal-700">
                        {customRole ? customRole.nama : meta.title}
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mt-0.5 truncate">
                        {user.nama}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{user.jabatan}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                  {customRole ? customRole.deskripsi : meta.summary}
                  {gedungNames && (
                    <div className="mt-1.5 font-medium text-slate-800">
                      Tanggung jawab: {gedungNames}
                    </div>
                  )}
                  {anakNames && (
                    <div className="mt-1.5 font-medium text-slate-800">
                      Santri terhubung: {anakNames}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <span>Data contoh tersimpan di browser dan dapat di-reset kapan saja.</span>
        <button
          type="button"
          onClick={resetDemoData}
          className="text-teal-700 hover:text-teal-900 font-medium underline underline-offset-2"
        >
          Kembalikan Data Contoh Awal
        </button>
      </div>
    </div>
  );
};
