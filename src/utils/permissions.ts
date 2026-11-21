import {
  ActivePage,
  PeranPengguna,
  Pengguna,
  RoleCapabilities,
  RoleDefinition,
} from '../types/dorm';

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'role-admin',
    nama: 'Administrator Asrama',
    deskripsi: 'Akses penuh seluruh modul master, pengaturan deployment production, manajemen role, pengguna, dan laporan.',
    basePeran: 'Admin',
    isSystem: true,
    scopeMode: 'semua',
    allowedPages: [
      'dashboard',
      'penghuni',
      'gedung-kamar',
      'absensi',
      'perizinan',
      'pelanggaran',
      'tamu-log',
      'inventaris',
      'kegiatan',
      'kesehatan',
      'tagihan',
      'laporan',
      'pengaturan',
    ],
    capabilities: {
      canCreateEdit: true,
      canDelete: true,
      canApproveIzin: true,
      canManageGate: true,
      canManageBilling: true,
      canExportReport: true,
    },
  },
  {
    id: 'role-pembina',
    nama: 'Pembina / Musyrif',
    deskripsi: 'Mengelola santri asrama, absensi harian, persetujuan izin, pelanggaran, pembinaan, dan inventaris kamar.',
    basePeran: 'Pembina',
    isSystem: true,
    scopeMode: 'gedung_terkait',
    allowedPages: [
      'dashboard',
      'penghuni',
      'gedung-kamar',
      'absensi',
      'perizinan',
      'pelanggaran',
      'tamu-log',
      'inventaris',
      'kegiatan',
      'kesehatan',
      'tagihan',
      'laporan',
    ],
    capabilities: {
      canCreateEdit: true,
      canDelete: true,
      canApproveIzin: true,
      canManageGate: true,
      canManageBilling: true,
      canExportReport: true,
    },
  },
  {
    id: 'role-keamanan',
    nama: 'Petugas Keamanan / Piket',
    deskripsi: 'Mencatat keluar-masuk santri berdasarkan izin aktif, buku tamu penjenguk, dan lookup kontak darurat.',
    basePeran: 'Keamanan',
    isSystem: true,
    scopeMode: 'semua',
    allowedPages: ['dashboard', 'tamu-log', 'perizinan', 'penghuni', 'kegiatan'],
    capabilities: {
      canCreateEdit: false,
      canDelete: false,
      canApproveIzin: false,
      canManageGate: true,
      canManageBilling: false,
      canExportReport: false,
    },
  },
  {
    id: 'role-wali',
    nama: 'Wali Santri',
    deskripsi: 'Akses baca-saja (read-only) untuk memantau kamar, absensi, perizinan, poin pembinaan, dan tagihan anak.',
    basePeran: 'Wali',
    isSystem: true,
    scopeMode: 'anak_terkait',
    allowedPages: [
      'dashboard',
      'penghuni',
      'absensi',
      'perizinan',
      'pelanggaran',
      'kegiatan',
      'kesehatan',
      'tagihan',
    ],
    capabilities: {
      canCreateEdit: false,
      canDelete: false,
      canApproveIzin: false,
      canManageGate: false,
      canManageBilling: false,
      canExportReport: false,
    },
  },
];

export const ALL_PAGE_META: { id: ActivePage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'penghuni', label: 'Data Penghuni' },
  { id: 'gedung-kamar', label: 'Gedung & Kamar' },
  { id: 'absensi', label: 'Absensi Asrama' },
  { id: 'perizinan', label: 'Perizinan' },
  { id: 'pelanggaran', label: 'Pelanggaran & Poin' },
  { id: 'tamu-log', label: 'Tamu & Keluar-Masuk' },
  { id: 'kegiatan', label: 'Kegiatan & Pengumuman' },
  { id: 'inventaris', label: 'Inventaris & Perawatan' },
  { id: 'kesehatan', label: 'Kesehatan Ringkas' },
  { id: 'tagihan', label: 'Tagihan Asrama' },
  { id: 'laporan', label: 'Laporan & Ekspor' },
  { id: 'pengaturan', label: 'Pengaturan & Role' },
];

export function resolveUserRole(
  user: Pengguna | null,
  roles: RoleDefinition[] = DEFAULT_ROLES
): RoleDefinition {
  if (!user) return DEFAULT_ROLES[3];
  const byId = user.roleId ? roles.find((r) => r.id === user.roleId) : undefined;
  if (byId) return byId;
  const byBase = roles.find((r) => r.basePeran === user.peran);
  if (byBase) return byBase;
  return DEFAULT_ROLES.find((r) => r.basePeran === user.peran) ?? DEFAULT_ROLES[3];
}

export function canAccessPage(
  peranOrUser: PeranPengguna | Pengguna,
  page: ActivePage,
  roles: RoleDefinition[] = DEFAULT_ROLES
): boolean {
  if (typeof peranOrUser === 'string') {
    const role = roles.find((r) => r.basePeran === peranOrUser) ?? DEFAULT_ROLES[3];
    return role.allowedPages.includes(page);
  }
  const role = resolveUserRole(peranOrUser, roles);
  return role.allowedPages.includes(page);
}

export function getRoleCapabilities(
  user: Pengguna | null,
  roles: RoleDefinition[] = DEFAULT_ROLES
): RoleCapabilities {
  return resolveUserRole(user, roles).capabilities;
}

export function isReadOnlyRole(peran: PeranPengguna): boolean {
  return peran === 'Wali';
}
