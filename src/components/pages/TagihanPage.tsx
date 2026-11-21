import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Search, Trash2 } from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { formatRupiah, formatTanggal, getTodayISO } from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const PAGE_SIZE = 10;

export const TagihanPage: React.FC = () => {
  const {
    db,
    currentUser,
    activeRole,
    generateTagihanBulanan,
    tandaiTagihanLunas,
    deleteTagihan,
    askConfirm,
  } = useDorm();

  const isWali = activeRole.scopeMode === 'anak_terkait';
  const canManage = activeRole.capabilities.canManageBilling;
  const canDelete = activeRole.capabilities.canDelete && activeRole.capabilities.canManageBilling;

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Lunas' | 'Belum Lunas'>('Semua');
  const [page, setPage] = useState(1);

  const [genOpen, setGenOpen] = useState(false);
  const [bulan, setBulan] = useState(
    new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date())
  );
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [nominal, setNominal] = useState(650000);
  const [jatuhTempo, setJatuhTempo] = useState(getTodayISO());

  const today = getTodayISO();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.tagihan.filter((t) => {
      if (isWali && !currentUser?.penghuniIds?.includes(t.penghuniId)) return false;
      if (filterStatus !== 'Semua' && t.status !== filterStatus) return false;
      if (q) {
        const s = db.penghuni.find((p) => p.id === t.penghuniId);
        return (
          s?.nama.toLowerCase().includes(q) ||
          t.judul.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.tagihan, db.penghuni, isWali, currentUser, filterStatus, search]);

  const summary = useMemo(() => {
    const base = isWali
      ? db.tagihan.filter((t) => currentUser?.penghuniIds?.includes(t.penghuniId))
      : db.tagihan;
    const totalLunas = base
      .filter((t) => t.status === 'Lunas')
      .reduce((a, b) => a + b.nominal, 0);
    const totalBelum = base
      .filter((t) => t.status === 'Belum Lunas')
      .reduce((a, b) => a + b.nominal, 0);
    return { totalLunas, totalBelum };
  }, [db.tagihan, isWali, currentUser]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(list.length / PAGE_SIZE)));
  const paged = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateTagihanBulanan(bulan, Number(tahun), Number(nominal), jatuhTempo);
    setGenOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Iuran Sudah Lunas</div>
          <div className="text-xl font-bold text-emerald-700 font-mono-num mt-1">
            {formatRupiah(summary.totalLunas)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Tagihan Belum Lunas</div>
          <div className="text-xl font-bold text-amber-700 font-mono-num mt-1">
            {formatRupiah(summary.totalBelum)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama santri atau tagihan..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg min-h-[38px]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(['Semua', 'Belum Lunas', 'Lunas'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setFilterStatus(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                  filterStatus === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setGenOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Tagihan Bulanan</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="py-3 px-4 font-medium">Santri & Kamar</th>
                <th className="py-3 px-4 font-medium">Keterangan Tagihan</th>
                <th className="py-3 px-4 font-medium">Jatuh Tempo</th>
                <th className="py-3 px-4 font-medium text-right">Nominal</th>
                <th className="py-3 px-4 font-medium">Status</th>
                {canManage && <th className="py-3 px-4 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((t) => {
                const s = db.penghuni.find((p) => p.id === t.penghuniId);
                const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
                const overdue = t.status === 'Belum Lunas' && t.jatuhTempo <= today;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s?.nama ?? '-'}</div>
                      <div className="text-xs text-slate-500">
                        Kamar {k?.nomor ?? '-'} · NIS {s?.nis ?? '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <div>{t.judul}</div>
                      {t.tanggalBayar && (
                        <div className="text-xs text-emerald-700">
                          Dibayar {formatTanggal(t.tanggalBayar)} ({t.metodeBayar || 'Tunai'})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-xs whitespace-nowrap">
                      <span className={overdue ? 'text-red-700 font-semibold' : 'text-slate-600'}>
                        {formatTanggal(t.jatuhTempo)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                      {formatRupiah(t.nominal)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusTag
                        label={overdue ? 'Jatuh Tempo' : t.status}
                        tone={t.status === 'Lunas' ? 'emerald' : overdue ? 'red' : 'amber'}
                      />
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {t.status === 'Belum Lunas' && (
                            <button
                              type="button"
                              onClick={() => tandaiTagihanLunas(t.id, 'Tunai / Transfer')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Tandai Lunas</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: 'Hapus Tagihan',
                                  message: `Hapus tagihan "${t.judul}" milik ${s?.nama ?? ''}?`,
                                  onConfirm: () => deleteTagihan(t.id),
                                })
                              }
                              className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={safePage}
          totalItems={list.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Modal Generate Tagihan Bulanan */}
      <Modal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title="Buat Tagihan Iuran Bulanan Massal"
        subtitle="Otomatis membuat tagihan untuk seluruh penghuni aktif yang belum memiliki tagihan bulan tersebut."
        size="sm"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bulan</label>
              <select
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {[
                  'Januari',
                  'Februari',
                  'Maret',
                  'April',
                  'Mei',
                  'Juni',
                  'Juli',
                  'Agustus',
                  'September',
                  'Oktober',
                  'November',
                  'Desember',
                ].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tahun</label>
              <input
                required
                type="number"
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nominal (Rp)</label>
            <input
              required
              type="number"
              min={0}
              step={10000}
              value={nominal}
              onChange={(e) => setNominal(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Jatuh Tempo</label>
            <input
              required
              type="date"
              value={jatuhTempo}
              onChange={(e) => setJatuhTempo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setGenOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Terbitkan Tagihan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
