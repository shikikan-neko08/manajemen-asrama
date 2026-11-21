import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarCheck,
  CreditCard,
  DoorOpen,
  Megaphone,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { ActivePage } from '../../types/dorm';
import {
  addDaysISO,
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
  getLevelPeringatan,
  getStatusIzinEfektif,
  getTodayISO,
} from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { PenghuniProfileModal } from '../PenghuniProfileModal';

interface DashboardPageProps {
  onNavigate: (page: ActivePage) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { db, currentUser, activeRole, getKamarOccupancy, getPenghuniPoin } = useDorm();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const today = getTodayISO();
  const sevenDaysAgo = addDaysISO(today, -6);

  // If logged in with Wali/anak_terkait scope, render specialized read-only Anak view
  if (activeRole.scopeMode === 'anak_terkait' || activeRole.basePeran === 'Wali') {
    const anakList = db.penghuni.filter((p) => currentUser?.penghuniIds?.includes(p.id));
    const pengumumanWali = db.pengumuman
      .filter((pg) => pg.target === 'Semua' || pg.target === 'Wali Santri')
      .slice(0, 4);

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Assalamu’alaikum, {currentUser?.nama}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Ringkasan informasi asrama, kehadiran, perizinan, pembinaan, dan tagihan putra/putri Anda (tampilan khusus Wali Santri).
          </p>
        </div>

        {anakList.map((anak) => {
          const kamar = db.kamar.find((k) => k.id === anak.kamarId);
          const gedung = kamar ? db.gedung.find((g) => g.id === kamar.gedungId) : undefined;
          const pembina = gedung ? db.pengguna.find((u) => u.id === gedung.pembinaId) : undefined;
          const absAnak = db.absensi.filter((a) => a.penghuniId === anak.id);
          const absHadir = absAnak.filter((a) => a.status === 'Hadir').length;
          const absPersen = absAnak.length > 0 ? Math.round((absHadir / absAnak.length) * 100) : 100;
          const poin = getPenghuniPoin(anak.id);
          const level = getLevelPeringatan(poin.poinBersih, db.pengaturan);
          const tagihanBelum = db.tagihan.filter(
            (t) => t.penghuniId === anak.id && t.status === 'Belum Lunas'
          );
          const izinAktif = db.perizinan.filter((iz) => iz.penghuniId === anak.id).slice(0, 3);

          return (
            <div key={anak.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900">{anak.nama}</h3>
                    <StatusTag
                      label={anak.status}
                      tone={anak.status === 'Aktif' ? 'emerald' : anak.status === 'Izin' ? 'blue' : 'amber'}
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    NIS {anak.nis} · Kelas {anak.kelas} · Kamar {kamar?.nomor ?? '-'} ({gedung?.nama ?? '-'})
                  </p>
                  {pembina && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pembina/Musyrif: {pembina.nama} ({pembina.telepon})
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProfileId(anak.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  <span>Lihat Profil Lengkap</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70">
                  <div className="text-xs text-slate-500">Kamar & Lantai</div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {kamar ? `${kamar.nomor} (Lt. ${kamar.lantai})` : '-'}
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70">
                  <div className="text-xs text-slate-500">Kehadiran Asrama</div>
                  <div className="text-base font-bold text-slate-900 font-mono-num mt-1">
                    {absPersen}% ({absHadir}/{absAnak.length} sesi)
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70">
                  <div className="text-xs text-slate-500">Poin Kedisiplinan</div>
                  <div className="text-base font-bold text-slate-900 font-mono-num mt-1">
                    {poin.poinBersih} · {level.level}
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70">
                  <div className="text-xs text-slate-500">Tagihan Belum Lunas</div>
                  <div className="text-base font-bold text-slate-900 font-mono-num mt-1">
                    {tagihanBelum.length === 0
                      ? 'Lunas Semua'
                      : formatRupiah(tagihanBelum.reduce((a, b) => a + b.nominal, 0))}
                  </div>
                </div>
              </div>

              {izinAktif.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Perizinan Terbaru</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {izinAktif.map((iz) => {
                      const efektif = getStatusIzinEfektif(iz);
                      return (
                        <div key={iz.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-semibold text-slate-900">{iz.jenis}</span>
                            <span className="text-slate-500"> · {iz.alasan}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-mono-num">
                              {formatTanggalWaktu(iz.tanggalKeluar)}
                            </span>
                            <StatusTag
                              label={efektif}
                              tone={
                                efektif === 'Kembali'
                                  ? 'emerald'
                                  : efektif === 'Terlambat' || efektif === 'Ditolak'
                                  ? 'red'
                                  : 'blue'
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Pengumuman untuk Wali */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-teal-700" />
              <h3 className="text-base font-semibold text-slate-900">Pengumuman Asrama</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('kegiatan')}
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
            >
              Lihat Jadwal & Pengumuman
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {pengumumanWali.map((pg) => (
              <div key={pg.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">{pg.judul}</h4>
                  <span className="text-xs text-slate-500 font-mono-num shrink-0">
                    {formatTanggal(pg.tanggal)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{pg.isi}</p>
              </div>
            ))}
          </div>
        </div>

        <PenghuniProfileModal
          penghuniId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      </div>
    );
  }

  // Standard Staff Dashboard (Admin / Pembina / Keamanan)
  const stats = useMemo(() => {
    const penghuniAktif = db.penghuni.filter((p) => p.status !== 'Lulus');
    const totalKapasitas = db.kamar
      .filter((k) => k.kondisi !== 'Dalam Perbaikan')
      .reduce((acc, k) => acc + k.kapasitas, 0);
    const tingkatHunian =
      totalKapasitas > 0 ? Math.round((penghuniAktif.length / totalKapasitas) * 100) : 0;

    let kamarTerisi = 0;
    let kamarKosong = 0;
    let kamarPerbaikan = 0;
    db.kamar.forEach((k) => {
      if (k.kondisi === 'Dalam Perbaikan') {
        kamarPerbaikan++;
      } else {
        const occ = getKamarOccupancy(k.id);
        if (occ === 0) kamarKosong++;
        else kamarTerisi++;
      }
    });

    const izinAktifList = db.perizinan.filter((iz) => {
      const efektif = getStatusIzinEfektif(iz);
      return efektif === 'Keluar' || efektif === 'Terlambat';
    });

    const izinTerlambat = db.perizinan.filter(
      (iz) => getStatusIzinEfektif(iz) === 'Terlambat'
    );

    const izinMenunggu = db.perizinan.filter((iz) => iz.status === 'Diajukan');

    const pelanggaranMingguIni = db.pelanggaran.filter(
      (pl) => pl.tanggal >= sevenDaysAgo && pl.tanggal <= today
    );

    const kamarRusak = db.laporanKerusakan.filter((l) => l.status !== 'Selesai');
    const tagihanJatuhTempo = db.tagihan.filter(
      (t) => t.status === 'Belum Lunas' && t.jatuhTempo <= today
    );
    const tamuAktif = db.tamu.filter((t) => t.jamKeluar === null);

    return {
      totalPenghuni: penghuniAktif.length,
      totalKapasitas,
      tingkatHunian,
      jumlahGedung: db.gedung.length,
      kamarTerisi,
      kamarKosong,
      kamarPerbaikan,
      izinSedangKeluar: izinAktifList.length,
      izinTerlambat,
      izinMenunggu,
      pelanggaranMingguIni,
      kamarRusak,
      tagihanJatuhTempo,
      tamuAktif,
    };
  }, [db, getKamarOccupancy, sevenDaysAgo, today]);

  // 7-day trend data for Attendance & Violations
  const trend7Hari = useMemo(() => {
    const days: {
      date: string;
      label: string;
      hadirPct: number;
      alpaCount: number;
      pelanggaranCount: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = addDaysISO(today, -i);
      const dayAbs = db.absensi.filter((a) => a.tanggal === d);
      const hadirCount = dayAbs.filter((a) => a.status === 'Hadir' || a.status === 'Izin').length;
      const alpaCount = dayAbs.filter((a) => a.status === 'Alpa').length;
      const hadirPct = dayAbs.length > 0 ? Math.round((hadirCount / dayAbs.length) * 100) : 0;
      const pelanggaranCount = db.pelanggaran.filter((p) => p.tanggal === d).length;

      const dt = new Date(d);
      const label = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(dt);
      days.push({ date: d, label, hadirPct, alpaCount, pelanggaranCount });
    }
    return days;
  }, [db.absensi, db.pelanggaran, today]);

  // Occupancy per building
  const hunianGedung = useMemo(() => {
    return db.gedung.map((g) => {
      const rooms = db.kamar.filter((k) => k.gedungId === g.id);
      const kapasitas = rooms
        .filter((k) => k.kondisi !== 'Dalam Perbaikan')
        .reduce((a, b) => a + b.kapasitas, 0);
      const terisi = rooms.reduce((a, b) => a + getKamarOccupancy(b.id), 0);
      const persen = kapasitas > 0 ? Math.round((terisi / kapasitas) * 100) : 0;
      return { gedung: g, kapasitas, terisi, persen, totalKamar: rooms.length };
    });
  }, [db.gedung, db.kamar, getKamarOccupancy]);

  const maxPelanggaranBar = Math.max(2, ...trend7Hari.map((d) => d.pelanggaranCount));

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigate('penghuni')}
          className="text-left bg-white border border-slate-200 hover:border-teal-600 rounded-xl p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Penghuni</span>
            <Users className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-num mt-2">
            {stats.totalPenghuni}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Dari kapasitas {stats.totalKapasitas} tempat
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('gedung-kamar')}
          className="text-left bg-white border border-slate-200 hover:border-teal-600 rounded-xl p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gedung & Kamar</span>
            <Building2 className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-num mt-2">
            {stats.jumlahGedung} <span className="text-sm font-normal text-slate-500">Gedung</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {stats.kamarTerisi} terisi · {stats.kamarKosong} kosong · {stats.kamarPerbaikan} perbaikan
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('gedung-kamar')}
          className="text-left bg-white border border-slate-200 hover:border-teal-600 rounded-xl p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tingkat Hunian</span>
            <BedDouble className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-num mt-2">
            {stats.tingkatHunian}%
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-teal-700 rounded-full"
              style={{ width: `${Math.min(100, stats.tingkatHunian)}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('perizinan')}
          className="text-left bg-white border border-slate-200 hover:border-teal-600 rounded-xl p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Sedang Izin Keluar</span>
            <DoorOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-num mt-2">
            {stats.izinSedangKeluar}
          </div>
          <div className="text-xs mt-1">
            {stats.izinTerlambat.length > 0 ? (
              <span className="text-red-600 font-medium">
                {stats.izinTerlambat.length} terlambat kembali
              </span>
            ) : (
              <span className="text-slate-500">Semua sesuai jadwal</span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('pelanggaran')}
          className="col-span-2 lg:col-span-1 text-left bg-white border border-slate-200 hover:border-teal-600 rounded-xl p-4 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pelanggaran (7 Hari)</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono-num mt-2">
            {stats.pelanggaranMingguIni.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total poin tercatat: {stats.pelanggaranMingguIni.reduce((a, b) => a + b.poin, 0)} poin
          </div>
        </button>
      </div>

      {/* Main Content Split: Charts + Alerts/Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 columns: Charts */}
        <div className="lg:col-span-7 space-y-5">
          {/* Grafik Tren Absensi & Pelanggaran 7 Hari */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Tren Absensi & Pelanggaran (7 Hari Terakhir)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Persentase kehadiran gabungan sesi harian vs jumlah pelanggaran tercatat
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-teal-700 inline-block" />
                  Kehadiran (%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  Pelanggaran
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4 border-b border-slate-200 pb-2">
              {trend7Hari.map((item) => (
                <div key={item.date} className="flex flex-col items-center justify-end h-full gap-1.5">
                  <div className="text-[11px] font-mono-num text-slate-600">
                    {item.hadirPct > 0 ? `${item.hadirPct}%` : '-'}
                  </div>
                  <div className="w-full flex items-end justify-center gap-1 flex-1 max-h-28">
                    <div
                      className="w-3.5 sm:w-5 bg-teal-700 rounded-t transition-all"
                      style={{ height: `${Math.max(4, item.hadirPct)}%` }}
                      title={`${item.label}: Kehadiran ${item.hadirPct}%`}
                    />
                    <div
                      className="w-2.5 sm:w-3.5 bg-amber-500 rounded-t transition-all"
                      style={{
                        height:
                          item.pelanggaranCount > 0
                            ? `${Math.max(12, Math.round((item.pelanggaranCount / maxPelanggaranBar) * 100))}%`
                            : '3px',
                        opacity: item.pelanggaranCount > 0 ? 1 : 0.25,
                      }}
                      title={`${item.label}: ${item.pelanggaranCount} pelanggaran`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 pt-2 text-center">
              {trend7Hari.map((item) => (
                <div key={item.date} className="text-[11px] text-slate-500 truncate">
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Grafik Hunian per Gedung */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Okupansi Hunian per Gedung
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbandingan kapasitas aktif dan jumlah santri terdaftar
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('gedung-kamar')}
                className="text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap"
              >
                Buka Denah Kamar →
              </button>
            </div>

            <div className="space-y-4">
              {hunianGedung.map(({ gedung, kapasitas, terisi, persen, totalKamar }) => (
                <div key={gedung.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-900 truncate">{gedung.nama}</span>
                      <span className="text-xs text-slate-500">
                        · {gedung.jenis} · {totalKamar} kamar
                      </span>
                    </div>
                    <span className="font-mono-num text-xs sm:text-sm font-semibold text-slate-800 shrink-0">
                      {terisi}/{kapasitas} ({persen}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        persen >= 90 ? 'bg-amber-600' : 'bg-teal-700'
                      }`}
                      style={{ width: `${Math.min(100, persen)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 columns: Daftar Tugas & Peringatan */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  Daftar Tugas & Peringatan
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono-num">
                {stats.izinTerlambat.length +
                  stats.izinMenunggu.length +
                  stats.kamarRusak.length +
                  stats.tagihanJatuhTempo.length}{' '}
                perlu perhatian
              </span>
            </div>

            <div className="space-y-3">
              {/* 1. Izin Terlambat */}
              {stats.izinTerlambat.map((iz) => {
                const s = db.penghuni.find((p) => p.id === iz.penghuniId);
                return (
                  <div
                    key={iz.id}
                    className="p-3 rounded-lg border border-red-200 bg-red-50/50 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusTag label="Izin Terlambat" tone="red" />
                        <button
                          type="button"
                          onClick={() => s && setSelectedProfileId(s.id)}
                          className="text-sm font-semibold text-slate-900 hover:text-teal-700 text-left truncate"
                        >
                          {s?.nama ?? 'Santri'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Batas kembali: {formatTanggalWaktu(iz.perkiraanKembali)} · {iz.jenis}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('perizinan')}
                      className="text-xs font-medium text-red-700 hover:text-red-900 whitespace-nowrap shrink-0 mt-0.5"
                    >
                      Tindak →
                    </button>
                  </div>
                );
              })}

              {/* 2. Pengajuan Izin Menunggu */}
              {stats.izinMenunggu.length > 0 && (
                <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/50 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusTag label="Menunggu Persetujuan" tone="blue" />
                      <span className="text-xs font-mono-num font-semibold text-slate-800">
                        {stats.izinMenunggu.length} pengajuan
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Ada pengajuan izin santri yang menunggu persetujuan pembina.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('perizinan')}
                    className="text-xs font-medium text-sky-800 hover:underline whitespace-nowrap shrink-0"
                  >
                    Tinjau →
                  </button>
                </div>
              )}

              {/* 3. Kamar Rusak / Laporan Kerusakan Aktif */}
              {stats.kamarRusak.map((lk) => {
                const km = db.kamar.find((k) => k.id === lk.kamarId);
                return (
                  <div
                    key={lk.id}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="text-sm font-semibold text-slate-900">
                          Kamar {km?.nomor ?? '-'} · {lk.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{lk.deskripsi}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('inventaris')}
                      className="text-xs font-medium text-amber-800 hover:underline whitespace-nowrap shrink-0"
                    >
                      Lihat →
                    </button>
                  </div>
                );
              })}

              {/* 4. Tagihan Jatuh Tempo */}
              {stats.tagihanJatuhTempo.length > 0 && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-slate-700" />
                      <span className="text-sm font-semibold text-slate-900">
                        {stats.tagihanJatuhTempo.length} Tagihan Jatuh Tempo
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Total belum lunas:{' '}
                      <span className="font-mono-num font-semibold">
                        {formatRupiah(
                          stats.tagihanJatuhTempo.reduce((a, b) => a + b.nominal, 0)
                        )}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('tagihan')}
                    className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    Cek →
                  </button>
                </div>
              )}

              {/* 5. Tamu Sedang Berkunjung */}
              {stats.tamuAktif.length > 0 && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {stats.tamuAktif.length} Tamu Masih di Area Asrama
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Jangan lupa mencatat jam keluar tamu saat meninggalkan gerbang.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('tamu-log')}
                    className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    Buku Tamu →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pintasan Cepat Pembina & Petugas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Aksi Cepat Harian</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {activeRole.allowedPages.includes('absensi') && activeRole.capabilities.canCreateEdit && (
                <button
                  type="button"
                  onClick={() => onNavigate('absensi')}
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left text-xs font-medium text-slate-800 transition-colors"
                >
                  <CalendarCheck className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Input Absensi Sesi</span>
                </button>
              )}
              {activeRole.allowedPages.includes('tamu-log') && (
                <button
                  type="button"
                  onClick={() => onNavigate('tamu-log')}
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left text-xs font-medium text-slate-800 transition-colors"
                >
                  <DoorOpen className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Log Keluar-Masuk</span>
                </button>
              )}
              {activeRole.allowedPages.includes('perizinan') && (
                <button
                  type="button"
                  onClick={() => onNavigate('perizinan')}
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left text-xs font-medium text-slate-800 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Kelola Perizinan</span>
                </button>
              )}
              {activeRole.allowedPages.includes('pelanggaran') && activeRole.capabilities.canCreateEdit && (
                <button
                  type="button"
                  onClick={() => onNavigate('pelanggaran')}
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 text-left text-xs font-medium text-slate-800 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Catat Pelanggaran</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PenghuniProfileModal
        penghuniId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </div>
  );
};
