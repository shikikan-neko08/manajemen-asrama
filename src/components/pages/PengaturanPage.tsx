import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Edit3,
  KeyRound,
  Lock,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import {
  ActivePage,
  PeranPengguna,
  Pengguna,
  RoleCapabilities,
  RoleDefinition,
  RoleScopeMode,
} from '../../types/dorm';
import { ALL_PAGE_META } from '../../utils/permissions';
import { generateId } from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';

type SettingsTab = 'deployment' | 'roles' | 'pengguna' | 'umum';

const DEFAULT_CAPABILITIES: RoleCapabilities = {
  canCreateEdit: true,
  canDelete: false,
  canApproveIzin: false,
  canManageGate: false,
  canManageBilling: false,
  canExportReport: true,
};

export const PengaturanPage: React.FC = () => {
  const {
    db,
    currentUser,
    authStatus,
    userAuthList,
    refreshAdminAuthConfig,
    claimAdminSetup,
    switchDeploymentMode,
    saveUserCredentials,
    saveRoleDefinition,
    deleteRoleDefinition,
    changeOwnPassword,
    updatePengaturan,
    deletePengguna,
    resetDemoData,
    askConfirm,
    showToast,
  } = useDorm();

  const [tab, setTab] = useState<SettingsTab>('deployment');

  useEffect(() => {
    refreshAdminAuthConfig();
  }, [refreshAdminAuthConfig]);

  // Tab 1: Claim Admin / Own Password
  const [adminClaimUser, setAdminClaimUser] = useState(currentUser?.username || 'admin');
  const [adminClaimPass, setAdminClaimPass] = useState('');
  const [adminClaimConfirm, setAdminClaimConfirm] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [busyMode, setBusyMode] = useState(false);

  // Tab 2: Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleDefinition | null>(null);
  const [rNama, setRNama] = useState('');
  const [rDeskripsi, setRDeskripsi] = useState('');
  const [rBasePeran, setRBasePeran] = useState<PeranPengguna>('Pembina');
  const [rScope, setRScope] = useState<RoleScopeMode>('semua');
  const [rPages, setRPages] = useState<ActivePage[]>(['dashboard']);
  const [rCaps, setRCaps] = useState<RoleCapabilities>(DEFAULT_CAPABILITIES);

  // Tab 3: User Credentials Modal
  const [uOpen, setUOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState<Pengguna | null>(null);
  const [uNama, setUNama] = useState('');
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRoleId, setURoleId] = useState('role-pembina');
  const [uJabatan, setUJabatan] = useState('');
  const [uTelepon, setUTelepon] = useState('');
  const [uActive, setUActive] = useState(true);
  const [uGedungIds, setUGedungIds] = useState<string[]>([]);
  const [uPenghuniIds, setUPenghuniIds] = useState<string[]>([]);

  // Tab 4: Pengaturan Lembaga
  const [namaLembaga, setNamaLembaga] = useState(db.pengaturan.namaLembaga);
  const [alamatLembaga, setAlamatLembaga] = useState(db.pengaturan.alamatLembaga);
  const [ambangLisan, setAmbangLisan] = useState(db.pengaturan.ambangPeringatanLisan);
  const [ambangSP1, setAmbangSP1] = useState(db.pengaturan.ambangSP1);
  const [ambangSP2, setAmbangSP2] = useState(db.pengaturan.ambangSP2);
  const [ambangSP3, setAmbangSP3] = useState(db.pengaturan.ambangSP3);

  const isProduction = authStatus.mode === 'production';
  const adminReady = authStatus.adminClaimed || authStatus.envAdminConfigured;
  const usersWithPasswordCount = userAuthList.filter((u) => u.hasPassword).length;

  const handleClaimAdminInline = async (e: React.FormEvent, activateProduction: boolean) => {
    e.preventDefault();
    if (adminClaimPass !== adminClaimConfirm) {
      showToast('Konfirmasi kata sandi tidak cocok.', 'error');
      return;
    }
    setBusyMode(true);
    const res = await claimAdminSetup({
      username: adminClaimUser,
      password: adminClaimPass,
      activateProduction,
    });
    setBusyMode(false);
    if (res.ok) {
      setAdminClaimPass('');
      setAdminClaimConfirm('');
      await refreshAdminAuthConfig();
    }
  };

  const handleToggleMode = () => {
    if (!isProduction) {
      askConfirm({
        title: 'Aktifkan Mode Production?',
        message:
          'Setelah Mode Production aktif, layar pilih-peran cepat akan dinonaktifkan. Seluruh pengguna harus masuk menggunakan username dan kata sandi masing-masing.',
        confirmLabel: 'Ya, Aktifkan Production',
        onConfirm: async () => {
          setBusyMode(true);
          await switchDeploymentMode('production');
          setBusyMode(false);
          await refreshAdminAuthConfig();
        },
      });
    } else {
      askConfirm({
        title: 'Kembalikan ke Mode Demo?',
        message:
          'Mode Demo menampilkan pilihan peran cepat pada halaman login untuk pengujian atau pelatihan.',
        confirmLabel: 'Ya, Alihkan ke Demo',
        onConfirm: async () => {
          setBusyMode(true);
          await switchDeploymentMode('demo');
          setBusyMode(false);
          await refreshAdminAuthConfig();
        },
      });
    }
  };

  const handleChangeOwnPass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await changeOwnPassword(oldPass, newPass);
    if (res.ok) {
      setOldPass('');
      setNewPass('');
      await refreshAdminAuthConfig();
    }
  };

  const openCreateRole = () => {
    setEditRole(null);
    setRNama('');
    setRDeskripsi('');
    setRBasePeran('Pembina');
    setRScope('gedung_terkait');
    setRPages(['dashboard', 'penghuni', 'absensi']);
    setRCaps({ ...DEFAULT_CAPABILITIES });
    setRoleModalOpen(true);
  };

  const openEditRole = (role: RoleDefinition) => {
    setEditRole(role);
    setRNama(role.nama);
    setRDeskripsi(role.deskripsi);
    setRBasePeran(role.basePeran);
    setRScope(role.scopeMode);
    setRPages([...role.allowedPages]);
    setRCaps({ ...role.capabilities });
    setRoleModalOpen(true);
  };

  const toggleRolePage = (pageId: ActivePage) => {
    setRPages((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveRoleDefinition({
      id: editRole?.id,
      nama: rNama,
      deskripsi: rDeskripsi,
      basePeran: rBasePeran,
      scopeMode: rScope,
      allowedPages: rPages,
      capabilities: rCaps,
    });
    if (res.ok) {
      setRoleModalOpen(false);
      await refreshAdminAuthConfig();
    }
  };

  const openAddUserModal = () => {
    setEditUserTarget(null);
    setUNama('');
    setUUsername('');
    setUPassword('');
    setURoleId(authStatus.roles[1]?.id || 'role-pembina');
    setUJabatan('');
    setUTelepon('');
    setUActive(true);
    setUGedungIds([]);
    setUPenghuniIds([]);
    setUOpen(true);
  };

  const openEditUserCredsModal = (user: Pengguna) => {
    const authMeta = userAuthList.find((a) => a.userId === user.id);
    setEditUserTarget(user);
    setUNama(user.nama);
    setUUsername(authMeta?.username || user.username || user.id);
    setUPassword('');
    setURoleId(
      authMeta?.roleId ||
        user.roleId ||
        authStatus.roles.find((r) => r.basePeran === user.peran)?.id ||
        'role-pembina'
    );
    setUJabatan(user.jabatan);
    setUTelepon(user.telepon);
    setUActive(authMeta?.active ?? true);
    setUGedungIds(user.gedungIds ?? []);
    setUPenghuniIds(user.penghuniIds ?? []);
    setUOpen(true);
  };

  const handleSaveUserAndCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRole =
      authStatus.roles.find((r) => r.id === uRoleId) ?? authStatus.roles[0];
    const targetId = editUserTarget?.id || generateId('u');

    const includeGedung =
      selectedRole.scopeMode === 'gedung_terkait' || selectedRole.basePeran === 'Pembina';
    const includeAnak =
      selectedRole.scopeMode === 'anak_terkait' || selectedRole.basePeran === 'Wali';

    const res = await saveUserCredentials(targetId, {
      username: uUsername.trim().toLowerCase(),
      password: uPassword.trim() ? uPassword : undefined,
      roleId: selectedRole.id,
      active: uActive,
      nama: uNama.trim(),
      jabatan: uJabatan.trim() || selectedRole.nama,
      telepon: uTelepon.trim() || '-',
      gedungIds: includeGedung ? uGedungIds : undefined,
      penghuniIds: includeAnak ? uPenghuniIds : undefined,
    });

    if (res.ok) {
      setUOpen(false);
      await refreshAdminAuthConfig();
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePengaturan({
      namaLembaga: namaLembaga.trim(),
      alamatLembaga: alamatLembaga.trim(),
      ambangPeringatanLisan: Number(ambangLisan),
      ambangSP1: Number(ambangSP1),
      ambangSP2: Number(ambangSP2),
      ambangSP3: Number(ambangSP3),
    });
  };

  const selectedModalRole = authStatus.roles.find((r) => r.id === uRoleId);

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('deployment')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'deployment' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy Production</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('roles')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'roles' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Manajemen Role ({authStatus.roles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('pengguna')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'pengguna' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Akun & Password ({db.pengguna.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('umum')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'umum' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Lembaga & Poin</span>
          </button>
        </div>

        <StatusTag
          label={isProduction ? 'Mode Production Aktif' : 'Mode Demo Aktif'}
          tone={isProduction ? 'emerald' : 'amber'}
        />
      </div>

      {/* TAB 1: DEPLOYMENT PRODUCTION */}
      {tab === 'deployment' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-5">
            {/* Status Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Mode Operasional & Autentikasi
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    {isProduction
                      ? 'Sistem berjalan dalam Mode Production. Setiap pengguna wajib login menggunakan username dan kata sandi terenkripsi.'
                      : 'Saat ini sistem berada di Mode Demo (pemilihan peran cepat). Siapkan kata sandi Admin lalu aktifkan Mode Production saat siap digunakan.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyMode || (!isProduction && !adminReady)}
                  onClick={handleToggleMode}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 min-h-[40px] disabled:opacity-40 ${
                    isProduction
                      ? 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                      : 'text-white bg-teal-700 hover:bg-teal-800'
                  }`}
                >
                  {isProduction
                    ? 'Kembalikan ke Mode Demo'
                    : 'Aktifkan Mode Production'}
                </button>
              </div>

              {/* Checklist Kesiapan Production */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-500 tracking-wide">
                  Checklist Kesiapan Production
                </div>

                <div className="flex items-start justify-between gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        adminReady ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        1. Kredensial Administrator Utama
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {authStatus.envAdminConfigured
                          ? 'Dikonfigurasi melalui environment secret (ADMIN_PASSCODE).'
                          : authStatus.adminClaimed
                          ? 'Username & kata sandi Admin telah tersimpan aman di server.'
                          : 'Belum diatur. Lengkapi formulir di sebelah kanan untuk mengatur password Admin.'}
                      </div>
                    </div>
                  </div>
                  <StatusTag
                    label={adminReady ? 'Siap' : 'Perlu Diatur'}
                    tone={adminReady ? 'emerald' : 'amber'}
                  />
                </div>

                <div className="flex items-start justify-between gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        usersWithPasswordCount > 1 ? 'text-emerald-600' : 'text-amber-500'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        2. Akun Pembina, Keamanan & Wali Santri
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {usersWithPasswordCount} dari {db.pengguna.length} akun pengguna sudah memiliki kata sandi.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('pengguna')}
                    className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    Atur Akun →
                  </button>
                </div>

                <div className="flex items-start justify-between gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        3. Matriks Manajemen Role ({authStatus.roles.length} Role)
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Atur hak akses halaman dan tombol operasional per peran sebelum operasional penuh.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('roles')}
                    className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    Kelola Role →
                  </button>
                </div>
              </div>
            </div>

            {/* Panduan Build & Environment Production */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                Panduan Hosting & Environment Production
              </h4>
              <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-600 space-y-1.5 leading-relaxed">
                <li>
                  Aktifkan <strong>Mode Production</strong> di atas atau atur variabel lingkungan{' '}
                  <code className="font-mono-num text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    APP_MODE=production
                  </code>{' '}
                  pada panel Secrets / Hosting.
                </li>
                <li>
                  Opsional: atur{' '}
                  <code className="font-mono-num text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    ADMIN_PASSCODE
                  </code>{' '}
                  di Secrets jika ingin mengunci password cadangan Administrator di tingkat server.
                </li>
                <li>
                  Untuk deployment mandiri, jalankan{' '}
                  <code className="font-mono-num text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    npm run build
                  </code>{' '}
                  lalu jalankan server dengan{' '}
                  <code className="font-mono-num text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    NODE_ENV=production npm start
                  </code>
                  .
                </li>
              </ol>
            </div>
          </div>

          {/* Right Column: Setup Password Admin / Ubah Password */}
          <div className="lg:col-span-5 space-y-5">
            {!adminReady ? (
              <form
                onSubmit={(e) => handleClaimAdminInline(e, true)}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Lock className="w-4 h-4 text-teal-700" />
                  <span>Atur Username & Kata Sandi Admin</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Langkah wajib sebelum masuk ke Mode Production. Kata sandi disimpan terenkripsi (scrypt) di server dan tidak pernah diekspos ke browser.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Username Administrator *
                  </label>
                  <input
                    required
                    type="text"
                    value={adminClaimUser}
                    onChange={(e) => setAdminClaimUser(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
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
                    value={adminClaimPass}
                    onChange={(e) => setAdminClaimPass(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Konfirmasi Kata Sandi *
                  </label>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={adminClaimConfirm}
                    onChange={(e) => setAdminClaimConfirm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={busyMode}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                  >
                    Simpan Password & Aktifkan Production
                  </button>
                  <button
                    type="button"
                    disabled={busyMode}
                    onClick={(e) => handleClaimAdminInline(e, false)}
                    className="w-full py-2 px-4 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg"
                  >
                    Simpan Password Saja (Tetap Mode Demo)
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleChangeOwnPass}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <KeyRound className="w-4 h-4 text-teal-700" />
                  <span>Ubah Kata Sandi Akun Saya</span>
                </div>
                <p className="text-xs text-slate-500">
                  Akun aktif: <strong>{currentUser?.nama}</strong> (
                  <span className="font-mono-num">{currentUser?.username || currentUser?.id}</span>)
                </p>
                {!authStatus.envAdminConfigured && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Kata Sandi Saat Ini
                      </label>
                      <input
                        required
                        type="password"
                        value={oldPass}
                        onChange={(e) => setOldPass(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Kata Sandi Baru (min. 6 karakter)
                      </label>
                      <input
                        required
                        minLength={6}
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                    >
                      Perbarui Kata Sandi
                    </button>
                  </>
                )}
                {authStatus.envAdminConfigured && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    Kata sandi Admin dikelola oleh environment secret <code>ADMIN_PASSCODE</code>.
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANAJEMEN ROLE */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Manajemen Role & Hak Akses Modul
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Sesuaikan akses halaman, cakupan data, dan izin aksi untuk setiap peran di lingkungan production.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateRole}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Role Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {authStatus.roles.map((role) => {
              const assignedCount = db.pengguna.filter(
                (u) => (u.roleId || `role-${u.peran.toLowerCase()}`) === role.id
              ).length;
              const scopeLabel =
                role.scopeMode === 'semua'
                  ? 'Semua Data Asrama'
                  : role.scopeMode === 'gedung_terkait'
                  ? 'Gedung Tanggung Jawab'
                  : 'Santri Terkait Saja';

              return (
                <div
                  key={role.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-slate-900">{role.nama}</h4>
                          <StatusTag
                            label={role.isSystem ? 'Bawaan Sistem' : 'Role Kustom'}
                            tone={role.isSystem ? 'slate' : 'blue'}
                            withIcon={false}
                          />
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {role.deskripsi}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-slate-500">Dasar Peran:</span>{' '}
                        <span className="font-semibold text-slate-900">{role.basePeran}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Cakupan:</span>{' '}
                        <span className="font-semibold text-slate-900">{scopeLabel}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Modul Aktif:</span>{' '}
                        <span className="font-mono-num font-semibold text-slate-900">
                          {role.allowedPages.length} halaman
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Pengguna:</span>{' '}
                        <span className="font-mono-num font-semibold text-slate-900">
                          {assignedCount} akun
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Akses halaman:</span>{' '}
                      {role.allowedPages
                        .map((pid) => ALL_PAGE_META.find((m) => m.id === pid)?.label || pid)
                        .join(' · ')}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditRole(role)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Atur Hak Akses</span>
                    </button>
                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() =>
                          askConfirm({
                            title: 'Hapus Role Kustom',
                            message: `Yakin ingin menghapus role "${role.nama}"?`,
                            onConfirm: () => deleteRoleDefinition(role.id),
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AKUN & PASSWORD PENGGUNA */}
      {tab === 'pengguna' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Akun Pengguna, Username & Kata Sandi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tetapkan username, kata sandi, dan role untuk setiap Pembina, Keamanan, atau Wali Santri sebelum Mode Production diaktifkan.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddUserModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Akun Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-medium">Nama & Jabatan</th>
                  <th className="py-3 px-4 font-medium">Username Login</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Kata Sandi</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.pengguna.map((u) => {
                  const authMeta = userAuthList.find((a) => a.userId === u.id);
                  const roleObj = authStatus.roles.find(
                    (r) => r.id === (authMeta?.roleId || u.roleId)
                  );
                  const hasPassword = authMeta?.hasPassword ?? false;
                  const isActive = authMeta?.active ?? true;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.nama}</div>
                        <div className="text-xs text-slate-500">
                          {u.jabatan} · {u.telepon}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono-num text-xs text-slate-800">
                        {authMeta?.username || u.username || u.id}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {roleObj?.nama ?? u.peran}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag
                          label={hasPassword ? 'Sudah Diatur' : 'Belum Diatur'}
                          tone={hasPassword ? 'emerald' : 'amber'}
                        />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag
                          label={isActive ? 'Aktif' : 'Nonaktif'}
                          tone={isActive ? 'emerald' : 'red'}
                          withIcon={false}
                        />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditUserCredsModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg"
                          >
                            <UserCog className="w-3.5 h-3.5" />
                            <span>Atur Login & Role</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: 'Hapus Pengguna',
                                message: `Hapus akun pengguna "${u.nama}"?`,
                                onConfirm: () => deletePengguna(u.id),
                              })
                            }
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LEMBAGA & AMBANG POIN */}
      {tab === 'umum' && (
        <form
          onSubmit={handleSaveSettings}
          className="max-w-2xl bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-base font-bold text-slate-900">
            Identitas Lembaga & Ambang Batas Poin
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Sekolah / Pesantren
            </label>
            <input
              required
              type="text"
              value={namaLembaga}
              onChange={(e) => setNamaLembaga(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Alamat</label>
            <input
              required
              type="text"
              value={alamatLembaga}
              onChange={(e) => setAlamatLembaga(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Ambang Batas Poin Pelanggaran Otomatis
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Peringatan Lisan</label>
                <input
                  type="number"
                  value={ambangLisan}
                  onChange={(e) => setAmbangLisan(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Surat Peringatan 1</label>
                <input
                  type="number"
                  value={ambangSP1}
                  onChange={(e) => setAmbangSP1(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Surat Peringatan 2</label>
                <input
                  type="number"
                  value={ambangSP2}
                  onChange={(e) => setAmbangSP2(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">SP 3 / Panggil Wali</label>
                <input
                  type="number"
                  value={ambangSP3}
                  onChange={(e) => setAmbangSP3(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                askConfirm({
                  title: 'Reset Data Contoh',
                  message:
                    'Semua perubahan data asrama di browser akan dikembalikan ke data contoh awal (32 penghuni, 3 gedung, 15 kamar). Lanjutkan?',
                  confirmLabel: 'Ya, Reset Data',
                  onConfirm: resetDemoData,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-50 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Contoh</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal Tambah / Edit Role */}
      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editRole ? `Atur Role: ${editRole.nama}` : 'Buat Role Baru'}
        subtitle="Tentukan dasar peran, cakupan data, halaman yang boleh diakses, dan hak aksi."
        size="lg"
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Role *</label>
              <input
                required
                type="text"
                value={rNama}
                onChange={(e) => setRNama(e.target.value)}
                placeholder="Misal: Bendahara Asrama / Petugas UKS"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dasar Peran *
              </label>
              <select
                value={rBasePeran}
                disabled={Boolean(editRole?.isSystem)}
                onChange={(e) => setRBasePeran(e.target.value as PeranPengguna)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
              >
                <option value="Admin">Admin</option>
                <option value="Pembina">Pembina / Musyrif</option>
                <option value="Keamanan">Keamanan / Piket</option>
                <option value="Wali">Wali Santri</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi</label>
              <input
                type="text"
                value={rDeskripsi}
                onChange={(e) => setRDeskripsi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cakupan Data (Scope)
              </label>
              <select
                value={rScope}
                onChange={(e) => setRScope(e.target.value as RoleScopeMode)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="semua">Semua Data Asrama</option>
                <option value="gedung_terkait">Hanya Gedung yang Menjadi Tanggung Jawab</option>
                <option value="anak_terkait">Hanya Data Anak / Santri Terkait (Wali)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
                Akses Modul / Halaman
              </span>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRPages(ALL_PAGE_META.map((m) => m.id))}
                  className="text-teal-700 hover:underline"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setRPages(['dashboard'])}
                  className="text-slate-500 hover:underline"
                >
                  Minimal
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_PAGE_META.map((pg) => {
                const locked =
                  editRole?.id === 'role-admin' &&
                  (pg.id === 'dashboard' || pg.id === 'pengaturan');
                return (
                  <label
                    key={pg.id}
                    className="flex items-center gap-2 text-xs text-slate-700 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={rPages.includes(pg.id)}
                      onChange={() => toggleRolePage(pg.id)}
                    />
                    <span>{pg.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="text-xs font-semibold text-slate-800 mb-2">Hak Aksi Operasional</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              {(
                [
                  ['canCreateEdit', 'Tambah & Ubah Data'],
                  ['canDelete', 'Hapus Data'],
                  ['canApproveIzin', 'Setujui / Tolak Perizinan'],
                  ['canManageGate', 'Catat Gerbang & Buku Tamu'],
                  ['canManageBilling', 'Kelola & Konfirmasi Tagihan'],
                  ['canExportReport', 'Cetak PDF & Ekspor CSV'],
                ] as [keyof RoleCapabilities, string][]
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={rCaps[key]}
                    onChange={(e) =>
                      setRCaps((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Simpan Role
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah / Edit Akun Pengguna + Password */}
      <Modal
        open={uOpen}
        onClose={() => setUOpen(false)}
        title={
          editUserTarget
            ? `Atur Kredensial & Role: ${editUserTarget.nama}`
            : 'Tambah Akun Pengguna Baru'
        }
        subtitle="Password di-hash secara aman di server dan tidak pernah disimpan dalam bentuk teks biasa."
        size="md"
      >
        <form onSubmit={handleSaveUserAndCreds} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap *
              </label>
              <input
                required
                type="text"
                value={uNama}
                onChange={(e) => setUNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Username Login *
              </label>
              <input
                required
                type="text"
                value={uUsername}
                onChange={(e) => setUUsername(e.target.value)}
                placeholder="huruf kecil tanpa spasi"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {editUserTarget
                  ? 'Kata Sandi Baru (kosongkan jika tetap)'
                  : 'Kata Sandi (min. 6 karakter) *'}
              </label>
              <input
                required={!editUserTarget && isProduction}
                minLength={6}
                type="password"
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
                placeholder={editUserTarget ? 'Isi untuk mengubah' : 'Minimal 6 karakter'}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Role / Hak Akses *
              </label>
              <select
                value={uRoleId}
                onChange={(e) => setURoleId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {authStatus.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                No. Telepon *
              </label>
              <input
                required
                type="text"
                value={uTelepon}
                onChange={(e) => setUTelepon(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jabatan / Keterangan *
              </label>
              <input
                required
                type="text"
                value={uJabatan}
                onChange={(e) => setUJabatan(e.target.value)}
                placeholder="Misal: Musyrif Asrama Al-Kautsar"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            {(selectedModalRole?.scopeMode === 'gedung_terkait' ||
              selectedModalRole?.basePeran === 'Pembina') && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gedung Tanggung Jawab
                </label>
                <div className="flex flex-wrap gap-3">
                  {db.gedung.map((g) => (
                    <label
                      key={g.id}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={uGedungIds.includes(g.id)}
                        onChange={(e) =>
                          setUGedungIds((prev) =>
                            e.target.checked
                              ? [...prev, g.id]
                              : prev.filter((id) => id !== g.id)
                          )
                        }
                      />
                      <span>{g.nama}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(selectedModalRole?.scopeMode === 'anak_terkait' ||
              selectedModalRole?.basePeran === 'Wali') && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hubungkan dengan Santri
                </label>
                <select
                  value={uPenghuniIds[0] || ''}
                  onChange={(e) => setUPenghuniIds(e.target.value ? [e.target.value] : [])}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Pilih Santri --</option>
                  {db.penghuni.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.kelas})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={uActive}
                  onChange={(e) => setUActive(e.target.checked)}
                />
                <span>Akun Aktif (dapat digunakan untuk masuk di Mode Production)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setUOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Simpan Akun & Kredensial
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
