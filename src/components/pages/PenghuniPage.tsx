import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { JenisKelamin, Penghuni, StatusPenghuni } from '../../types/dorm';
import { formatTanggal, getLevelPeringatan, getTodayISO } from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { PenghuniProfileModal } from '../PenghuniProfileModal';

const PAGE_SIZE = 10;

export const PenghuniPage: React.FC = () => {
  const {
    db,
    currentUser,
    activeRole,
    getKamarOccupancy,
    getPenghuniPoin,
    savePenghuni,
    deletePenghuni,
    pindahKamar,
    askConfirm,
  } = useDorm();

  const canEdit = activeRole.capabilities.canCreateEdit;
  const canDelete = activeRole.capabilities.canDelete;
  const isAnakScope = activeRole.scopeMode === 'anak_terkait';

  const [search, setSearch] = useState('');
  const [filterGedung, setFilterGedung] = useState('Semua');
  const [filterKamar, setFilterKamar] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [page, setPage] = useState(1);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Penghuni | null>(null);

  const [moveTarget, setMoveTarget] = useState<Penghuni | null>(null);
  const [moveKamarId, setMoveKamarId] = useState('');
  const [moveAlasan, setMoveAlasan] = useState('');

  // Form states
  const [nama, setNama] = useState('');
  const [nis, setNis] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<JenisKelamin>('Putra');
  const [kelas, setKelas] = useState('');
  const [tanggalMasuk, setTanggalMasuk] = useState(getTodayISO());
  const [kamarId, setKamarId] = useState('');
  const [namaWali, setNamaWali] = useState('');
  const [kontakWali, setKontakWali] = useState('');
  const [kontakDarurat, setKontakDarurat] = useState('');
  const [status, setStatus] = useState<StatusPenghuni>('Aktif');
  const [catatanKhusus, setCatatanKhusus] = useState('');

  const scopedPenghuni = useMemo(() => {
    if (isAnakScope) {
      return db.penghuni.filter((p) => currentUser?.penghuniIds?.includes(p.id));
    }
    if (
      activeRole.scopeMode === 'gedung_terkait' &&
      currentUser?.gedungIds &&
      currentUser.gedungIds.length > 0
    ) {
      const allowedRoomIds = new Set(
        db.kamar.filter((k) => currentUser.gedungIds?.includes(k.gedungId)).map((k) => k.id)
      );
      return db.penghuni.filter((p) => allowedRoomIds.has(p.kamarId));
    }
    return db.penghuni;
  }, [db.penghuni, db.kamar, currentUser, isAnakScope, activeRole.scopeMode]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedPenghuni.filter((p) => {
      const kamar = db.kamar.find((k) => k.id === p.kamarId);
      if (filterGedung !== 'Semua' && kamar?.gedungId !== filterGedung) return false;
      if (filterKamar !== 'Semua' && p.kamarId !== filterKamar) return false;
      if (filterStatus !== 'Semua' && p.status !== filterStatus) return false;
      if (q) {
        const match =
          p.nama.toLowerCase().includes(q) ||
          p.nis.toLowerCase().includes(q) ||
          p.kelas.toLowerCase().includes(q) ||
          p.namaWali.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedPenghuni, db.kamar, filterGedung, filterKamar, filterStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedList = filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openAddForm = () => {
    setEditTarget(null);
    setNama('');
    setNis('');
    const defaultJK: JenisKelamin =
      currentUser?.peran === 'Pembina' &&
      currentUser.gedungIds &&
      db.gedung.find((g) => g.id === currentUser.gedungIds?.[0])?.jenis === 'Putri'
        ? 'Putri'
        : 'Putra';
    setJenisKelamin(defaultJK);
    setKelas('10-A');
    setTanggalMasuk(getTodayISO());
    const firstValidRoom = db.kamar.find((k) => {
      const g = db.gedung.find((gd) => gd.id === k.gedungId);
      return (
        g?.jenis === defaultJK &&
        k.kondisi === 'Baik' &&
        getKamarOccupancy(k.id) < k.kapasitas
      );
    });
    setKamarId(firstValidRoom?.id ?? '');
    setNamaWali('');
    setKontakWali('');
    setKontakDarurat('');
    setStatus('Aktif');
    setCatatanKhusus('');
    setFormOpen(true);
  };

  const openEditForm = (p: Penghuni) => {
    setEditTarget(p);
    setNama(p.nama);
    setNis(p.nis);
    setJenisKelamin(p.jenisKelamin);
    setKelas(p.kelas);
    setTanggalMasuk(p.tanggalMasuk);
    setKamarId(p.kamarId);
    setNamaWali(p.namaWali);
    setKontakWali(p.kontakWali);
    setKontakDarurat(p.kontakDarurat);
    setStatus(p.status);
    setCatatanKhusus(p.catatanKhusus);
    setFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const res = savePenghuni(
      {
        nama: nama.trim(),
        nis: nis.trim(),
        jenisKelamin,
        kelas: kelas.trim(),
        tanggalMasuk,
        kamarId,
        namaWali: namaWali.trim(),
        kontakWali: kontakWali.trim(),
        kontakDarurat: kontakDarurat.trim(),
        status,
        catatanKhusus: catatanKhusus.trim(),
      },
      editTarget?.id
    );
    if (res.ok) {
      setFormOpen(false);
    }
  };

  const openMoveModal = (p: Penghuni) => {
    setMoveTarget(p);
    const valid = db.kamar.find((k) => {
      const g = db.gedung.find((gd) => gd.id === k.gedungId);
      return (
        k.id !== p.kamarId &&
        g?.jenis === p.jenisKelamin &&
        k.kondisi === 'Baik' &&
        getKamarOccupancy(k.id) < k.kapasitas
      );
    });
    setMoveKamarId(valid?.id ?? '');
    setMoveAlasan('');
  };

  const handleConfirmMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget || !moveKamarId) return;
    const res = pindahKamar(moveTarget.id, moveKamarId, moveAlasan);
    if (res.ok) setMoveTarget(null);
  };

  const filterKamarOptions = useMemo(() => {
    if (filterGedung === 'Semua') return db.kamar;
    return db.kamar.filter((k) => k.gedungId === filterGedung);
  }, [db.kamar, filterGedung]);

  const formRoomOptions = useMemo(() => {
    return db.kamar.map((k) => {
      const g = db.gedung.find((gd) => gd.id === k.gedungId);
      const occ = getKamarOccupancy(k.id, editTarget?.id);
      const genderMatch = g?.jenis === jenisKelamin;
      const available = genderMatch && k.kondisi === 'Baik' && occ < k.kapasitas;
      return { kamar: k, gedung: g, occ, genderMatch, available };
    });
  }, [db.kamar, db.gedung, getKamarOccupancy, editTarget?.id, jenisKelamin]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama, NIS, kelas, atau wali..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 min-h-[40px]"
            />
          </div>

          {!isAnakScope && (
            <>
              <select
                value={filterGedung}
                onChange={(e) => {
                  setFilterGedung(e.target.value);
                  setFilterKamar('Semua');
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-600 min-h-[40px]"
                aria-label="Filter gedung"
              >
                <option value="Semua">Semua Gedung</option>
                {db.gedung.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} ({g.jenis})
                  </option>
                ))}
              </select>

              <select
                value={filterKamar}
                onChange={(e) => {
                  setFilterKamar(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-600 min-h-[40px]"
                aria-label="Filter kamar"
              >
                <option value="Semua">Semua Kamar</option>
                {filterKamarOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kamar {k.nomor}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-600 min-h-[40px]"
                aria-label="Filter status"
              >
                <option value="Semua">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Izin">Izin</option>
                <option value="Pulang">Pulang</option>
                <option value="Lulus">Lulus</option>
              </select>
            </>
          )}
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Penghuni</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="py-3 px-4 font-medium">NIS & Nama Santri</th>
                <th className="py-3 px-4 font-medium">Kelas · JK</th>
                <th className="py-3 px-4 font-medium">Gedung & Kamar</th>
                <th className="py-3 px-4 font-medium">Wali & Kontak</th>
                <th className="py-3 px-4 font-medium">Poin</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    Tidak ada data penghuni yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((p) => {
                  const kamar = db.kamar.find((k) => k.id === p.kamarId);
                  const gedung = kamar ? db.gedung.find((g) => g.id === kamar.gedungId) : undefined;
                  const poin = getPenghuniPoin(p.id);
                  const lvl = getLevelPeringatan(poin.poinBersih, db.pengaturan);
                  const statusTone =
                    p.status === 'Aktif'
                      ? 'emerald'
                      : p.status === 'Izin'
                      ? 'blue'
                      : p.status === 'Pulang'
                      ? 'amber'
                      : 'slate';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setProfileId(p.id)}
                          className="font-semibold text-slate-900 hover:text-teal-700 text-left block"
                        >
                          {p.nama}
                        </button>
                        <div className="text-xs text-slate-500 font-mono-num">
                          NIS {p.nis} · Masuk {formatTanggal(p.tanggalMasuk)}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        <div>Kelas {p.kelas}</div>
                        <div className="text-xs text-slate-500">{p.jenisKelamin}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {kamar ? `Kamar ${kamar.nomor}` : '-'}
                        </div>
                        <div className="text-xs text-slate-500">{gedung?.nama ?? '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900">{p.namaWali}</div>
                        <div className="text-xs text-slate-500 font-mono-num">{p.kontakWali}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-mono-num font-semibold ${
                            lvl.tone === 'red'
                              ? 'text-red-700'
                              : lvl.tone === 'orange'
                              ? 'text-orange-700'
                              : lvl.tone === 'amber'
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {poin.poinBersih} ({lvl.level})
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusTag label={p.status} tone={statusTone} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setProfileId(p.id)}
                            className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
                            title="Lihat Profil Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => openMoveModal(p)}
                                className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
                                title="Pindah Kamar"
                              >
                                <ArrowLeftRight className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditForm(p)}
                                className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
                                title="Ubah Data"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: 'Hapus Data Penghuni',
                                  message: `Apakah Anda yakin ingin menghapus data "${p.nama}" beserta riwayat absensi dan perizinannya?`,
                                  onConfirm: () => deletePenghuni(p.id),
                                })
                              }
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Hapus Data"
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

      {/* Add / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? `Ubah Data Penghuni: ${editTarget.nama}` : 'Tambah Penghuni Baru'}
        subtitle="Pastikan penempatan kamar sesuai jenis kelamin gedung dan kapasitas kamar."
        size="lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap *</label>
              <input
                required
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NIS / Nomor Induk *</label>
              <input
                required
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin *</label>
              <select
                value={jenisKelamin}
                onChange={(e) => {
                  const jk = e.target.value as JenisKelamin;
                  setJenisKelamin(jk);
                  const valid = db.kamar.find((k) => {
                    const g = db.gedung.find((gd) => gd.id === k.gedungId);
                    return (
                      g?.jenis === jk &&
                      k.kondisi === 'Baik' &&
                      getKamarOccupancy(k.id, editTarget?.id) < k.kapasitas
                    );
                  });
                  if (valid) setKamarId(valid.id);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kelas *</label>
              <input
                required
                type="text"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="Contoh: 10-A"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Masuk *</label>
              <input
                required
                type="date"
                value={tanggalMasuk}
                onChange={(e) => setTanggalMasuk(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusPenghuni)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Aktif">Aktif</option>
                <option value="Izin">Izin</option>
                <option value="Pulang">Pulang</option>
                <option value="Lulus">Lulus</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kamar Penempatan ({jenisKelamin}) *
              </label>
              <select
                required={status !== 'Lulus'}
                value={kamarId}
                onChange={(e) => setKamarId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="">-- Pilih Kamar --</option>
                {formRoomOptions.map(({ kamar, gedung, occ, genderMatch, available }) => (
                  <option key={kamar.id} value={kamar.id} disabled={!available && kamar.id !== kamarId}>
                    {gedung?.nama} ({gedung?.jenis}) — Kamar {kamar.nomor} [{occ}/{kamar.kapasitas}]
                    {!genderMatch
                      ? ' [Tidak Sesuai Gender]'
                      : kamar.kondisi === 'Dalam Perbaikan'
                      ? ' [Dalam Perbaikan]'
                      : occ >= kamar.kapasitas
                      ? ' [Penuh]'
                      : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Wali *</label>
              <input
                required
                type="text"
                value={namaWali}
                onChange={(e) => setNamaWali(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kontak Wali (HP/WA) *</label>
              <input
                required
                type="text"
                value={kontakWali}
                onChange={(e) => setKontakWali(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kontak Darurat</label>
              <input
                type="text"
                value={kontakDarurat}
                onChange={(e) => setKontakDarurat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Khusus</label>
              <input
                type="text"
                value={catatanKhusus}
                onChange={(e) => setCatatanKhusus(e.target.value)}
                placeholder="Alergi, amanah kamar, dll."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              {editTarget ? 'Simpan Perubahan' : 'Simpan Penghuni'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Move Room Modal */}
      <Modal
        open={Boolean(moveTarget)}
        onClose={() => setMoveTarget(null)}
        title={`Pindah Kamar: ${moveTarget?.nama ?? ''}`}
        subtitle="Sistem memvalidasi kapasitas kamar dan pemisahan asrama putra/putri secara otomatis."
        size="md"
      >
        {moveTarget && (
          <form onSubmit={handleConfirmMove} className="space-y-4">
            <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
              Kamar saat ini:{' '}
              <span className="font-semibold text-slate-900">
                {db.kamar.find((k) => k.id === moveTarget.kamarId)?.nomor ?? '-'}
              </span>{' '}
              ({moveTarget.jenisKelamin})
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kamar Tujuan *</label>
              <select
                required
                value={moveKamarId}
                onChange={(e) => setMoveKamarId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="">-- Pilih Kamar Tujuan --</option>
                {db.kamar.map((k) => {
                  const g = db.gedung.find((gd) => gd.id === k.gedungId);
                  const occ = getKamarOccupancy(k.id);
                  const valid =
                    k.id !== moveTarget.kamarId &&
                    g?.jenis === moveTarget.jenisKelamin &&
                    k.kondisi === 'Baik' &&
                    occ < k.kapasitas;
                  return (
                    <option key={k.id} value={k.id} disabled={!valid}>
                      {g?.nama} — Kamar {k.nomor} ({occ}/{k.kapasitas})
                      {k.id === moveTarget.kamarId
                        ? ' [Kamar Saat Ini]'
                        : g?.jenis !== moveTarget.jenisKelamin
                        ? ` [Khusus ${g?.jenis}]`
                        : k.kondisi === 'Dalam Perbaikan'
                        ? ' [Dalam Perbaikan]'
                        : occ >= k.kapasitas
                        ? ' [Penuh]'
                        : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Alasan Perpindahan *</label>
              <input
                required
                type="text"
                value={moveAlasan}
                onChange={(e) => setMoveAlasan(e.target.value)}
                placeholder="Misal: Penyesuaian kelas atau perbaikan kamar"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                Pindahkan Penghuni
              </button>
            </div>
          </form>
        )}
      </Modal>

      <PenghuniProfileModal penghuniId={profileId} onClose={() => setProfileId(null)} />
    </div>
  );
};
