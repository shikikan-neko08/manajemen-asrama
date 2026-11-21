import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Absensi,
  AppDeploymentMode,
  AuthServerStatus,
  DormDatabase,
  Gedung,
  Inventaris,
  JadwalPiket,
  JenisPelanggaran,
  Kamar,
  Kegiatan,
  Kesehatan,
  LaporanKerusakan,
  Pelanggaran,
  PembinaanPrestasi,
  PengaturanAsrama,
  Penghuni,
  Pengumuman,
  Pengguna,
  Perizinan,
  RoleDefinition,
  Tagihan,
  Tamu,
  UserAuthSummary,
} from '../types/dorm';
import { createSeedDatabase } from '../data/seedData';
import { generateId, getNowDateTimeLocal, getTodayISO } from '../utils/formatters';
import { DEFAULT_ROLES, resolveUserRole } from '../utils/permissions';

const STORAGE_KEY = 'sim_asrama_db_v1';
const USER_STORAGE_KEY = 'sim_asrama_active_user_v1';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface SaveCredentialsInput {
  username: string;
  password?: string;
  roleId: string;
  active: boolean;
  nama?: string;
  jabatan?: string;
  telepon?: string;
  gedungIds?: string[];
  penghuniIds?: string[];
}

interface DormContextValue {
  db: DormDatabase;
  currentUser: Pengguna | null;
  activeRole: RoleDefinition;
  authStatus: AuthServerStatus;
  authLoading: boolean;
  userAuthList: UserAuthSummary[];
  loginAs: (userId: string) => Promise<void>;
  loginWithCredentials: (username: string, password: string) => Promise<ActionResult>;
  claimAdminSetup: (params: {
    username: string;
    password: string;
    activateProduction: boolean;
  }) => Promise<ActionResult>;
  logout: () => Promise<void>;
  refreshAdminAuthConfig: () => Promise<void>;
  switchDeploymentMode: (mode: AppDeploymentMode) => Promise<ActionResult>;
  saveUserCredentials: (userId: string, payload: SaveCredentialsInput) => Promise<ActionResult>;
  saveRoleDefinition: (role: Partial<RoleDefinition> & { nama: string }) => Promise<ActionResult>;
  deleteRoleDefinition: (roleId: string) => Promise<ActionResult>;
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<ActionResult>;
  resetDemoData: () => void;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  confirmState: ConfirmOptions | null;
  askConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;

  // Helpers
  getKamarOccupancy: (kamarId: string, excludePenghuniId?: string) => number;
  getPenghuniPoin: (penghuniId: string) => { totalPelanggaran: number; totalPengurang: number; poinBersih: number };

  // Penghuni
  savePenghuni: (data: Omit<Penghuni, 'id'>, editId?: string) => ActionResult;
  deletePenghuni: (id: string) => void;
  pindahKamar: (penghuniId: string, keKamarId: string, alasan: string) => ActionResult;

  // Gedung & Kamar
  saveGedung: (data: Omit<Gedung, 'id'>, editId?: string) => ActionResult;
  deleteGedung: (id: string) => ActionResult;
  saveKamar: (data: Omit<Kamar, 'id'>, editId?: string) => ActionResult;
  deleteKamar: (id: string) => ActionResult;

  // Absensi
  saveAbsensiBatch: (records: Omit<Absensi, 'id'>[]) => void;

  // Perizinan & Keluar-Masuk
  createPerizinan: (data: Omit<Perizinan, 'id' | 'status' | 'tanggalKembaliAktual'>) => ActionResult;
  updateStatusPerizinan: (id: string, action: 'Setujui' | 'Tolak' | 'Keluar' | 'Kembali', catatan?: string) => ActionResult;
  deletePerizinan: (id: string) => void;

  // Tamu & Log
  addTamu: (data: Omit<Tamu, 'id'>) => void;
  catatTamuKeluar: (tamuId: string, jamKeluar?: string) => void;
  deleteTamu: (id: string) => void;

  // Pelanggaran & Pembinaan
  addPelanggaran: (data: Omit<Pelanggaran, 'id'>) => void;
  deletePelanggaran: (id: string) => void;
  addPembinaanPrestasi: (data: Omit<PembinaanPrestasi, 'id'>) => void;
  deletePembinaanPrestasi: (id: string) => void;
  saveJenisPelanggaran: (data: Omit<JenisPelanggaran, 'id'>, editId?: string) => void;
  deleteJenisPelanggaran: (id: string) => void;

  // Inventaris & Kerusakan
  saveInventaris: (data: Omit<Inventaris, 'id'>, editId?: string) => void;
  deleteInventaris: (id: string) => void;
  saveLaporanKerusakan: (data: Omit<LaporanKerusakan, 'id'>, editId?: string, setKamarRusak?: boolean) => void;
  deleteLaporanKerusakan: (id: string) => void;

  // Kegiatan, Piket & Pengumuman
  saveKegiatan: (data: Omit<Kegiatan, 'id'>, editId?: string) => void;
  deleteKegiatan: (id: string) => void;
  saveJadwalPiket: (data: Omit<JadwalPiket, 'id'>, editId?: string) => void;
  deleteJadwalPiket: (id: string) => void;
  savePengumuman: (data: Omit<Pengumuman, 'id'>, editId?: string) => void;
  deletePengumuman: (id: string) => void;

  // Kesehatan
  saveKesehatan: (data: Omit<Kesehatan, 'id'>, editId?: string) => void;
  deleteKesehatan: (id: string) => void;

  // Tagihan
  saveTagihan: (data: Omit<Tagihan, 'id'>, editId?: string) => void;
  generateTagihanBulanan: (bulan: string, tahun: number, nominal: number, jatuhTempo: string) => number;
  tandaiTagihanLunas: (id: string, metodeBayar: string) => void;
  deleteTagihan: (id: string) => void;

  // Pengaturan & Pengguna
  updatePengaturan: (data: PengaturanAsrama) => void;
  savePengguna: (data: Omit<Pengguna, 'id'>, editId?: string) => void;
  deletePengguna: (id: string) => ActionResult;
}

const DormContext = createContext<DormContextValue | null>(null);

function loadInitialDb(): DormDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DormDatabase;
      if (parsed && Array.isArray(parsed.penghuni) && Array.isArray(parsed.gedung)) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted localStorage and fall back to seed
  }
  const seed = createSeedDatabase();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

export const DormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DormDatabase>(() => loadInitialDb());
  const [authToken, setAuthToken] = useState<string | null>(null); // In-memory Bearer token ONLY
  const [authedUser, setAuthedUser] = useState<Pengguna | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthServerStatus>({
    mode: 'demo',
    adminClaimed: false,
    envAdminConfigured: false,
    roles: DEFAULT_ROLES,
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [userAuthList, setUserAuthList] = useState<UserAuthSummary[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // ignore quota errors
    }
  }, [db]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const askConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  const currentUser = authedUser
    ? db.pengguna.find((u) => u.id === authedUser.id) ?? authedUser
    : null;

  const activeRole = resolveUserRole(currentUser, authStatus.roles);

  const loginAs = useCallback(
    async (userId: string) => {
      const target = db.pengguna.find((u) => u.id === userId);
      if (!target) return;
      try {
        const res = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: target.id,
            nama: target.nama,
            peran: target.peran,
            roleId: target.roleId,
            jabatan: target.jabatan,
            telepon: target.telepon,
            gedungIds: target.gedungIds,
            penghuniIds: target.penghuniIds,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast(data.message || 'Gagal masuk ke mode demo.', 'error');
          return;
        }
        setAuthToken(data.token);
        setAuthedUser(data.user);
        localStorage.setItem(USER_STORAGE_KEY, userId);
      } catch {
        showToast('Tidak dapat terhubung ke server autentikasi.', 'error');
      }
    },
    [db.pengguna, showToast]
  );

  // Boot: check server deployment mode & roles
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = (await res.json()) as AuthServerStatus;
          if (!active) return;
          setAuthStatus(data);
          if (data.mode === 'demo') {
            const savedId = localStorage.getItem(USER_STORAGE_KEY);
            if (savedId) {
              const target = db.pengguna.find((u) => u.id === savedId);
              if (target) {
                const loginRes = await fetch('/api/auth/demo-login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: target.id,
                    nama: target.nama,
                    peran: target.peran,
                    roleId: target.roleId,
                    jabatan: target.jabatan,
                    telepon: target.telepon,
                    gedungIds: target.gedungIds,
                    penghuniIds: target.penghuniIds,
                  }),
                });
                const loginData = await loginRes.json();
                if (active && loginRes.ok && loginData.ok) {
                  setAuthToken(loginData.token);
                  setAuthedUser(loginData.user);
                }
              }
            }
          } else {
            // Production mode never auto-logins from localStorage
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        }
      } catch {
        // Keep defaults if offline
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginWithCredentials = useCallback(
    async (username: string, password: string): Promise<ActionResult> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, message: data.message || 'Username atau kata sandi salah.' };
        }
        setAuthToken(data.token);
        setAuthedUser(data.user);
        setDb((prev) => {
          const exists = prev.pengguna.some((u) => u.id === data.user.id);
          return {
            ...prev,
            pengguna: exists
              ? prev.pengguna.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u))
              : [data.user, ...prev.pengguna],
          };
        });
        showToast(`Selamat datang, ${data.user.nama}`, 'success');
        return { ok: true, message: 'Login berhasil' };
      } catch {
        return { ok: false, message: 'Gagal terhubung ke server.' };
      }
    },
    [showToast]
  );

  const claimAdminSetup = useCallback(
    async (params: {
      username: string;
      password: string;
      activateProduction: boolean;
    }): Promise<ActionResult> => {
      try {
        const res = await fetch('/api/auth/claim-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast(data.message || 'Gagal mengatur akun Administrator.', 'error');
          return { ok: false, message: data.message || 'Gagal' };
        }
        setAuthToken(data.token);
        setAuthedUser(data.user);
        setAuthStatus((prev) => ({
          ...prev,
          mode: data.mode ?? prev.mode,
          adminClaimed: true,
        }));
        setDb((prev) => ({
          ...prev,
          pengguna: prev.pengguna.map((u) =>
            u.id === data.user.id ? { ...u, username: data.user.username, roleId: data.user.roleId } : u
          ),
        }));
        showToast(
          params.activateProduction
            ? 'Akun Administrator tersimpan & Mode Production aktif!'
            : 'Akun Administrator berhasil dikonfigurasi.',
          'success'
        );
        return { ok: true, message: 'OK' };
      } catch {
        return { ok: false, message: 'Gagal terhubung ke server.' };
      }
    },
    [showToast]
  );

  const logout = useCallback(async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // ignore network errors on logout
      }
    }
    setAuthToken(null);
    setAuthedUser(null);
    setUserAuthList([]);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, [authToken]);

  const refreshAdminAuthConfig = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/auth-config', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAuthStatus({
          mode: data.mode,
          adminClaimed: data.adminClaimed,
          envAdminConfigured: data.envAdminConfigured,
          roles: data.roles,
        });
        setUserAuthList(data.users || []);
      }
    } catch {
      // ignore
    }
  }, [authToken]);

  const switchDeploymentMode = useCallback(
    async (mode: AppDeploymentMode): Promise<ActionResult> => {
      if (!authToken) return { ok: false, message: 'Sesi tidak ditemukan.' };
      try {
        const res = await fetch('/api/admin/mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ mode }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast(data.message || 'Gagal mengubah mode deployment.', 'error');
          return { ok: false, message: data.message || 'Gagal' };
        }
        setAuthStatus((prev) => ({ ...prev, mode: data.mode }));
        if (data.mode === 'production') {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
        showToast(
          data.mode === 'production'
            ? 'Sistem dialihkan ke Mode Production (login menggunakan username & kata sandi).'
            : 'Sistem dialihkan ke Mode Demo (pilih peran cepat).',
          'success'
        );
        return { ok: true, message: 'OK' };
      } catch {
        return { ok: false, message: 'Gagal terhubung ke server.' };
      }
    },
    [authToken, showToast]
  );

  const saveUserCredentials = useCallback(
    async (userId: string, payload: SaveCredentialsInput): Promise<ActionResult> => {
      if (!authToken) return { ok: false, message: 'Sesi tidak ditemukan.' };
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast(data.message || 'Gagal menyimpan kredensial pengguna.', 'error');
          return { ok: false, message: data.message || 'Gagal' };
        }
        setUserAuthList((prev) => {
          const exists = prev.some((u) => u.userId === userId);
          return exists
            ? prev.map((u) => (u.userId === userId ? data.userAuth : u))
            : [...prev, data.userAuth];
        });
        setDb((prev) => {
          const exists = prev.pengguna.some((u) => u.id === userId);
          return {
            ...prev,
            pengguna: exists
              ? prev.pengguna.map((u) => (u.id === userId ? { ...u, ...data.publicUser } : u))
              : [...prev.pengguna, data.publicUser],
          };
        });
        if (payload.password) {
          const role = authStatus.roles.find((r) => r.id === payload.roleId);
          if (role?.basePeran === 'Admin') {
            setAuthStatus((prev) => ({ ...prev, adminClaimed: true }));
          }
        }
        showToast('Kredensial & role pengguna berhasil disimpan.', 'success');
        return { ok: true, message: 'OK' };
      } catch {
        return { ok: false, message: 'Gagal terhubung ke server.' };
      }
    },
    [authToken, authStatus.roles, showToast]
  );

  const saveRoleDefinition = useCallback(
    async (role: Partial<RoleDefinition> & { nama: string }): Promise<ActionResult> => {
      if (!authToken) return { ok: false, message: 'Sesi tidak ditemukan.' };
      try {
        const res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(role),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast(data.message || 'Gagal menyimpan role.', 'error');
          return { ok: false, message: data.message || 'Gagal' };
        }
        setAuthStatus((prev) => ({ ...prev, roles: data.roles }));
        showToast(`Role "${role.nama}" berhasil disimpan.`, 'success');
        return { ok: true, message: 'OK' };
      } catch {
        return { ok: false, message: 'Gagal terhubung ke server.' };
      }
    },
    [authToken, showToast]
  );

  const deleteRoleDefinition = useCallback(
    async (roleId: string): Promise<ActionResult> => {
      if (!authToken) return { ok: false, message: 'Sesi tidak ditemukan.' };
      try {
        const res = await fetch(`/api/admin/roles/${encodeURIComponent(roleId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast(data.message || 'Gagal menghapus role.', 'error');
          return { ok: false, message: data.message || 'Gagal' };
        }
        setAuthStatus((prev) => ({ ...prev, roles: data.roles }));
        showToast('Role berhasil dihapus.', 'info');
        return { ok: true, message: 'OK' };
      } catch {
        return { ok: false, message: 'Gagal terhubung ke server.' };
      }
    },
    [authToken, showToast]
  );

  const changeOwnPassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<ActionResult> => {
      if (!authToken) return { ok: false, message: 'Sesi tidak ditemukan.' };
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showToast(data.message || 'Gagal memperbarui kata sandi.', 'error');
          return { ok: false, message: data.message || 'Gagal' };
        }
        showToast('Kata sandi akun Anda berhasil diperbarui.', 'success');
        return { ok: true, message: 'OK' };
      } catch {
        return { ok: false, message: 'Gagal terhubung ke server.' };
      }
    },
    [authToken, showToast]
  );

  const resetDemoData = useCallback(() => {
    const seed = createSeedDatabase();
    setDb(seed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    showToast('Data contoh berhasil dikembalikan ke pengaturan awal.', 'info');
  }, [showToast]);

  const getKamarOccupancy = useCallback(
    (kamarId: string, excludePenghuniId?: string) => {
      return db.penghuni.filter(
        (p) =>
          p.kamarId === kamarId &&
          p.status !== 'Lulus' &&
          p.id !== excludePenghuniId
      ).length;
    },
    [db.penghuni]
  );

  const getPenghuniPoin = useCallback(
    (penghuniId: string) => {
      const totalPelanggaran = db.pelanggaran
        .filter((pl) => pl.penghuniId === penghuniId)
        .reduce((acc, item) => acc + item.poin, 0);
      const totalPengurang = db.pembinaanPrestasi
        .filter((pp) => pp.penghuniId === penghuniId)
        .reduce((acc, item) => acc + (item.poinPengurang || 0), 0);
      const poinBersih = Math.max(0, totalPelanggaran - totalPengurang);
      return { totalPelanggaran, totalPengurang, poinBersih };
    },
    [db.pelanggaran, db.pembinaanPrestasi]
  );

  const validateRoomPlacement = (
    kamarId: string,
    jenisKelamin: 'Putra' | 'Putri',
    statusPenghuni: string,
    excludePenghuniId?: string
  ): ActionResult => {
    if (statusPenghuni === 'Lulus') {
      return { ok: true, message: 'OK' };
    }
    const kamar = db.kamar.find((k) => k.id === kamarId);
    if (!kamar) {
      return { ok: false, message: 'Kamar tujuan tidak ditemukan.' };
    }
    const gedung = db.gedung.find((g) => g.id === kamar.gedungId);
    if (!gedung) {
      return { ok: false, message: 'Gedung tujuan tidak ditemukan.' };
    }
    if (gedung.jenis !== jenisKelamin) {
      return {
        ok: false,
        message: `Penghuni ${jenisKelamin} tidak diperbolehkan menempati gedung ${gedung.nama} (${gedung.jenis}).`,
      };
    }
    if (kamar.kondisi === 'Dalam Perbaikan') {
      return {
        ok: false,
        message: `Kamar ${kamar.nomor} sedang dalam perbaikan dan belum dapat ditempati.`,
      };
    }
    const occupied = getKamarOccupancy(kamarId, excludePenghuniId);
    if (occupied >= kamar.kapasitas) {
      return {
        ok: false,
        message: `Kamar ${kamar.nomor} sudah penuh (${occupied}/${kamar.kapasitas} penghuni).`,
      };
    }
    return { ok: true, message: 'OK' };
  };

  const savePenghuni = (data: Omit<Penghuni, 'id'>, editId?: string): ActionResult => {
    const check = validateRoomPlacement(data.kamarId, data.jenisKelamin, data.status, editId);
    if (!check.ok) {
      showToast(check.message, 'error');
      return check;
    }

    if (editId) {
      const existing = db.penghuni.find((p) => p.id === editId);
      const roomChanged = existing && existing.kamarId !== data.kamarId;
      setDb((prev) => ({
        ...prev,
        penghuni: prev.penghuni.map((p) => (p.id === editId ? { ...data, id: editId } : p)),
        penempatan: roomChanged
          ? [
              {
                id: generateId('pm'),
                penghuniId: editId,
                dariKamarId: existing.kamarId,
                keKamarId: data.kamarId,
                tanggal: getTodayISO(),
                alasan: 'Pembaruan kamar melalui data penghuni',
                dicatatOleh: currentUser?.nama ?? 'Sistem',
              },
              ...prev.penempatan,
            ]
          : prev.penempatan,
      }));
      showToast(`Data penghuni "${data.nama}" berhasil diperbarui.`, 'success');
      return { ok: true, message: 'Data diperbarui' };
    }

    const newId = generateId('s');
    setDb((prev) => ({
      ...prev,
      penghuni: [{ ...data, id: newId }, ...prev.penghuni],
      penempatan: [
        {
          id: generateId('pm'),
          penghuniId: newId,
          dariKamarId: null,
          keKamarId: data.kamarId,
          tanggal: data.tanggalMasuk || getTodayISO(),
          alasan: 'Penempatan awal penghuni baru',
          dicatatOleh: currentUser?.nama ?? 'Sistem',
        },
        ...prev.penempatan,
      ],
    }));
    showToast(`Penghuni baru "${data.nama}" berhasil ditambahkan.`, 'success');
    return { ok: true, message: 'Data ditambahkan' };
  };

  const deletePenghuni = (id: string) => {
    const target = db.penghuni.find((p) => p.id === id);
    setDb((prev) => ({
      ...prev,
      penghuni: prev.penghuni.filter((p) => p.id !== id),
      absensi: prev.absensi.filter((a) => a.penghuniId !== id),
      perizinan: prev.perizinan.filter((iz) => iz.penghuniId !== id),
      pelanggaran: prev.pelanggaran.filter((pl) => pl.penghuniId !== id),
      penempatan: prev.penempatan.filter((pm) => pm.penghuniId !== id),
    }));
    showToast(`Data penghuni "${target?.nama ?? ''}" telah dihapus.`, 'info');
  };

  const pindahKamar = (penghuniId: string, keKamarId: string, alasan: string): ActionResult => {
    const penghuni = db.penghuni.find((p) => p.id === penghuniId);
    if (!penghuni) return { ok: false, message: 'Penghuni tidak ditemukan.' };
    if (penghuni.kamarId === keKamarId) {
      return { ok: false, message: 'Penghuni sudah berada di kamar tersebut.' };
    }
    const check = validateRoomPlacement(keKamarId, penghuni.jenisKelamin, penghuni.status, penghuniId);
    if (!check.ok) {
      showToast(check.message, 'error');
      return check;
    }
    const kamarTujuan = db.kamar.find((k) => k.id === keKamarId);
    setDb((prev) => ({
      ...prev,
      penghuni: prev.penghuni.map((p) => (p.id === penghuniId ? { ...p, kamarId: keKamarId } : p)),
      penempatan: [
        {
          id: generateId('pm'),
          penghuniId,
          dariKamarId: penghuni.kamarId,
          keKamarId,
          tanggal: getTodayISO(),
          alasan: alasan.trim() || 'Pemindahan kamar oleh pembina',
          dicatatOleh: currentUser?.nama ?? 'Pembina',
        },
        ...prev.penempatan,
      ],
    }));
    showToast(`${penghuni.nama} berhasil dipindahkan ke kamar ${kamarTujuan?.nomor ?? ''}.`, 'success');
    return { ok: true, message: 'Berhasil dipindahkan' };
  };

  const saveGedung = (data: Omit<Gedung, 'id'>, editId?: string): ActionResult => {
    if (editId) {
      const existing = db.gedung.find((g) => g.id === editId);
      if (existing && existing.jenis !== data.jenis) {
        const roomIds = db.kamar.filter((k) => k.gedungId === editId).map((k) => k.id);
        const hasResidents = db.penghuni.some((p) => roomIds.includes(p.kamarId) && p.status !== 'Lulus');
        if (hasResidents) {
          const msg = 'Jenis gedung (Putra/Putri) tidak dapat diubah selama masih ada penghuni aktif di dalamnya.';
          showToast(msg, 'error');
          return { ok: false, message: msg };
        }
      }
      setDb((prev) => ({
        ...prev,
        gedung: prev.gedung.map((g) => (g.id === editId ? { ...data, id: editId } : g)),
      }));
      showToast(`Gedung "${data.nama}" diperbarui.`, 'success');
      return { ok: true, message: 'OK' };
    }
    setDb((prev) => ({
      ...prev,
      gedung: [...prev.gedung, { ...data, id: generateId('g') }],
    }));
    showToast(`Gedung "${data.nama}" berhasil ditambahkan.`, 'success');
    return { ok: true, message: 'OK' };
  };

  const deleteGedung = (id: string): ActionResult => {
    const hasRooms = db.kamar.some((k) => k.gedungId === id);
    if (hasRooms) {
      const msg = 'Hapus atau pindahkan semua kamar di gedung ini terlebih dahulu.';
      showToast(msg, 'error');
      return { ok: false, message: msg };
    }
    setDb((prev) => ({ ...prev, gedung: prev.gedung.filter((g) => g.id !== id) }));
    showToast('Gedung berhasil dihapus.', 'info');
    return { ok: true, message: 'OK' };
  };

  const saveKamar = (data: Omit<Kamar, 'id'>, editId?: string): ActionResult => {
    if (editId) {
      const occupied = getKamarOccupancy(editId);
      if (data.kapasitas < occupied) {
        const msg = `Kapasitas tidak boleh lebih kecil dari jumlah penghuni saat ini (${occupied}).`;
        showToast(msg, 'error');
        return { ok: false, message: msg };
      }
      setDb((prev) => ({
        ...prev,
        kamar: prev.kamar.map((k) => (k.id === editId ? { ...data, id: editId } : k)),
      }));
      showToast(`Kamar ${data.nomor} diperbarui.`, 'success');
      return { ok: true, message: 'OK' };
    }
    setDb((prev) => ({
      ...prev,
      kamar: [...prev.kamar, { ...data, id: generateId('k') }],
    }));
    showToast(`Kamar ${data.nomor} berhasil ditambahkan.`, 'success');
    return { ok: true, message: 'OK' };
  };

  const deleteKamar = (id: string): ActionResult => {
    const occupied = getKamarOccupancy(id);
    if (occupied > 0) {
      const msg = `Kamar masih dihuni ${occupied} santri. Pindahkan penghuni terlebih dahulu.`;
      showToast(msg, 'error');
      return { ok: false, message: msg };
    }
    setDb((prev) => ({ ...prev, kamar: prev.kamar.filter((k) => k.id !== id) }));
    showToast('Kamar berhasil dihapus.', 'info');
    return { ok: true, message: 'OK' };
  };

  const saveAbsensiBatch = (records: Omit<Absensi, 'id'>[]) => {
    setDb((prev) => {
      const updated = [...prev.absensi];
      records.forEach((rec) => {
        // Business rule: Penghuni berstatus Izin/Pulang tidak dihitung Alpa
        const penghuni = prev.penghuni.find((p) => p.id === rec.penghuniId);
        const normalizedStatus =
          penghuni && (penghuni.status === 'Izin' || penghuni.status === 'Pulang') && rec.status === 'Alpa'
            ? 'Izin'
            : rec.status;

        const existingIdx = updated.findIndex(
          (a) => a.tanggal === rec.tanggal && a.sesi === rec.sesi && a.penghuniId === rec.penghuniId
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], ...rec, status: normalizedStatus };
        } else {
          updated.push({ ...rec, status: normalizedStatus, id: generateId('abs') });
        }
      });
      return { ...prev, absensi: updated };
    });
    showToast(`Absensi untuk ${records.length} penghuni berhasil disimpan.`, 'success');
  };

  const createPerizinan = (data: Omit<Perizinan, 'id' | 'status' | 'tanggalKembaliAktual'>): ActionResult => {
    if (new Date(data.perkiraanKembali) < new Date(data.tanggalKeluar)) {
      const msg = 'Perkiraan waktu kembali tidak boleh lebih awal dari waktu keluar.';
      showToast(msg, 'error');
      return { ok: false, message: msg };
    }
    const newItem: Perizinan = {
      ...data,
      id: generateId('iz'),
      status: 'Diajukan',
      tanggalKembaliAktual: null,
    };
    setDb((prev) => ({ ...prev, perizinan: [newItem, ...prev.perizinan] }));
    showToast('Pengajuan izin berhasil dicatat.', 'success');
    return { ok: true, message: 'OK' };
  };

  const updateStatusPerizinan = (
    id: string,
    action: 'Setujui' | 'Tolak' | 'Keluar' | 'Kembali',
    catatan?: string
  ): ActionResult => {
    const izin = db.perizinan.find((i) => i.id === id);
    if (!izin) return { ok: false, message: 'Data izin tidak ditemukan.' };
    const penghuni = db.penghuni.find((p) => p.id === izin.penghuniId);
    const nowStr = getNowDateTimeLocal();
    const actor = currentUser?.nama ?? 'Petugas';

    setDb((prev) => {
      let nextIzin = { ...izin };
      let nextPenghuniStatus = penghuni?.status ?? 'Aktif';
      let newLog = null as DormDatabase['logKeluarMasuk'][number] | null;

      if (action === 'Setujui') {
        nextIzin.status = 'Disetujui';
        nextIzin.disetujuiOleh = actor;
        if (catatan) nextIzin.catatanPembina = catatan;
      } else if (action === 'Tolak') {
        nextIzin.status = 'Ditolak';
        nextIzin.disetujuiOleh = actor;
        if (catatan) nextIzin.catatanPembina = catatan;
      } else if (action === 'Keluar') {
        nextIzin.status = 'Keluar';
        nextPenghuniStatus = izin.jenis === 'Pulang' ? 'Pulang' : 'Izin';
        newLog = {
          id: generateId('lk'),
          penghuniId: izin.penghuniId,
          perizinanId: izin.id,
          tipe: 'Keluar',
          waktu: nowStr,
          petugas: actor,
          catatan: catatan || `${izin.jenis}: ${izin.alasan}`,
        };
      } else if (action === 'Kembali') {
        nextIzin.status = 'Kembali';
        nextIzin.tanggalKembaliAktual = nowStr;
        nextPenghuniStatus = 'Aktif';
        newLog = {
          id: generateId('lk'),
          penghuniId: izin.penghuniId,
          perizinanId: izin.id,
          tipe: 'Masuk',
          waktu: nowStr,
          petugas: actor,
          catatan: catatan || `Kembali dari ${izin.jenis}`,
        };
      }

      return {
        ...prev,
        perizinan: prev.perizinan.map((p) => (p.id === id ? nextIzin : p)),
        penghuni: prev.penghuni.map((s) =>
          s.id === izin.penghuniId ? { ...s, status: nextPenghuniStatus } : s
        ),
        logKeluarMasuk: newLog ? [newLog, ...prev.logKeluarMasuk] : prev.logKeluarMasuk,
      };
    });

    const msgMap = {
      Setujui: 'Izin berhasil disetujui.',
      Tolak: 'Pengajuan izin ditolak.',
      Keluar: `${penghuni?.nama ?? 'Santri'} dicatat keluar asrama.`,
      Kembali: `${penghuni?.nama ?? 'Santri'} dicatat telah kembali ke asrama.`,
    };
    showToast(msgMap[action], action === 'Tolak' ? 'info' : 'success');
    return { ok: true, message: 'OK' };
  };

  const deletePerizinan = (id: string) => {
    setDb((prev) => ({
      ...prev,
      perizinan: prev.perizinan.filter((i) => i.id !== id),
    }));
    showToast('Data perizinan dihapus.', 'info');
  };

  const addTamu = (data: Omit<Tamu, 'id'>) => {
    setDb((prev) => ({ ...prev, tamu: [{ ...data, id: generateId('tm') }, ...prev.tamu] }));
    showToast(`Kunjungan tamu "${data.nama}" berhasil dicatat.`, 'success');
  };

  const catatTamuKeluar = (tamuId: string, jamKeluar?: string) => {
    const now = new Date();
    const hhmm =
      jamKeluar ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setDb((prev) => ({
      ...prev,
      tamu: prev.tamu.map((t) => (t.id === tamuId ? { ...t, jamKeluar: hhmm } : t)),
    }));
    showToast('Jam keluar tamu berhasil dicatat.', 'success');
  };

  const deleteTamu = (id: string) => {
    setDb((prev) => ({ ...prev, tamu: prev.tamu.filter((t) => t.id !== id) }));
    showToast('Data buku tamu dihapus.', 'info');
  };

  const addPelanggaran = (data: Omit<Pelanggaran, 'id'>) => {
    setDb((prev) => ({
      ...prev,
      pelanggaran: [{ ...data, id: generateId('pl') }, ...prev.pelanggaran],
    }));
    showToast('Catatan pelanggaran berhasil disimpan.', 'success');
  };

  const deletePelanggaran = (id: string) => {
    setDb((prev) => ({
      ...prev,
      pelanggaran: prev.pelanggaran.filter((p) => p.id !== id),
    }));
    showToast('Catatan pelanggaran dihapus.', 'info');
  };

  const addPembinaanPrestasi = (data: Omit<PembinaanPrestasi, 'id'>) => {
    setDb((prev) => ({
      ...prev,
      pembinaanPrestasi: [{ ...data, id: generateId('pp') }, ...prev.pembinaanPrestasi],
    }));
    showToast(`Catatan ${data.tipe.toLowerCase()} berhasil ditambahkan.`, 'success');
  };

  const deletePembinaanPrestasi = (id: string) => {
    setDb((prev) => ({
      ...prev,
      pembinaanPrestasi: prev.pembinaanPrestasi.filter((p) => p.id !== id),
    }));
    showToast('Catatan pembinaan/prestasi dihapus.', 'info');
  };

  const saveJenisPelanggaran = (data: Omit<JenisPelanggaran, 'id'>, editId?: string) => {
    if (editId) {
      setDb((prev) => ({
        ...prev,
        jenisPelanggaran: prev.jenisPelanggaran.map((j) => (j.id === editId ? { ...data, id: editId } : j)),
      }));
      showToast('Master jenis pelanggaran diperbarui.', 'success');
    } else {
      setDb((prev) => ({
        ...prev,
        jenisPelanggaran: [...prev.jenisPelanggaran, { ...data, id: generateId('jp') }],
      }));
      showToast('Jenis pelanggaran baru ditambahkan.', 'success');
    }
  };

  const deleteJenisPelanggaran = (id: string) => {
    setDb((prev) => ({
      ...prev,
      jenisPelanggaran: prev.jenisPelanggaran.filter((j) => j.id !== id),
    }));
    showToast('Jenis pelanggaran dihapus.', 'info');
  };

  const saveInventaris = (data: Omit<Inventaris, 'id'>, editId?: string) => {
    if (editId) {
      setDb((prev) => ({
        ...prev,
        inventaris: prev.inventaris.map((inv) => (inv.id === editId ? { ...data, id: editId } : inv)),
      }));
      showToast('Data inventaris diperbarui.', 'success');
    } else {
      setDb((prev) => ({
        ...prev,
        inventaris: [{ ...data, id: generateId('inv') }, ...prev.inventaris],
      }));
      showToast('Barang inventaris berhasil ditambahkan.', 'success');
    }
  };

  const deleteInventaris = (id: string) => {
    setDb((prev) => ({ ...prev, inventaris: prev.inventaris.filter((i) => i.id !== id) }));
    showToast('Item inventaris dihapus.', 'info');
  };

  const saveLaporanKerusakan = (
    data: Omit<LaporanKerusakan, 'id'>,
    editId?: string,
    setKamarRusak?: boolean
  ) => {
    setDb((prev) => {
      const nextLaporan = editId
        ? prev.laporanKerusakan.map((l) => (l.id === editId ? { ...data, id: editId } : l))
        : [{ ...data, id: generateId('lk-rusak') }, ...prev.laporanKerusakan];

      let nextKamar = prev.kamar;
      if (setKamarRusak !== undefined) {
        nextKamar = prev.kamar.map((k) =>
          k.id === data.kamarId ? { ...k, kondisi: setKamarRusak ? 'Dalam Perbaikan' : 'Baik' } : k
        );
      }

      return { ...prev, laporanKerusakan: nextLaporan, kamar: nextKamar };
    });
    showToast(editId ? 'Laporan kerusakan diperbarui.' : 'Laporan kerusakan berhasil dibuat.', 'success');
  };

  const deleteLaporanKerusakan = (id: string) => {
    setDb((prev) => ({
      ...prev,
      laporanKerusakan: prev.laporanKerusakan.filter((l) => l.id !== id),
    }));
    showToast('Laporan kerusakan dihapus.', 'info');
  };

  const saveKegiatan = (data: Omit<Kegiatan, 'id'>, editId?: string) => {
    if (editId) {
      setDb((prev) => ({
        ...prev,
        kegiatan: prev.kegiatan.map((k) => (k.id === editId ? { ...data, id: editId } : k)),
      }));
      showToast('Jadwal kegiatan diperbarui.', 'success');
    } else {
      setDb((prev) => ({
        ...prev,
        kegiatan: [...prev.kegiatan, { ...data, id: generateId('kg') }].sort((a, b) =>
          a.waktuMulai.localeCompare(b.waktuMulai)
        ),
      }));
      showToast('Jadwal kegiatan baru ditambahkan.', 'success');
    }
  };

  const deleteKegiatan = (id: string) => {
    setDb((prev) => ({ ...prev, kegiatan: prev.kegiatan.filter((k) => k.id !== id) }));
    showToast('Jadwal kegiatan dihapus.', 'info');
  };

  const saveJadwalPiket = (data: Omit<JadwalPiket, 'id'>, editId?: string) => {
    if (editId) {
      setDb((prev) => ({
        ...prev,
        jadwalPiket: prev.jadwalPiket.map((p) => (p.id === editId ? { ...data, id: editId } : p)),
      }));
      showToast('Jadwal piket diperbarui.', 'success');
    } else {
      setDb((prev) => ({
        ...prev,
        jadwalPiket: [...prev.jadwalPiket, { ...data, id: generateId('pk') }],
      }));
      showToast('Jadwal piket ditambahkan.', 'success');
    }
  };

  const deleteJadwalPiket = (id: string) => {
    setDb((prev) => ({ ...prev, jadwalPiket: prev.jadwalPiket.filter((p) => p.id !== id) }));
    showToast('Jadwal piket dihapus.', 'info');
  };

  const savePengumuman = (data: Omit<Pengumuman, 'id'>, editId?: string) => {
    if (editId) {
      setDb((prev) => ({
        ...prev,
        pengumuman: prev.pengumuman.map((p) => (p.id === editId ? { ...data, id: editId } : p)),
      }));
      showToast('Pengumuman diperbarui.', 'success');
    } else {
      setDb((prev) => ({
        ...prev,
        pengumuman: [{ ...data, id: generateId('pg') }, ...prev.pengumuman],
      }));
      showToast('Pengumuman berhasil diterbitkan.', 'success');
    }
  };

  const deletePengumuman = (id: string) => {
    setDb((prev) => ({ ...prev, pengumuman: prev.pengumuman.filter((p) => p.id !== id) }));
    showToast('Pengumuman dihapus.', 'info');
  };

  const saveKesehatan = (data: Omit<Kesehatan, 'id'>, editId?: string) => {
    if (editId) {
      setDb((prev) => ({
        ...prev,
        kesehatan: prev.kesehatan.map((k) => (k.id === editId ? { ...data, id: editId } : k)),
      }));
      showToast('Catatan kesehatan diperbarui.', 'success');
    } else {
      setDb((prev) => ({
        ...prev,
        kesehatan: [{ ...data, id: generateId('ks') }, ...prev.kesehatan],
      }));
      showToast('Catatan kesehatan berhasil disimpan.', 'success');
    }
  };

  const deleteKesehatan = (id: string) => {
    setDb((prev) => ({ ...prev, kesehatan: prev.kesehatan.filter((k) => k.id !== id) }));
    showToast('Catatan kesehatan dihapus.', 'info');
  };

  const saveTagihan = (data: Omit<Tagihan, 'id'>, editId?: string) => {
    if (editId) {
      setDb((prev) => ({
        ...prev,
        tagihan: prev.tagihan.map((t) => (t.id === editId ? { ...data, id: editId } : t)),
      }));
      showToast('Tagihan diperbarui.', 'success');
    } else {
      setDb((prev) => ({
        ...prev,
        tagihan: [{ ...data, id: generateId('tg') }, ...prev.tagihan],
      }));
      showToast('Tagihan berhasil dibuat.', 'success');
    }
  };

  const generateTagihanBulanan = (bulan: string, tahun: number, nominal: number, jatuhTempo: string): number => {
    let createdCount = 0;
    setDb((prev) => {
      const aktif = prev.penghuni.filter((p) => p.status !== 'Lulus');
      const newBills: Tagihan[] = [];
      aktif.forEach((p) => {
        const exists = prev.tagihan.some(
          (t) => t.penghuniId === p.id && t.bulan === bulan && t.tahun === tahun
        );
        if (!exists) {
          createdCount++;
          newBills.push({
            id: generateId('tg'),
            penghuniId: p.id,
            bulan,
            tahun,
            judul: `Iuran Asrama & Konsumsi ${bulan} ${tahun}`,
            nominal,
            jatuhTempo,
            status: 'Belum Lunas',
            tanggalBayar: null,
          });
        }
      });
      return { ...prev, tagihan: [...newBills, ...prev.tagihan] };
    });
    showToast(`Tagihan massal ${bulan} ${tahun} berhasil dibuat.`, 'success');
    return createdCount;
  };

  const tandaiTagihanLunas = (id: string, metodeBayar: string) => {
    setDb((prev) => ({
      ...prev,
      tagihan: prev.tagihan.map((t) =>
        t.id === id
          ? { ...t, status: 'Lunas', tanggalBayar: getTodayISO(), metodeBayar }
          : t
      ),
    }));
    showToast('Pembayaran tagihan berhasil dikonfirmasi Lunas.', 'success');
  };

  const deleteTagihan = (id: string) => {
    setDb((prev) => ({ ...prev, tagihan: prev.tagihan.filter((t) => t.id !== id) }));
    showToast('Data tagihan dihapus.', 'info');
  };

  const updatePengaturan = (data: PengaturanAsrama) => {
    setDb((prev) => ({ ...prev, pengaturan: data }));
    showToast('Pengaturan asrama berhasil disimpan.', 'success');
  };

  const savePengguna = (data: Omit<Pengguna, 'id'>, editId?: string) => {
    if (editId) {
      setDb((prev) => ({
        ...prev,
        pengguna: prev.pengguna.map((u) => (u.id === editId ? { ...data, id: editId } : u)),
      }));
      showToast('Data pengguna diperbarui.', 'success');
    } else {
      const newId = generateId('u');
      setDb((prev) => ({
        ...prev,
        pengguna: [...prev.pengguna, { ...data, id: newId }],
      }));
      showToast('Pengguna baru ditambahkan.', 'success');
    }
  };

  const deletePengguna = (id: string): ActionResult => {
    if (currentUser?.id === id) {
      const msg = 'Tidak dapat menghapus akun yang sedang aktif digunakan.';
      showToast(msg, 'error');
      return { ok: false, message: msg };
    }
    setDb((prev) => ({ ...prev, pengguna: prev.pengguna.filter((u) => u.id !== id) }));
    setUserAuthList((prev) => prev.filter((u) => u.userId !== id));
    if (authToken) {
      fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    showToast('Pengguna dihapus.', 'info');
    return { ok: true, message: 'OK' };
  };

  return (
    <DormContext.Provider
      value={{
        db,
        currentUser,
        activeRole,
        authStatus,
        authLoading,
        userAuthList,
        loginAs,
        loginWithCredentials,
        claimAdminSetup,
        logout,
        refreshAdminAuthConfig,
        switchDeploymentMode,
        saveUserCredentials,
        saveRoleDefinition,
        deleteRoleDefinition,
        changeOwnPassword,
        resetDemoData,
        toasts,
        showToast,
        dismissToast,
        confirmState,
        askConfirm,
        closeConfirm,
        getKamarOccupancy,
        getPenghuniPoin,
        savePenghuni,
        deletePenghuni,
        pindahKamar,
        saveGedung,
        deleteGedung,
        saveKamar,
        deleteKamar,
        saveAbsensiBatch,
        createPerizinan,
        updateStatusPerizinan,
        deletePerizinan,
        addTamu,
        catatTamuKeluar,
        deleteTamu,
        addPelanggaran,
        deletePelanggaran,
        addPembinaanPrestasi,
        deletePembinaanPrestasi,
        saveJenisPelanggaran,
        deleteJenisPelanggaran,
        saveInventaris,
        deleteInventaris,
        saveLaporanKerusakan,
        deleteLaporanKerusakan,
        saveKegiatan,
        deleteKegiatan,
        saveJadwalPiket,
        deleteJadwalPiket,
        savePengumuman,
        deletePengumuman,
        saveKesehatan,
        deleteKesehatan,
        saveTagihan,
        generateTagihanBulanan,
        tandaiTagihanLunas,
        deleteTagihan,
        updatePengaturan,
        savePengguna,
        deletePengguna,
      }}
    >
      {children}
    </DormContext.Provider>
  );
};

export function useDorm(): DormContextValue {
  const ctx = useContext(DormContext);
  if (!ctx) throw new Error('useDorm harus digunakan di dalam DormProvider');
  return ctx;
}
