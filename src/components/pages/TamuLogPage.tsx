import React, { useMemo, useState } from 'react';
import {
  DoorClosed,
  DoorOpen,
  LogOut,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import {
  formatTanggal,
  formatTanggalWaktu,
  getStatusIzinEfektif,
  getTodayISO,
} from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';

export const TamuLogPage: React.FC = () => {
  const {
    db,
    currentUser,
    activeRole,
    updateStatusPerizinan,
    addTamu,
    catatTamuKeluar,
    deleteTamu,
    askConfirm,
  } = useDorm();

  const canManageGate =
    activeRole.capabilities.canManageGate || activeRole.capabilities.canCreateEdit;
  const canDelete = activeRole.capabilities.canDelete;

  const [tab, setTab] = useState<'gerbang' | 'tamu'>('gerbang');
  const [search, setSearch] = useState('');

  // Modal Tambah Tamu
  const [tamuModalOpen, setTamuModalOpen] = useState(false);
  const [tNama, setTNama] = useState('');
  const [tHubungan, setTHubungan] = useState('Orang Tua / Wali');
  const [tPenghuniId, setTPenghuniId] = useState('');
  const [tJamMasuk, setTJamMasuk] = useState('');
  const [tKeperluan, setTKeperluan] = useState('');

  const izinSiapKeluar = useMemo(
    () => db.perizinan.filter((iz) => iz.status === 'Disetujui'),
    [db.perizinan]
  );

  const izinSedangDiLuar = useMemo(
    () =>
      db.perizinan.filter((iz) => {
        const ef = getStatusIzinEfektif(iz);
        return ef === 'Keluar' || ef === 'Terlambat';
      }),
    [db.perizinan]
  );

  const filteredLog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.logKeluarMasuk.filter((lk) => {
      const s = db.penghuni.find((p) => p.id === lk.penghuniId);
      if (!q) return true;
      return (
        s?.nama.toLowerCase().includes(q) ||
        lk.catatan.toLowerCase().includes(q) ||
        lk.petugas.toLowerCase().includes(q)
      );
    });
  }, [db.logKeluarMasuk, db.penghuni, search]);

  const filteredTamu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.tamu.filter((t) => {
      const s = db.penghuni.find((p) => p.id === t.penghuniId);
      if (!q) return true;
      return (
        t.nama.toLowerCase().includes(q) ||
        s?.nama.toLowerCase().includes(q) ||
        t.keperluan.toLowerCase().includes(q)
      );
    });
  }, [db.tamu, db.penghuni, search]);

  const openTamuModal = () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setTNama('');
    setTHubungan('Orang Tua / Wali');
    setTPenghuniId(db.penghuni.find((p) => p.status !== 'Lulus')?.id ?? '');
    setTJamMasuk(hhmm);
    setTKeperluan('');
    setTamuModalOpen(true);
  };

  const handleSaveTamu = (e: React.FormEvent) => {
    e.preventDefault();
    addTamu({
      tanggal: getTodayISO(),
      nama: tNama.trim(),
      hubungan: tHubungan,
      penghuniId: tPenghuniId,
      jamMasuk: tJamMasuk,
      jamKeluar: null,
      keperluan: tKeperluan.trim(),
      dicatatOleh: currentUser?.nama ?? 'Petugas Piket',
    });
    setTamuModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('gerbang')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'gerbang' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Keluar-Masuk Santri
          </button>
          <button
            type="button"
            onClick={() => setTab('tamu')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'tamu' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Buku Tamu ({db.tamu.filter((t) => !t.jamKeluar).length} Aktif)
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'gerbang' ? 'Cari santri / petugas...' : 'Cari nama tamu / santri...'}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 min-h-[38px]"
            />
          </div>
          {canManageGate && (
            <button
              type="button"
              onClick={openTamuModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Tamu Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: KELUAR-MASUK SANTRI */}
      {tab === 'gerbang' && (
        <div className="space-y-5">
          {/* Quick Gate Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Siap Keluar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <DoorOpen className="w-4 h-4 text-teal-700" />
                  <span>Izin Disetujui — Siap Keluar Gerbang</span>
                </div>
                <span className="text-xs font-mono-num text-slate-500">
                  {izinSiapKeluar.length} santri
                </span>
              </div>
              {izinSiapKeluar.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  Tidak ada antrean santri dengan izin disetujui yang menunggu keluar.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {izinSiapKeluar.map((iz) => {
                    const s = db.penghuni.find((p) => p.id === iz.penghuniId);
                    return (
                      <div
                        key={iz.id}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900 truncate">
                            {s?.nama ?? '-'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {iz.jenis} · Penjemput: {iz.penjemput}
                          </div>
                        </div>
                        {canManageGate && (
                          <button
                            type="button"
                            onClick={() => updateStatusPerizinan(iz.id, 'Keluar')}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 min-h-[34px]"
                          >
                            Catat Keluar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sedang Di Luar / Terlambat */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <DoorClosed className="w-4 h-4 text-amber-600" />
                  <span>Sedang Di Luar — Catat Kepulangan</span>
                </div>
                <span className="text-xs font-mono-num text-slate-500">
                  {izinSedangDiLuar.length} santri
                </span>
              </div>
              {izinSedangDiLuar.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  Semua santri berada di dalam asrama.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {izinSedangDiLuar.map((iz) => {
                    const s = db.penghuni.find((p) => p.id === iz.penghuniId);
                    const ef = getStatusIzinEfektif(iz);
                    return (
                      <div
                        key={iz.id}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 truncate">
                              {s?.nama ?? '-'}
                            </span>
                            <StatusTag
                              label={ef}
                              tone={ef === 'Terlambat' ? 'red' : 'amber'}
                            />
                          </div>
                          <div className="text-xs text-slate-500 font-mono-num">
                            Batas kembali: {formatTanggalWaktu(iz.perkiraanKembali)}
                          </div>
                        </div>
                        {canManageGate && (
                          <button
                            type="button"
                            onClick={() => updateStatusPerizinan(iz.id, 'Kembali')}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg whitespace-nowrap shrink-0 min-h-[34px]"
                          >
                            Catat Kembali
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Log Keluar-Masuk */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-900">
              Riwayat Log Gerbang Keluar-Masuk Santri
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Waktu</th>
                    <th className="py-2.5 px-4 font-medium">Santri</th>
                    <th className="py-2.5 px-4 font-medium">Arah</th>
                    <th className="py-2.5 px-4 font-medium">Catatan</th>
                    <th className="py-2.5 px-4 font-medium">Petugas Piket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLog.map((lk) => {
                    const s = db.penghuni.find((p) => p.id === lk.penghuniId);
                    return (
                      <tr key={lk.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                          {formatTanggalWaktu(lk.waktu)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {s?.nama ?? '-'}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <StatusTag
                            label={lk.tipe}
                            tone={lk.tipe === 'Masuk' ? 'emerald' : 'amber'}
                          />
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">{lk.catatan}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">{lk.petugas}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUKU TAMU */}
      {tab === 'tamu' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-medium">Tanggal</th>
                  <th className="py-3 px-4 font-medium">Nama Tamu & Hubungan</th>
                  <th className="py-3 px-4 font-medium">Santri Dikunjungi</th>
                  <th className="py-3 px-4 font-medium">Keperluan</th>
                  <th className="py-3 px-4 font-medium">Jam Masuk / Keluar</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTamu.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                      Belum ada catatan kunjungan tamu.
                    </td>
                  </tr>
                ) : (
                  filteredTamu.map((t) => {
                    const s = db.penghuni.find((p) => p.id === t.penghuniId);
                    const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                          {formatTanggal(t.tanggal)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{t.nama}</div>
                          <div className="text-xs text-slate-500">{t.hubungan}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{s?.nama ?? '-'}</div>
                          <div className="text-xs text-slate-500">Kamar {k?.nomor ?? '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                          {t.keperluan}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs font-mono-num">
                          <div>Masuk: {t.jamMasuk}</div>
                          <div className="mt-0.5">
                            {t.jamKeluar ? (
                              <span className="text-emerald-700">Keluar: {t.jamKeluar}</span>
                            ) : (
                              <StatusTag label="Masih Berkunjung" tone="blue" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canManageGate && !t.jamKeluar && (
                              <button
                                type="button"
                                onClick={() => catatTamuKeluar(t.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Catat Keluar</span>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  askConfirm({
                                    title: 'Hapus Catatan Tamu',
                                    message: `Hapus catatan tamu "${t.nama}"?`,
                                    onConfirm: () => deleteTamu(t.id),
                                  })
                                }
                                className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah Tamu */}
      <Modal
        open={tamuModalOpen}
        onClose={() => setTamuModalOpen(false)}
        title="Catat Kunjungan Tamu / Wali"
        size="md"
      >
        <form onSubmit={handleSaveTamu} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Tamu *</label>
              <input
                required
                type="text"
                value={tNama}
                onChange={(e) => setTNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Hubungan *</label>
              <select
                value={tHubungan}
                onChange={(e) => setTHubungan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Orang Tua / Wali">Orang Tua / Wali</option>
                <option value="Saudara Kandung">Saudara Kandung</option>
                <option value="Keluarga">Keluarga Lainnya</option>
                <option value="Tamu Sekolah / Dinas">Tamu Sekolah / Dinas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Santri yang Dikunjungi *
              </label>
              <select
                required
                value={tPenghuniId}
                onChange={(e) => setTPenghuniId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {db.penghuni
                  .filter((p) => p.status !== 'Lulus')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.kelas})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jam Masuk *</label>
              <input
                required
                type="time"
                value={tJamMasuk}
                onChange={(e) => setTJamMasuk(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Keperluan *</label>
              <input
                required
                type="text"
                value={tKeperluan}
                onChange={(e) => setTKeperluan(e.target.value)}
                placeholder="Misal: Menjenguk & mengantar perlengkapan"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setTamuModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              <UserCheck className="w-4 h-4" />
              <span>Simpan Tamu</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
