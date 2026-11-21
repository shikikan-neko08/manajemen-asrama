import React, { useMemo, useState } from 'react';
import {
  Check,
  DoorClosed,
  DoorOpen,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { JenisIzin, Perizinan } from '../../types/dorm';
import {
  formatTanggalWaktu,
  getNowDateTimeLocal,
  getStatusIzinEfektif,
} from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const PAGE_SIZE = 10;

export const PerizinanPage: React.FC = () => {
  const {
    db,
    currentUser,
    activeRole,
    createPerizinan,
    updateStatusPerizinan,
    deletePerizinan,
    askConfirm,
  } = useDorm();

  const isWali = activeRole.scopeMode === 'anak_terkait';
  const canCreateEdit = activeRole.capabilities.canCreateEdit;
  const canApproveIzin = activeRole.capabilities.canApproveIzin;
  const canManageGate = activeRole.capabilities.canManageGate || activeRole.capabilities.canCreateEdit;
  const canDelete = activeRole.capabilities.canDelete;

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterGedung, setFilterGedung] = useState<string>('Semua');
  const [page, setPage] = useState(1);

  // Modal Form Ajukan Izin
  const [formOpen, setFormOpen] = useState(false);
  const [penghuniId, setPenghuniId] = useState('');
  const [jenis, setJenis] = useState<JenisIzin>('Keluar Sementara');
  const [tanggalKeluar, setTanggalKeluar] = useState(getNowDateTimeLocal());
  const [perkiraanKembali, setPerkiraanKembali] = useState(getNowDateTimeLocal());
  const [alasan, setAlasan] = useState('');
  const [penjemput, setPenjemput] = useState('');
  const [kontakPenjemput, setKontakPenjemput] = useState('');

  // Print Surat Izin Modal
  const [printIzin, setPrintIzin] = useState<Perizinan | null>(null);

  const scopedPerizinan = useMemo(() => {
    if (isWali) {
      return db.perizinan.filter((iz) => currentUser?.penghuniIds?.includes(iz.penghuniId));
    }
    return db.perizinan;
  }, [db.perizinan, isWali, currentUser]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedPerizinan.filter((iz) => {
      const s = db.penghuni.find((p) => p.id === iz.penghuniId);
      const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
      const efektif = getStatusIzinEfektif(iz);

      if (filterStatus !== 'Semua' && efektif !== filterStatus) return false;
      if (filterGedung !== 'Semua' && k?.gedungId !== filterGedung) return false;
      if (q) {
        const match =
          s?.nama.toLowerCase().includes(q) ||
          iz.alasan.toLowerCase().includes(q) ||
          iz.penjemput.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedPerizinan, db.penghuni, db.kamar, filterStatus, filterGedung, search]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE)));
  const paginatedList = filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openNewForm = () => {
    const first = db.penghuni.find((p) => p.status !== 'Lulus');
    setPenghuniId(first?.id ?? '');
    setJenis('Keluar Sementara');
    const nowStr = getNowDateTimeLocal();
    setTanggalKeluar(nowStr);
    const later = new Date();
    later.setHours(later.getHours() + 4);
    const y = later.getFullYear();
    const m = String(later.getMonth() + 1).padStart(2, '0');
    const d = String(later.getDate()).padStart(2, '0');
    const hh = String(later.getHours()).padStart(2, '0');
    const mm = String(later.getMinutes()).padStart(2, '0');
    setPerkiraanKembali(`${y}-${m}-${d}T${hh}:${mm}`);
    setAlasan('');
    setPenjemput(first?.namaWali ?? '');
    setKontakPenjemput(first?.kontakWali ?? '');
    setFormOpen(true);
  };

  const handlePenghuniSelect = (id: string) => {
    setPenghuniId(id);
    const s = db.penghuni.find((p) => p.id === id);
    if (s) {
      setPenjemput(s.namaWali);
      setKontakPenjemput(s.kontakWali);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createPerizinan({
      penghuniId,
      jenis,
      tanggalKeluar,
      perkiraanKembali,
      alasan: alasan.trim(),
      penjemput: penjemput.trim(),
      kontakPenjemput: kontakPenjemput.trim(),
    });
    if (res.ok) setFormOpen(false);
  };

  const statusTabs = ['Semua', 'Diajukan', 'Disetujui', 'Keluar', 'Terlambat', 'Kembali', 'Ditolak'];

  return (
    <div className="space-y-4">
      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
                placeholder="Cari santri, alasan, atau penjemput..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 min-h-[40px]"
              />
            </div>

            {!isWali && (
              <select
                value={filterGedung}
                onChange={(e) => {
                  setFilterGedung(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-600 min-h-[40px]"
              >
                <option value="Semua">Semua Gedung</option>
                {db.gedung.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            )}
          </div>

          {canCreateEdit && (
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Izin Santri</span>
            </button>
          )}
        </div>

        {/* Status Segmented Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {statusTabs.map((st) => {
            const count = scopedPerizinan.filter((iz) =>
              st === 'Semua' ? true : getStatusIzinEfektif(iz) === st
            ).length;
            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setFilterStatus(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap transition-colors ${
                  filterStatus === st
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="py-3 px-4 font-medium">Santri & Kamar</th>
                <th className="py-3 px-4 font-medium">Jenis & Alasan</th>
                <th className="py-3 px-4 font-medium">Jadwal Keluar / Kembali</th>
                <th className="py-3 px-4 font-medium">Penjemput</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    Tidak ada data perizinan sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((iz) => {
                  const s = db.penghuni.find((p) => p.id === iz.penghuniId);
                  const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
                  const efektif = getStatusIzinEfektif(iz);
                  const tone =
                    efektif === 'Kembali'
                      ? 'emerald'
                      : efektif === 'Terlambat' || efektif === 'Ditolak'
                      ? 'red'
                      : efektif === 'Keluar'
                      ? 'amber'
                      : 'blue';

                  return (
                    <tr key={iz.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s?.nama ?? '-'}</div>
                        <div className="text-xs text-slate-500">
                          Kamar {k?.nomor ?? '-'} · Kelas {s?.kelas ?? '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900">{iz.jenis}</div>
                        <div className="text-xs text-slate-600 line-clamp-2">{iz.alasan}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <div className="text-slate-700 font-mono-num">
                          Keluar: {formatTanggalWaktu(iz.tanggalKeluar)}
                        </div>
                        <div
                          className={`font-mono-num mt-0.5 ${
                            efektif === 'Terlambat' ? 'text-red-700 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          Batas: {formatTanggalWaktu(iz.perkiraanKembali)}
                        </div>
                        {iz.tanggalKembaliAktual && (
                          <div className="text-emerald-700 font-mono-num mt-0.5">
                            Aktual: {formatTanggalWaktu(iz.tanggalKembaliAktual)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="text-slate-900 font-medium">{iz.penjemput}</div>
                        <div className="text-slate-500 font-mono-num">{iz.kontakPenjemput}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag label={efektif} tone={tone} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Approval actions */}
                          {canApproveIzin && iz.status === 'Diajukan' && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateStatusPerizinan(iz.id, 'Setujui')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                                title="Setujui Izin"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatusPerizinan(iz.id, 'Tolak')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg"
                                title="Tolak Izin"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}

                          {/* Gate actions */}
                          {canManageGate && iz.status === 'Disetujui' && (
                            <button
                              type="button"
                              onClick={() => updateStatusPerizinan(iz.id, 'Keluar')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                            >
                              <DoorOpen className="w-3.5 h-3.5" />
                              <span>Catat Keluar</span>
                            </button>
                          )}

                          {canManageGate &&
                            (iz.status === 'Keluar' || efektif === 'Terlambat') && (
                              <button
                                type="button"
                                onClick={() => updateStatusPerizinan(iz.id, 'Kembali')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                              >
                                <DoorClosed className="w-3.5 h-3.5" />
                                <span>Catat Kembali</span>
                              </button>
                            )}

                          {/* Print Surat Izin */}
                          {iz.status !== 'Ditolak' && (
                            <button
                              type="button"
                              onClick={() => setPrintIzin(iz)}
                              className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
                              title="Cetak Surat Izin"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: 'Hapus Data Perizinan',
                                  message: `Hapus pengajuan izin untuk ${s?.nama ?? 'santri ini'}?`,
                                  onConfirm: () => deletePerizinan(iz.id),
                                })
                              }
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Hapus"
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

        <Pagination
          currentPage={safePage}
          totalItems={filteredList.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Modal Ajukan Izin */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Pengajuan Izin Santri"
        subtitle="Isi detail keberangkatan, perkiraan waktu kembali, dan penjemput."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Santri *</label>
            <select
              required
              value={penghuniId}
              onChange={(e) => handlePenghuniSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
            >
              {db.penghuni
                .filter((p) => p.status !== 'Lulus')
                .map((p) => {
                  const km = db.kamar.find((k) => k.id === p.kamarId);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nama} (Kamar {km?.nomor ?? '-'} · {p.kelas})
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Izin *</label>
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value as JenisIzin)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
            >
              <option value="Keluar Sementara">Keluar Sementara</option>
              <option value="Pulang">Pulang</option>
              <option value="Sakit">Sakit / Berobat</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Waktu Keluar *
              </label>
              <input
                required
                type="datetime-local"
                value={tanggalKeluar}
                onChange={(e) => setTanggalKeluar(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Perkiraan Kembali *
              </label>
              <input
                required
                type="datetime-local"
                value={perkiraanKembali}
                onChange={(e) => setPerkiraanKembali(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Alasan Izin *</label>
            <textarea
              required
              rows={2}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Jelaskan keperluan izin..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Penjemput *
              </label>
              <input
                required
                type="text"
                value={penjemput}
                onChange={(e) => setPenjemput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kontak Penjemput *
              </label>
              <input
                required
                type="text"
                value={kontakPenjemput}
                onChange={(e) => setKontakPenjemput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Ajukan Izin
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cetak Surat Izin */}
      <Modal
        open={Boolean(printIzin)}
        onClose={() => setPrintIzin(null)}
        title="Pratinjau Surat Izin Keluar Asrama"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPrintIzin(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg bg-white hover:bg-slate-50"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </>
        }
      >
        {printIzin && (() => {
          const s = db.penghuni.find((p) => p.id === printIzin.penghuniId);
          const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
          const g = k ? db.gedung.find((gd) => gd.id === k.gedungId) : undefined;
          return (
            <div className="border border-slate-300 rounded-lg p-6 space-y-5 bg-white text-slate-900">
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <div className="text-base font-bold uppercase tracking-wide">
                  {db.pengaturan.namaLembaga}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {db.pengaturan.alamatLembaga}
                </div>
                <div className="text-sm font-bold mt-2 underline">
                  SURAT IZIN MENINGGALKAN ASRAMA
                </div>
                <div className="text-xs font-mono-num text-slate-500">
                  Nomor: {printIzin.id.toUpperCase()}
                </div>
              </div>

              <div className="text-sm space-y-2">
                <p>Dengan ini memberikan izin keluar asrama kepada santri:</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 w-40 text-slate-600">Nama Santri</td>
                      <td className="py-1 font-semibold">: {s?.nama ?? '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">NIS / Kelas</td>
                      <td className="py-1 font-mono-num">
                        : {s?.nis ?? '-'} / Kelas {s?.kelas ?? '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Asrama / Kamar</td>
                      <td className="py-1">
                        : {g?.nama ?? '-'} / Kamar {k?.nomor ?? '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Jenis Izin</td>
                      <td className="py-1 font-semibold">: {printIzin.jenis}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Waktu Keluar</td>
                      <td className="py-1 font-mono-num">
                        : {formatTanggalWaktu(printIzin.tanggalKeluar)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Batas Kembali</td>
                      <td className="py-1 font-mono-num font-semibold">
                        : {formatTanggalWaktu(printIzin.perkiraanKembali)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Keperluan</td>
                      <td className="py-1">: {printIzin.alasan}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">Penjemput</td>
                      <td className="py-1">
                        : {printIzin.penjemput} ({printIzin.kontakPenjemput})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 text-xs text-center">
                <div>
                  <div>Mengetahui,</div>
                  <div className="font-semibold">Petugas Keamanan Gerbang</div>
                  <div className="h-14" />
                  <div className="border-t border-slate-400 pt-1 mx-4">Tanda Tangan & Jam</div>
                </div>
                <div>
                  <div>Disetujui Oleh,</div>
                  <div className="font-semibold">Pembina / Musyrif Asrama</div>
                  <div className="h-14" />
                  <div className="border-t border-slate-400 pt-1 mx-4">
                    {printIzin.disetujuiOleh || 'Pembina Asrama'}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
