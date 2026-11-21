export type PeranPengguna = 'Admin' | 'Pembina' | 'Keamanan' | 'Wali';

export type JenisKelamin = 'Putra' | 'Putri';

export type StatusPenghuni = 'Aktif' | 'Izin' | 'Pulang' | 'Lulus';

export type KondisiKamar = 'Baik' | 'Dalam Perbaikan';

export type SesiAbsensi = 'Subuh' | 'Maghrib' | 'Apel Malam';

export type StatusAbsensi = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export type JenisIzin = 'Pulang' | 'Keluar Sementara' | 'Sakit';

export type StatusIzin = 'Diajukan' | 'Disetujui' | 'Ditolak' | 'Keluar' | 'Kembali';

export type StatusIzinEfektif = StatusIzin | 'Terlambat';

export type KategoriPelanggaran = 'Ringan' | 'Sedang' | 'Berat';

export type KondisiInventaris = 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

export type PrioritasKerusakan = 'Rendah' | 'Sedang' | 'Tinggi';

export type StatusKerusakan = 'Dilaporkan' | 'Diproses' | 'Selesai';

export type StatusKesehatan = 'Istirahat di Asrama' | 'Dirawat di UKS' | 'Dirujuk / Pulang' | 'Sembuh';

export type StatusTagihan = 'Belum Lunas' | 'Lunas';

export type AppDeploymentMode = 'demo' | 'production';

export type RoleScopeMode = 'semua' | 'gedung_terkait' | 'anak_terkait';

export interface RoleCapabilities {
  canCreateEdit: boolean;
  canDelete: boolean;
  canApproveIzin: boolean;
  canManageGate: boolean;
  canManageBilling: boolean;
  canExportReport: boolean;
}

export interface RoleDefinition {
  id: string;
  nama: string;
  deskripsi: string;
  basePeran: PeranPengguna;
  isSystem: boolean;
  scopeMode: RoleScopeMode;
  allowedPages: ActivePage[];
  capabilities: RoleCapabilities;
}

export interface UserAuthSummary {
  userId: string;
  username: string;
  roleId: string;
  hasPassword: boolean;
  active: boolean;
  updatedAt?: string;
}

export interface AuthServerStatus {
  mode: AppDeploymentMode;
  adminClaimed: boolean;
  envAdminConfigured: boolean;
  roles: RoleDefinition[];
}

export interface Pengguna {
  id: string;
  nama: string;
  peran: PeranPengguna;
  roleId?: string;
  username?: string;
  jabatan: string;
  telepon: string;
  gedungIds?: string[]; // Khusus Pembina
  penghuniIds?: string[]; // Khusus Wali Santri
}

export interface Gedung {
  id: string;
  nama: string;
  jenis: JenisKelamin;
  pembinaId: string;
  deskripsi: string;
}

export interface Kamar {
  id: string;
  gedungId: string;
  nomor: string;
  lantai: number;
  kapasitas: number;
  fasilitas: string[];
  kondisi: KondisiKamar;
}

export interface Penghuni {
  id: string;
  nama: string;
  nis: string;
  jenisKelamin: JenisKelamin;
  kelas: string;
  tanggalMasuk: string; // YYYY-MM-DD
  kamarId: string;
  namaWali: string;
  kontakWali: string;
  kontakDarurat: string;
  status: StatusPenghuni;
  catatanKhusus: string;
}

export interface Penempatan {
  id: string;
  penghuniId: string;
  dariKamarId: string | null;
  keKamarId: string;
  tanggal: string; // YYYY-MM-DD
  alasan: string;
  dicatatOleh: string;
}

export interface Absensi {
  id: string;
  tanggal: string; // YYYY-MM-DD
  sesi: SesiAbsensi;
  penghuniId: string;
  kamarId: string;
  status: StatusAbsensi;
  keterangan: string;
  dicatatOleh: string;
}

export interface Perizinan {
  id: string;
  penghuniId: string;
  jenis: JenisIzin;
  tanggalKeluar: string; // ISO datetime-local string YYYY-MM-DDTHH:mm
  perkiraanKembali: string; // ISO datetime-local string YYYY-MM-DDTHH:mm
  tanggalKembaliAktual: string | null;
  alasan: string;
  penjemput: string;
  kontakPenjemput: string;
  status: StatusIzin;
  disetujuiOleh?: string;
  catatanPembina?: string;
}

export interface JenisPelanggaran {
  id: string;
  nama: string;
  kategori: KategoriPelanggaran;
  poinDefault: number;
  sanksiDefault: string;
}

export interface Pelanggaran {
  id: string;
  tanggal: string; // YYYY-MM-DD
  penghuniId: string;
  jenisPelanggaranId: string;
  kategori: KategoriPelanggaran;
  namaPelanggaran: string;
  poin: number;
  sanksi: string;
  pencatat: string;
  keterangan: string;
}

export interface PembinaanPrestasi {
  id: string;
  tanggal: string; // YYYY-MM-DD
  penghuniId: string;
  tipe: 'Pembinaan' | 'Prestasi';
  judul: string;
  deskripsi: string;
  poinPengurang: number;
  pencatat: string;
}

export interface Tamu {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nama: string;
  hubungan: string;
  penghuniId: string;
  jamMasuk: string; // HH:mm
  jamKeluar: string | null; // HH:mm
  keperluan: string;
  dicatatOleh: string;
}

export interface LogKeluarMasuk {
  id: string;
  penghuniId: string;
  perizinanId: string | null;
  tipe: 'Keluar' | 'Masuk';
  waktu: string; // YYYY-MM-DDTHH:mm
  petugas: string;
  catatan: string;
}

export interface Inventaris {
  id: string;
  kamarId: string;
  namaBarang: string;
  jumlah: number;
  kondisi: KondisiInventaris;
  keterangan: string;
}

export interface LaporanKerusakan {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kamarId: string;
  pelapor: string;
  deskripsi: string;
  prioritas: PrioritasKerusakan;
  status: StatusKerusakan;
  biayaPerbaikan: number;
  tanggalSelesai?: string;
}

export interface Kegiatan {
  id: string;
  waktuMulai: string; // HH:mm
  waktuSelesai: string; // HH:mm
  nama: string;
  kategori: 'Ibadah' | 'Akademik' | 'Kebersihan' | 'Istirahat';
  hari: string;
  penanggungJawab: string;
}

export interface JadwalPiket {
  id: string;
  kamarId: string;
  hari: string;
  areaTugas: string;
  koordinator: string;
}

export interface Pengumuman {
  id: string;
  tanggal: string; // YYYY-MM-DD
  judul: string;
  isi: string;
  pembuat: string;
  target: 'Semua' | 'Pembina' | 'Wali Santri';
  penting: boolean;
}

export interface Kesehatan {
  id: string;
  tanggal: string; // YYYY-MM-DD
  penghuniId: string;
  keluhan: string;
  tindakan: string;
  status: StatusKesehatan;
  dicatatOleh: string;
}

export interface Tagihan {
  id: string;
  penghuniId: string;
  bulan: string;
  tahun: number;
  judul: string;
  nominal: number;
  jatuhTempo: string; // YYYY-MM-DD
  status: StatusTagihan;
  tanggalBayar: string | null;
  metodeBayar?: string;
}

export interface PengaturanAsrama {
  namaLembaga: string;
  alamatLembaga: string;
  ambangPeringatanLisan: number;
  ambangSP1: number;
  ambangSP2: number;
  ambangSP3: number;
}

export interface DormDatabase {
  pengguna: Pengguna[];
  gedung: Gedung[];
  kamar: Kamar[];
  penghuni: Penghuni[];
  penempatan: Penempatan[];
  absensi: Absensi[];
  perizinan: Perizinan[];
  jenisPelanggaran: JenisPelanggaran[];
  pelanggaran: Pelanggaran[];
  pembinaanPrestasi: PembinaanPrestasi[];
  tamu: Tamu[];
  logKeluarMasuk: LogKeluarMasuk[];
  inventaris: Inventaris[];
  laporanKerusakan: LaporanKerusakan[];
  kegiatan: Kegiatan[];
  jadwalPiket: JadwalPiket[];
  pengumuman: Pengumuman[];
  kesehatan: Kesehatan[];
  tagihan: Tagihan[];
  pengaturan: PengaturanAsrama;
}

export type ActivePage =
  | 'dashboard'
  | 'penghuni'
  | 'gedung-kamar'
  | 'absensi'
  | 'perizinan'
  | 'pelanggaran'
  | 'tamu-log'
  | 'inventaris'
  | 'kegiatan'
  | 'kesehatan'
  | 'tagihan'
  | 'laporan'
  | 'pengaturan';
