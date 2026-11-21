import React, { useMemo, useState } from 'react';
import { Award, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { KategoriPelanggaran } from '../../types/dorm';
import { formatTanggal, getLevelPeringatan, getTodayISO } from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { PenghuniProfileModal } from '../PenghuniProfileModal';

const PAGE_SIZE = 10;

export const PelanggaranPage: React.FC = () => {
  const {
    db,
    currentUser,
    activeRole,
    getPenghuniPoin,
    addPelanggaran,
    deletePelanggaran,
    addPembinaanPrestasi,
    deletePembinaanPrestasi,
    saveJenisPelanggaran,
    deleteJenisPelanggaran,
    askConfirm,
  } = useDorm();

  const isWali = activeRole.scopeMode === 'anak_terkait';
  const canEdit = activeRole.capabilities.canCreateEdit;
  const canDelete = activeRole.capabilities.canDelete;

  const [tab, setTab] = useState<'pelanggaran' | 'akumulasi' | 'prestasi' | 'master'>(
    'pelanggaran'
  );
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [page, setPage] = useState(1);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Modal Catat Pelanggaran
  const [plModalOpen, setPlModalOpen] = useState(false);
  const [plPenghuniId, setPlPenghuniId] = useState('');
  const [plJenisId, setPlJenisId] = useState('');
  const [plTanggal, setPlTanggal] = useState(getTodayISO());
  const [plKategori, setPlKategori] = useState<KategoriPelanggaran>('Ringan');
  const [plNama, setPlNama] = useState('');
  const [plPoin, setPlPoin] = useState(10);
  const [plSanksi, setPlSanksi] = useState('');
  const [plKeterangan, setPlKeterangan] = useState('');

  // Modal Pembinaan & Prestasi
  const [ppModalOpen, setPpModalOpen] = useState(false);
  const [ppPenghuniId, setPpPenghuniId] = useState('');
  const [ppTipe, setPpTipe] = useState<'Prestasi' | 'Pembinaan'>('Prestasi');
  const [ppTanggal, setPpTanggal] = useState(getTodayISO());
  const [ppJudul, setPpJudul] = useState('');
  const [ppDeskripsi, setPpDeskripsi] = useState('');
  const [ppPoinPengurang, setPpPoinPengurang] = useState(10);

  // Modal Master Jenis Pelanggaran
  const [jpModalOpen, setJpModalOpen] = useState(false);
  const [jpNama, setJpNama] = useState('');
  const [jpKategori, setJpKategori] = useState<KategoriPelanggaran>('Ringan');
  const [jpPoin, setJpPoin] = useState(10);
  const [jpSanksi, setJpSanksi] = useState('');

  const scopedPenghuni = useMemo(() => {
    if (isWali) {
      return db.penghuni.filter((p) => currentUser?.penghuniIds?.includes(p.id));
    }
    return db.penghuni.filter((p) => p.status !== 'Lulus');
  }, [db.penghuni, isWali, currentUser]);

  const filteredPelanggaran = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.pelanggaran
      .filter((pl) => {
        if (isWali && !currentUser?.penghuniIds?.includes(pl.penghuniId)) return false;
        if (filterKategori !== 'Semua' && pl.kategori !== filterKategori) return false;
        if (q) {
          const s = db.penghuni.find((p) => p.id === pl.penghuniId);
          const match =
            s?.nama.toLowerCase().includes(q) ||
            pl.namaPelanggaran.toLowerCase().includes(q) ||
            pl.sanksi.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [db.pelanggaran, db.penghuni, isWali, currentUser, filterKategori, search]);

  const akumulasiList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedPenghuni
      .filter((p) => (!q ? true : p.nama.toLowerCase().includes(q) || p.nis.includes(q)))
      .map((p) => {
        const kamar = db.kamar.find((k) => k.id === p.kamarId);
        const poin = getPenghuniPoin(p.id);
        const level = getLevelPeringatan(poin.poinBersih, db.pengaturan);
        const jumlahKasus = db.pelanggaran.filter((pl) => pl.penghuniId === p.id).length;
        return { penghuni: p, kamar, poin, level, jumlahKasus };
      })
      .sort((a, b) => b.poin.poinBersih - a.poin.poinBersih);
  }, [scopedPenghuni, db.kamar, db.pelanggaran, db.pengaturan, getPenghuniPoin, search]);

  const filteredPembinaan = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.pembinaanPrestasi
      .filter((pp) => {
        if (isWali && !currentUser?.penghuniIds?.includes(pp.penghuniId)) return false;
        if (q) {
          const s = db.penghuni.find((p) => p.id === pp.penghuniId);
          return (
            s?.nama.toLowerCase().includes(q) ||
            pp.judul.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [db.pembinaanPrestasi, db.penghuni, isWali, currentUser, search]);

  const openAddPelanggaran = () => {
    const firstSantri = db.penghuni.find((p) => p.status !== 'Lulus');
    const firstJenis = db.jenisPelanggaran[0];
    setPlPenghuniId(firstSantri?.id ?? '');
    setPlJenisId(firstJenis?.id ?? '');
    setPlTanggal(getTodayISO());
    setPlKategori(firstJenis?.kategori ?? 'Ringan');
    setPlNama(firstJenis?.nama ?? '');
    setPlPoin(firstJenis?.poinDefault ?? 5);
    setPlSanksi(firstJenis?.sanksiDefault ?? '');
    setPlKeterangan('');
    setPlModalOpen(true);
  };

  const handleJenisChange = (id: string) => {
    setPlJenisId(id);
    const j = db.jenisPelanggaran.find((jp) => jp.id === id);
    if (j) {
      setPlKategori(j.kategori);
      setPlNama(j.nama);
      setPlPoin(j.poinDefault);
      setPlSanksi(j.sanksiDefault);
    }
  };

  const handleSubmitPelanggaran = (e: React.FormEvent) => {
    e.preventDefault();
    addPelanggaran({
      tanggal: plTanggal,
      penghuniId: plPenghuniId,
      jenisPelanggaranId: plJenisId,
      kategori: plKategori,
      namaPelanggaran: plNama.trim(),
      poin: Number(plPoin),
      sanksi: plSanksi.trim(),
      pencatat: currentUser?.nama ?? 'Pembina',
      keterangan: plKeterangan.trim(),
    });
    setPlModalOpen(false);
  };

  const openAddPembinaan = () => {
    const firstSantri = db.penghuni.find((p) => p.status !== 'Lulus');
    setPpPenghuniId(firstSantri?.id ?? '');
    setPpTipe('Prestasi');
    setPpTanggal(getTodayISO());
    setPpJudul('');
    setPpDeskripsi('');
    setPpPoinPengurang(10);
    setPpModalOpen(true);
  };

  const handleSubmitPembinaan = (e: React.FormEvent) => {
    e.preventDefault();
    addPembinaanPrestasi({
      tanggal: ppTanggal,
      penghuniId: ppPenghuniId,
      tipe: ppTipe,
      judul: ppJudul.trim(),
      deskripsi: ppDeskripsi.trim(),
      poinPengurang: Number(ppPoinPengurang),
      pencatat: currentUser?.nama ?? 'Pembina',
    });
    setPpModalOpen(false);
  };

  const handleSaveJenis = (e: React.FormEvent) => {
    e.preventDefault();
    saveJenisPelanggaran({
      nama: jpNama.trim(),
      kategori: jpKategori,
      poinDefault: Number(jpPoin),
      sanksiDefault: jpSanksi.trim(),
    });
    setJpModalOpen(false);
    setJpNama('');
    setJpSanksi('');
  };

  const safePagePl = Math.min(page, Math.max(1, Math.ceil(filteredPelanggaran.length / PAGE_SIZE)));
  const pagedPelanggaran = filteredPelanggaran.slice(
    (safePagePl - 1) * PAGE_SIZE,
    safePagePl * PAGE_SIZE
  );

  const safePageAk = Math.min(page, Math.max(1, Math.ceil(akumulasiList.length / PAGE_SIZE)));
  const pagedAkumulasi = akumulasiList.slice(
    (safePageAk - 1) * PAGE_SIZE,
    safePageAk * PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setTab('pelanggaran');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
                tab === 'pelanggaran' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Riwayat Pelanggaran
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('akumulasi');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
                tab === 'akumulasi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Akumulasi Poin & SP
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('prestasi');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
                tab === 'prestasi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pembinaan & Prestasi
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => setTab('master')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
                  tab === 'master' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Jenis Pelanggaran
              </button>
            )}
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openAddPembinaan}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg whitespace-nowrap"
              >
                <Award className="w-4 h-4" />
                <span>Catat Prestasi / Pembinaan</span>
              </button>
              <button
                type="button"
                onClick={openAddPelanggaran}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Pelanggaran</span>
              </button>
            </div>
          )}
        </div>

        {tab !== 'master' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari santri atau keterangan..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 min-h-[38px]"
              />
            </div>

            {tab === 'pelanggaran' && (
              <div className="flex items-center gap-1.5">
                {['Semua', 'Ringan', 'Sedang', 'Berat'].map((kat) => (
                  <button
                    key={kat}
                    type="button"
                    onClick={() => {
                      setFilterKategori(kat);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                      filterKategori === kat
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            )}

            {tab === 'akumulasi' && (
              <div className="text-xs text-slate-500">
                Ambang batas: Lisan ≥{db.pengaturan.ambangPeringatanLisan} · SP1 ≥{db.pengaturan.ambangSP1} · SP2 ≥{db.pengaturan.ambangSP2} · SP3 ≥{db.pengaturan.ambangSP3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: RIWAYAT PELANGGARAN */}
      {tab === 'pelanggaran' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-medium">Tanggal</th>
                  <th className="py-3 px-4 font-medium">Santri & Kamar</th>
                  <th className="py-3 px-4 font-medium">Kategori & Pelanggaran</th>
                  <th className="py-3 px-4 font-medium">Sanksi</th>
                  <th className="py-3 px-4 font-medium text-right">Poin</th>
                  {canDelete && <th className="py-3 px-4 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedPelanggaran.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                      Tidak ada data pelanggaran.
                    </td>
                  </tr>
                ) : (
                  pagedPelanggaran.map((pl) => {
                    const s = db.penghuni.find((p) => p.id === pl.penghuniId);
                    const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
                    const katTone =
                      pl.kategori === 'Berat'
                        ? 'red'
                        : pl.kategori === 'Sedang'
                        ? 'amber'
                        : 'slate';
                    return (
                      <tr key={pl.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                          {formatTanggal(pl.tanggal)}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => s && setProfileId(s.id)}
                            className="font-semibold text-slate-900 hover:text-teal-700 text-left"
                          >
                            {s?.nama ?? '-'}
                          </button>
                          <div className="text-xs text-slate-500">Kamar {k?.nomor ?? '-'}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusTag label={pl.kategori} tone={katTone} withIcon={false} />
                          </div>
                          <div className="text-slate-900 font-medium text-xs sm:text-sm">
                            {pl.namaPelanggaran}
                          </div>
                          {pl.keterangan && (
                            <div className="text-xs text-slate-500 mt-0.5">{pl.keterangan}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 max-w-xs">
                          <div>{pl.sanksi}</div>
                          <div className="text-slate-400 mt-0.5">Pencatat: {pl.pencatat}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-bold text-red-700 whitespace-nowrap">
                          +{pl.poin}
                        </td>
                        {canDelete && (
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: 'Hapus Catatan Pelanggaran',
                                  message: `Hapus pelanggaran "${pl.namaPelanggaran}" untuk ${s?.nama ?? ''}?`,
                                  onConfirm: () => deletePelanggaran(pl.id),
                                })
                              }
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={safePagePl}
            totalItems={filteredPelanggaran.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* TAB 2: AKUMULASI POIN & SP */}
      {tab === 'akumulasi' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-medium">Santri</th>
                  <th className="py-3 px-4 font-medium">Kamar</th>
                  <th className="py-3 px-4 font-medium text-right">Kasus</th>
                  <th className="py-3 px-4 font-medium text-right">Poin Pelanggaran</th>
                  <th className="py-3 px-4 font-medium text-right">Pengurangan</th>
                  <th className="py-3 px-4 font-medium text-right">Poin Bersih</th>
                  <th className="py-3 px-4 font-medium">Status Peringatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedAkumulasi.map(({ penghuni, kamar, poin, level, jumlahKasus }) => (
                  <tr key={penghuni.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setProfileId(penghuni.id)}
                        className="font-semibold text-slate-900 hover:text-teal-700 text-left"
                      >
                        {penghuni.nama}
                      </button>
                      <div className="text-xs text-slate-500">
                        NIS {penghuni.nis} · Kelas {penghuni.kelas}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{kamar?.nomor ?? '-'}</td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-700">
                      {jumlahKasus}x
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-red-700">
                      +{poin.totalPelanggaran}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-emerald-700">
                      -{poin.totalPengurang}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900">
                      {poin.poinBersih}
                    </td>
                    <td className="py-3 px-4">
                      <StatusTag
                        label={level.label}
                        tone={
                          level.tone === 'emerald'
                            ? 'emerald'
                            : level.tone === 'amber'
                            ? 'amber'
                            : level.tone === 'orange'
                            ? 'orange'
                            : 'red'
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={safePageAk}
            totalItems={akumulasiList.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* TAB 3: PEMBINAAN & PRESTASI */}
      {tab === 'prestasi' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPembinaan.length === 0 ? (
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              Belum ada catatan pembinaan atau prestasi.
            </div>
          ) : (
            filteredPembinaan.map((pp) => {
              const s = db.penghuni.find((p) => p.id === pp.penghuniId);
              return (
                <div
                  key={pp.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusTag
                          label={pp.tipe}
                          tone={pp.tipe === 'Prestasi' ? 'emerald' : 'blue'}
                        />
                        <span className="text-xs font-mono-num text-emerald-700 font-semibold">
                          -{pp.poinPengurang} poin pelanggaran
                        </span>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() =>
                            askConfirm({
                              title: 'Hapus Catatan',
                              message: `Hapus catatan "${pp.judul}"?`,
                              onConfirm: () => deletePembinaanPrestasi(pp.id),
                            })
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 mt-2">{pp.judul}</h4>
                    <p className="text-xs text-slate-600 mt-1">{pp.deskripsi}</p>
                  </div>
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => s && setProfileId(s.id)}
                      className="font-semibold text-teal-700 hover:underline"
                    >
                      {s?.nama ?? '-'}
                    </button>
                    <span>
                      {formatTanggal(pp.tanggal)} · {pp.pencatat}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: MASTER JENIS PELANGGARAN */}
      {tab === 'master' && canEdit && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldAlert className="w-4 h-4 text-teal-700" />
              <span>Daftar Master Jenis Pelanggaran & Poin</span>
            </div>
            <button
              type="button"
              onClick={() => setJpModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jenis</span>
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {db.jenisPelanggaran.map((jp) => (
              <div
                key={jp.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <StatusTag
                      label={jp.kategori}
                      tone={
                        jp.kategori === 'Berat'
                          ? 'red'
                          : jp.kategori === 'Sedang'
                          ? 'amber'
                          : 'slate'
                      }
                      withIcon={false}
                    />
                    <span className="font-semibold text-sm text-slate-900">{jp.nama}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Sanksi standar: {jp.sanksiDefault}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono-num text-sm font-bold text-red-700">
                    +{jp.poinDefault} poin
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: 'Hapus Jenis Pelanggaran',
                          message: `Hapus "${jp.nama}" dari daftar master?`,
                          onConfirm: () => deleteJenisPelanggaran(jp.id),
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Catat Pelanggaran */}
      <Modal
        open={plModalOpen}
        onClose={() => setPlModalOpen(false)}
        title="Catat Pelanggaran Santri"
        size="md"
      >
        <form onSubmit={handleSubmitPelanggaran} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Santri *</label>
              <select
                required
                value={plPenghuniId}
                onChange={(e) => setPlPenghuniId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal *</label>
              <input
                required
                type="date"
                value={plTanggal}
                onChange={(e) => setPlTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Template Jenis Pelanggaran
              </label>
              <select
                value={plJenisId}
                onChange={(e) => handleJenisChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                {db.jenisPelanggaran.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama} (+{j.poinDefault})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kategori *</label>
              <select
                value={plKategori}
                onChange={(e) => setPlKategori(e.target.value as KategoriPelanggaran)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Ringan">Ringan</option>
                <option value="Sedang">Sedang</option>
                <option value="Berat">Berat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Poin *</label>
              <input
                required
                type="number"
                min={1}
                max={200}
                value={plPoin}
                onChange={(e) => setPlPoin(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama / Deskripsi Pelanggaran *
              </label>
              <input
                required
                type="text"
                value={plNama}
                onChange={(e) => setPlNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Sanksi / Tindakan *</label>
              <input
                required
                type="text"
                value={plSanksi}
                onChange={(e) => setPlSanksi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Keterangan Tambahan</label>
              <input
                type="text"
                value={plKeterangan}
                onChange={(e) => setPlKeterangan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setPlModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Simpan Pelanggaran
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pembinaan & Prestasi */}
      <Modal
        open={ppModalOpen}
        onClose={() => setPpModalOpen(false)}
        title="Catat Pembinaan / Prestasi Santri"
        subtitle="Prestasi dan pembinaan baik dapat mengurangi akumulasi poin pelanggaran."
        size="md"
      >
        <form onSubmit={handleSubmitPembinaan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Santri *</label>
              <select
                required
                value={ppPenghuniId}
                onChange={(e) => setPpPenghuniId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Tipe *</label>
              <select
                value={ppTipe}
                onChange={(e) => setPpTipe(e.target.value as 'Prestasi' | 'Pembinaan')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Prestasi">Prestasi / Apresiasi</option>
                <option value="Pembinaan">Pembinaan Positif</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pengurangan Poin
              </label>
              <input
                required
                type="number"
                min={0}
                max={100}
                value={ppPoinPengurang}
                onChange={(e) => setPpPoinPengurang(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Judul *</label>
              <input
                required
                type="text"
                value={ppJudul}
                onChange={(e) => setPpJudul(e.target.value)}
                placeholder="Misal: Juara MTQ / Kamar Terbersih Bulan Ini"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi</label>
              <textarea
                rows={2}
                value={ppDeskripsi}
                onChange={(e) => setPpDeskripsi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setPpModalOpen(false)}
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

      {/* Modal Tambah Master Jenis Pelanggaran */}
      <Modal
        open={jpModalOpen}
        onClose={() => setJpModalOpen(false)}
        title="Tambah Jenis Pelanggaran"
        size="sm"
      >
        <form onSubmit={handleSaveJenis} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Pelanggaran *</label>
            <input
              required
              type="text"
              value={jpNama}
              onChange={(e) => setJpNama(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kategori *</label>
              <select
                value={jpKategori}
                onChange={(e) => setJpKategori(e.target.value as KategoriPelanggaran)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Ringan">Ringan</option>
                <option value="Sedang">Sedang</option>
                <option value="Berat">Berat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Poin Default *</label>
              <input
                required
                type="number"
                min={1}
                value={jpPoin}
                onChange={(e) => setJpPoin(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Sanksi Default *</label>
            <input
              required
              type="text"
              value={jpSanksi}
              onChange={(e) => setJpSanksi(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setJpModalOpen(false)}
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

      <PenghuniProfileModal penghuniId={profileId} onClose={() => setProfileId(null)} />
    </div>
  );
};
