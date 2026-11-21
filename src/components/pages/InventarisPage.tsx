import React, { useMemo, useState } from 'react';
import { Edit3, Package, Plus, Search, Trash2, Wrench } from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import {
  Inventaris,
  KondisiInventaris,
  LaporanKerusakan,
  PrioritasKerusakan,
  StatusKerusakan,
} from '../../types/dorm';
import { formatRupiah, formatTanggal, getTodayISO } from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';

export const InventarisPage: React.FC = () => {
  const {
    db,
    currentUser,
    activeRole,
    saveInventaris,
    deleteInventaris,
    saveLaporanKerusakan,
    deleteLaporanKerusakan,
    askConfirm,
  } = useDorm();

  const canEdit = activeRole.capabilities.canCreateEdit;
  const canDelete = activeRole.capabilities.canDelete;

  const [tab, setTab] = useState<'inventaris' | 'kerusakan'>('inventaris');
  const [search, setSearch] = useState('');
  const [filterGedung, setFilterGedung] = useState('Semua');
  const [filterKamar, setFilterKamar] = useState('Semua');

  // Inventaris Modal
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [editInv, setEditInv] = useState<Inventaris | null>(null);
  const [invKamarId, setInvKamarId] = useState('');
  const [invNama, setInvNama] = useState('');
  const [invJumlah, setInvJumlah] = useState(1);
  const [invKondisi, setInvKondisi] = useState<KondisiInventaris>('Baik');
  const [invKet, setInvKet] = useState('');

  // Kerusakan Modal
  const [lkModalOpen, setLkModalOpen] = useState(false);
  const [editLk, setEditLk] = useState<LaporanKerusakan | null>(null);
  const [lkTanggal, setLkTanggal] = useState(getTodayISO());
  const [lkKamarId, setLkKamarId] = useState('');
  const [lkPelapor, setLkPelapor] = useState('');
  const [lkDeskripsi, setLkDeskripsi] = useState('');
  const [lkPrioritas, setLkPrioritas] = useState<PrioritasKerusakan>('Sedang');
  const [lkStatus, setLkStatus] = useState<StatusKerusakan>('Dilaporkan');
  const [lkBiaya, setLkBiaya] = useState(0);
  const [lkTandaiKamarRusak, setLkTandaiKamarRusak] = useState(false);

  const filteredInventaris = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.inventaris.filter((inv) => {
      const k = db.kamar.find((km) => km.id === inv.kamarId);
      if (filterGedung !== 'Semua' && k?.gedungId !== filterGedung) return false;
      if (filterKamar !== 'Semua' && inv.kamarId !== filterKamar) return false;
      if (q && !inv.namaBarang.toLowerCase().includes(q) && !inv.keterangan.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [db.inventaris, db.kamar, filterGedung, filterKamar, search]);

  const filteredKerusakan = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.laporanKerusakan.filter((lk) => {
      const k = db.kamar.find((km) => km.id === lk.kamarId);
      if (filterGedung !== 'Semua' && k?.gedungId !== filterGedung) return false;
      if (q && !lk.deskripsi.toLowerCase().includes(q) && !lk.pelapor.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [db.laporanKerusakan, db.kamar, filterGedung, search]);

  const openAddInv = () => {
    setEditInv(null);
    setInvKamarId(db.kamar[0]?.id ?? '');
    setInvNama('');
    setInvJumlah(1);
    setInvKondisi('Baik');
    setInvKet('');
    setInvModalOpen(true);
  };

  const openEditInv = (inv: Inventaris) => {
    setEditInv(inv);
    setInvKamarId(inv.kamarId);
    setInvNama(inv.namaBarang);
    setInvJumlah(inv.jumlah);
    setInvKondisi(inv.kondisi);
    setInvKet(inv.keterangan);
    setInvModalOpen(true);
  };

  const handleSaveInv = (e: React.FormEvent) => {
    e.preventDefault();
    saveInventaris(
      {
        kamarId: invKamarId,
        namaBarang: invNama.trim(),
        jumlah: Number(invJumlah),
        kondisi: invKondisi,
        keterangan: invKet.trim(),
      },
      editInv?.id
    );
    setInvModalOpen(false);
  };

  const openAddLk = () => {
    setEditLk(null);
    setLkTanggal(getTodayISO());
    setLkKamarId(db.kamar[0]?.id ?? '');
    setLkPelapor(currentUser?.nama ?? '');
    setLkDeskripsi('');
    setLkPrioritas('Sedang');
    setLkStatus('Dilaporkan');
    setLkBiaya(0);
    setLkTandaiKamarRusak(false);
    setLkModalOpen(true);
  };

  const openEditLk = (lk: LaporanKerusakan) => {
    setEditLk(lk);
    setLkTanggal(lk.tanggal);
    setLkKamarId(lk.kamarId);
    setLkPelapor(lk.pelapor);
    setLkDeskripsi(lk.deskripsi);
    setLkPrioritas(lk.prioritas);
    setLkStatus(lk.status);
    setLkBiaya(lk.biayaPerbaikan);
    const km = db.kamar.find((k) => k.id === lk.kamarId);
    setLkTandaiKamarRusak(km?.kondisi === 'Dalam Perbaikan');
    setLkModalOpen(true);
  };

  const handleSaveLk = (e: React.FormEvent) => {
    e.preventDefault();
    const kamarSync = lkStatus === 'Selesai' ? false : lkTandaiKamarRusak ? true : undefined;
    saveLaporanKerusakan(
      {
        tanggal: lkTanggal,
        kamarId: lkKamarId,
        pelapor: lkPelapor.trim(),
        deskripsi: lkDeskripsi.trim(),
        prioritas: lkPrioritas,
        status: lkStatus,
        biayaPerbaikan: Number(lkBiaya),
        tanggalSelesai: lkStatus === 'Selesai' ? getTodayISO() : undefined,
      },
      editLk?.id,
      kamarSync
    );
    setLkModalOpen(false);
  };

  const totalBiayaPerawatan = db.laporanKerusakan.reduce((a, b) => a + b.biayaPerbaikan, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('inventaris')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md ${
              tab === 'inventaris' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Inventaris Kamar ({db.inventaris.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('kerusakan')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md ${
              tab === 'kerusakan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Laporan Kerusakan ({db.laporanKerusakan.filter((l) => l.status !== 'Selesai').length} Aktif)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang / kerusakan..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg min-h-[38px]"
            />
          </div>

          <select
            value={filterGedung}
            onChange={(e) => {
              setFilterGedung(e.target.value);
              setFilterKamar('Semua');
            }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white min-h-[38px]"
          >
            <option value="Semua">Semua Gedung</option>
            {db.gedung.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nama}
              </option>
            ))}
          </select>

          {canEdit &&
            (tab === 'inventaris' ? (
              <button
                type="button"
                onClick={openAddInv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap min-h-[38px]"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Barang</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openAddLk}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap min-h-[38px]"
              >
                <Plus className="w-4 h-4" />
                <span>Lapor Kerusakan</span>
              </button>
            ))}
        </div>
      </div>

      {/* TAB 1: INVENTARIS */}
      {tab === 'inventaris' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-medium">Kamar & Gedung</th>
                  <th className="py-3 px-4 font-medium">Nama Barang</th>
                  <th className="py-3 px-4 font-medium text-right">Jumlah</th>
                  <th className="py-3 px-4 font-medium">Kondisi</th>
                  <th className="py-3 px-4 font-medium">Keterangan</th>
                  {(canEdit || canDelete) && <th className="py-3 px-4 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventaris.map((inv) => {
                  const k = db.kamar.find((km) => km.id === inv.kamarId);
                  const g = k ? db.gedung.find((gd) => gd.id === k.gedungId) : undefined;
                  const tone =
                    inv.kondisi === 'Baik'
                      ? 'emerald'
                      : inv.kondisi === 'Rusak Ringan'
                      ? 'amber'
                      : 'red';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">Kamar {k?.nomor ?? '-'}</div>
                        <div className="text-xs text-slate-500">{g?.nama ?? '-'}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{inv.namaBarang}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900">
                        {inv.jumlah} unit
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag label={inv.kondisi} tone={tone} />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{inv.keterangan || '-'}</td>
                      {(canEdit || canDelete) && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditInv(inv)}
                              className="p-2 text-slate-500 hover:text-teal-700 rounded-lg"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: 'Hapus Inventaris',
                                  message: `Hapus "${inv.namaBarang}" dari Kamar ${k?.nomor ?? ''}?`,
                                  onConfirm: () => deleteInventaris(inv.id),
                                })
                              }
                              className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LAPORAN KERUSAKAN */}
      {tab === 'kerusakan' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Wrench className="w-4 h-4 text-teal-700" />
              <span>Total Estimasi / Realisasi Biaya Perawatan:</span>
              <span className="font-bold text-slate-900 font-mono-num">
                {formatRupiah(totalBiayaPerawatan)}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Menandai laporan sebagai <strong>Selesai</strong> akan otomatis memulihkan status kamar menjadi Baik.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredKerusakan.map((lk) => {
              const k = db.kamar.find((km) => km.id === lk.kamarId);
              const g = k ? db.gedung.find((gd) => gd.id === k.gedungId) : undefined;
              return (
                <div
                  key={lk.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">
                          Kamar {k?.nomor ?? '-'} · {g?.nama ?? '-'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono-num">
                          Dilaporkan {formatTanggal(lk.tanggal)} oleh {lk.pelapor}
                        </div>
                      </div>
                      <StatusTag
                        label={lk.status}
                        tone={
                          lk.status === 'Selesai'
                            ? 'emerald'
                            : lk.status === 'Diproses'
                            ? 'amber'
                            : 'red'
                        }
                      />
                    </div>
                    <p className="text-sm text-slate-700 mt-3 leading-relaxed">{lk.deskripsi}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <StatusTag
                        label={`Prioritas ${lk.prioritas}`}
                        tone={
                          lk.prioritas === 'Tinggi'
                            ? 'red'
                            : lk.prioritas === 'Sedang'
                            ? 'amber'
                            : 'slate'
                        }
                        withIcon={false}
                      />
                      <span className="font-mono-num font-semibold text-slate-800">
                        Biaya: {formatRupiah(lk.biayaPerbaikan)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditLk(lk)}
                          className="px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
                        >
                          Ubah Status / Biaya
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() =>
                            askConfirm({
                              title: 'Hapus Laporan Kerusakan',
                              message: `Hapus laporan kerusakan untuk Kamar ${k?.nomor ?? ''}?`,
                              onConfirm: () => deleteLaporanKerusakan(lk.id),
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Inventaris */}
      <Modal
        open={invModalOpen}
        onClose={() => setInvModalOpen(false)}
        title={editInv ? 'Ubah Data Inventaris' : 'Tambah Barang Inventaris Kamar'}
        size="md"
      >
        <form onSubmit={handleSaveInv} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Kamar *</label>
              <select
                required
                value={invKamarId}
                onChange={(e) => setInvKamarId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {db.kamar.map((k) => {
                  const g = db.gedung.find((gd) => gd.id === k.gedungId);
                  return (
                    <option key={k.id} value={k.id}>
                      {g?.nama} — Kamar {k.nomor}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Barang *</label>
              <input
                required
                type="text"
                value={invNama}
                onChange={(e) => setInvNama(e.target.value)}
                placeholder="Kasur, Lemari, Kipas Angin, dll."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah *</label>
              <input
                required
                type="number"
                min={1}
                value={invJumlah}
                onChange={(e) => setInvJumlah(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kondisi *</label>
              <select
                value={invKondisi}
                onChange={(e) => setInvKondisi(e.target.value as KondisiInventaris)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Keterangan</label>
              <input
                type="text"
                value={invKet}
                onChange={(e) => setInvKet(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setInvModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Laporan Kerusakan */}
      <Modal
        open={lkModalOpen}
        onClose={() => setLkModalOpen(false)}
        title={editLk ? 'Perbarui Laporan Kerusakan' : 'Buat Laporan Kerusakan'}
        size="md"
      >
        <form onSubmit={handleSaveLk} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kamar *</label>
              <select
                required
                value={lkKamarId}
                onChange={(e) => setLkKamarId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {db.kamar.map((k) => {
                  const g = db.gedung.find((gd) => gd.id === k.gedungId);
                  return (
                    <option key={k.id} value={k.id}>
                      {g?.nama} — Kamar {k.nomor}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Pelapor *</label>
              <input
                required
                type="text"
                value={lkPelapor}
                onChange={(e) => setLkPelapor(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Prioritas *</label>
              <select
                value={lkPrioritas}
                onChange={(e) => setLkPrioritas(e.target.value as PrioritasKerusakan)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Rendah">Rendah</option>
                <option value="Sedang">Sedang</option>
                <option value="Tinggi">Tinggi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status *</label>
              <select
                value={lkStatus}
                onChange={(e) => setLkStatus(e.target.value as StatusKerusakan)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Dilaporkan">Dilaporkan</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Deskripsi Kerusakan *
              </label>
              <textarea
                required
                rows={2}
                value={lkDeskripsi}
                onChange={(e) => setLkDeskripsi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Biaya Perbaikan (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={lkBiaya}
                onChange={(e) => setLkBiaya(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lkTandaiKamarRusak}
                  onChange={(e) => setLkTandaiKamarRusak(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700"
                />
                <span>Tandai kamar sedang Dalam Perbaikan</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setLkModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Simpan Laporan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
