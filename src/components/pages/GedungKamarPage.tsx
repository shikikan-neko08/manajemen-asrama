import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BedDouble,
  Building2,
  Edit3,
  History,
  Plus,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { Gedung, JenisKelamin, Kamar, KondisiKamar } from '../../types/dorm';
import { formatTanggal } from '../../utils/formatters';
import { Modal } from '../ui/Modal';
import { StatusTag } from '../ui/StatusTag';
import { PenghuniProfileModal } from '../PenghuniProfileModal';

export const GedungKamarPage: React.FC = () => {
  const {
    db,
    activeRole,
    getKamarOccupancy,
    saveGedung,
    deleteGedung,
    saveKamar,
    deleteKamar,
    pindahKamar,
    askConfirm,
  } = useDorm();

  const canEdit = activeRole.capabilities.canCreateEdit;
  const canDelete = activeRole.capabilities.canDelete;

  const [activeTab, setActiveTab] = useState<'denah' | 'gedung' | 'riwayat'>('denah');
  const [selectedGedungId, setSelectedGedungId] = useState<string>('Semua');

  // Room detail modal
  const [detailKamarId, setDetailKamarId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Move resident from room detail
  const [movePenghuniId, setMovePenghuniId] = useState<string>('');
  const [moveTargetKamarId, setMoveTargetKamarId] = useState<string>('');
  const [moveAlasan, setMoveAlasan] = useState<string>('');

  // Gedung Modal
  const [gedungModalOpen, setGedungModalOpen] = useState(false);
  const [editGedung, setEditGedung] = useState<Gedung | null>(null);
  const [gNama, setGNama] = useState('');
  const [gJenis, setGJenis] = useState<JenisKelamin>('Putra');
  const [gPembinaId, setGPembinaId] = useState('');
  const [gDeskripsi, setGDeskripsi] = useState('');

  // Kamar Modal
  const [kamarModalOpen, setKamarModalOpen] = useState(false);
  const [editKamar, setEditKamar] = useState<Kamar | null>(null);
  const [kGedungId, setKGedungId] = useState('');
  const [kNomor, setKNomor] = useState('');
  const [kLantai, setKLantai] = useState(1);
  const [kKapasitas, setKKapasitas] = useState(4);
  const [kFasilitasText, setKFasilitasText] = useState('');
  const [kKondisi, setKKondisi] = useState<KondisiKamar>('Baik');

  const pembinaOptions = db.pengguna.filter(
    (u) => u.peran === 'Pembina' || u.peran === 'Admin'
  );

  const visibleGedung = useMemo(() => {
    if (selectedGedungId === 'Semua') return db.gedung;
    return db.gedung.filter((g) => g.id === selectedGedungId);
  }, [db.gedung, selectedGedungId]);

  const detailKamar = db.kamar.find((k) => k.id === detailKamarId) ?? null;
  const detailGedung = detailKamar
    ? db.gedung.find((g) => g.id === detailKamar.gedungId) ?? null
    : null;
  const detailResidents = detailKamar
    ? db.penghuni.filter((p) => p.kamarId === detailKamar.id && p.status !== 'Lulus')
    : [];

  const getRoomVisualState = (k: Kamar) => {
    if (k.kondisi === 'Dalam Perbaikan') {
      return {
        label: 'Dalam Perbaikan',
        cardClass: 'bg-red-50/70 border-red-300 hover:border-red-400',
        tone: 'red' as const,
        occ: getKamarOccupancy(k.id),
      };
    }
    const occ = getKamarOccupancy(k.id);
    if (occ === 0) {
      return {
        label: 'Kosong',
        cardClass: 'bg-white border-slate-200 hover:border-teal-600',
        tone: 'slate' as const,
        occ,
      };
    }
    if (occ >= k.kapasitas) {
      return {
        label: 'Penuh',
        cardClass: 'bg-amber-50/60 border-amber-300 hover:border-amber-400',
        tone: 'amber' as const,
        occ,
      };
    }
    return {
      label: 'Terisi Sebagian',
      cardClass: 'bg-emerald-50/50 border-emerald-200 hover:border-teal-600',
      tone: 'emerald' as const,
      occ,
    };
  };

  const openAddGedung = () => {
    setEditGedung(null);
    setGNama('');
    setGJenis('Putra');
    setGPembinaId(pembinaOptions[0]?.id ?? '');
    setGDeskripsi('');
    setGedungModalOpen(true);
  };

  const openEditGedung = (g: Gedung) => {
    setEditGedung(g);
    setGNama(g.nama);
    setGJenis(g.jenis);
    setGPembinaId(g.pembinaId);
    setGDeskripsi(g.deskripsi);
    setGedungModalOpen(true);
  };

  const handleSaveGedung = (e: React.FormEvent) => {
    e.preventDefault();
    const res = saveGedung(
      {
        nama: gNama.trim(),
        jenis: gJenis,
        pembinaId: gPembinaId,
        deskripsi: gDeskripsi.trim(),
      },
      editGedung?.id
    );
    if (res.ok) setGedungModalOpen(false);
  };

  const openAddKamar = (defaultGedungId?: string) => {
    setEditKamar(null);
    setKGedungId(defaultGedungId || db.gedung[0]?.id || '');
    setKNomor('');
    setKLantai(1);
    setKKapasitas(4);
    setKFasilitasText('4 Dipan, 4 Lemari, Kipas Angin');
    setKKondisi('Baik');
    setKamarModalOpen(true);
  };

  const openEditKamar = (k: Kamar) => {
    setEditKamar(k);
    setKGedungId(k.gedungId);
    setKNomor(k.nomor);
    setKLantai(k.lantai);
    setKKapasitas(k.kapasitas);
    setKFasilitasText(k.fasilitas.join(', '));
    setKKondisi(k.kondisi);
    setKamarModalOpen(true);
  };

  const handleSaveKamar = (e: React.FormEvent) => {
    e.preventDefault();
    const fasilitas = kFasilitasText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const res = saveKamar(
      {
        gedungId: kGedungId,
        nomor: kNomor.trim(),
        lantai: Number(kLantai),
        kapasitas: Number(kKapasitas),
        fasilitas,
        kondisi: kKondisi,
      },
      editKamar?.id
    );
    if (res.ok) setKamarModalOpen(false);
  };

  const handlePlaceOrMoveResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailKamar || !movePenghuniId) return;
    const res = pindahKamar(movePenghuniId, detailKamar.id, moveAlasan || 'Penempatan dari denah kamar');
    if (res.ok) {
      setMovePenghuniId('');
      setMoveAlasan('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation & Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('denah')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'denah'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Denah & Kamar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gedung')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'gedung'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Gedung ({db.gedung.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'riwayat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat Pindah ({db.penempatan.length})
          </button>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAddGedung}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap min-h-[38px]"
            >
              <Building2 className="w-4 h-4" />
              <span>Tambah Gedung</span>
            </button>
            <button
              type="button"
              onClick={() => openAddKamar()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kamar</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Denah Kamar */}
      {activeTab === 'denah' && (
        <div className="space-y-5">
          {/* Building Filter + Legend */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedGedungId('Semua')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedGedungId === 'Semua'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua Gedung
              </button>
              {db.gedung.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGedungId(g.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    selectedGedungId === g.id
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {g.nama} ({g.jenis})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs border border-slate-300 bg-white inline-block" />
                Kosong
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs border border-emerald-300 bg-emerald-100 inline-block" />
                Terisi Sebagian
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs border border-amber-300 bg-amber-100 inline-block" />
                Penuh
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs border border-red-300 bg-red-100 inline-block" />
                Dalam Perbaikan
              </span>
            </div>
          </div>

          {/* Denah per Gedung */}
          {visibleGedung.map((g) => {
            const rooms = db.kamar.filter((k) => k.gedungId === g.id);
            const pembina = db.pengguna.find((u) => u.id === g.pembinaId);
            const floors = Array.from(new Set(rooms.map((r) => r.lantai))).sort((a, b) => a - b);

            return (
              <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">{g.nama}</h3>
                      <StatusTag
                        label={`Asrama ${g.jenis}`}
                        tone={g.jenis === 'Putra' ? 'blue' : 'emerald'}
                        withIcon={false}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Pembina: {pembina?.nama ?? '-'} · {g.deskripsi}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openAddKamar(g.id)}
                      className="text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap self-start sm:self-auto"
                    >
                      + Tambah Kamar di {g.nama}
                    </button>
                  )}
                </div>

                {floors.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada kamar terdaftar di gedung ini.</p>
                ) : (
                  <div className="space-y-5">
                    {floors.map((lantai) => {
                      const floorRooms = rooms
                        .filter((r) => r.lantai === lantai)
                        .sort((a, b) => a.nomor.localeCompare(b.nomor));
                      return (
                        <div key={lantai} className="space-y-2.5">
                          <div className="text-xs font-semibold text-slate-500 tracking-wide">
                            Lantai {lantai}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                            {floorRooms.map((k) => {
                              const vis = getRoomVisualState(k);
                              const residents = db.penghuni.filter(
                                (p) => p.kamarId === k.id && p.status !== 'Lulus'
                              );
                              return (
                                <button
                                  key={k.id}
                                  type="button"
                                  onClick={() => {
                                    setDetailKamarId(k.id);
                                    setMovePenghuniId('');
                                    setMoveTargetKamarId('');
                                  }}
                                  className={`text-left border rounded-xl p-3.5 transition-all flex flex-col justify-between gap-3 min-h-[124px] ${vis.cardClass}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="font-bold text-slate-900 font-mono-num">
                                        {k.nomor}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-0.5 font-mono-num">
                                        {vis.occ}/{k.kapasitas} penghuni
                                      </div>
                                    </div>
                                    <StatusTag label={vis.label} tone={vis.tone} withIcon={false} />
                                  </div>

                                  <div className="space-y-1">
                                    {residents.length === 0 ? (
                                      <div className="text-xs text-slate-400 italic">
                                        {k.kondisi === 'Dalam Perbaikan'
                                          ? 'Sedang perbaikan'
                                          : 'Belum ada penghuni'}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                                        {residents.map((r) => r.nama.split(' ')[0]).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Kelola Gedung */}
      {activeTab === 'gedung' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {db.gedung.map((g) => {
            const rooms = db.kamar.filter((k) => k.gedungId === g.id);
            const kap = rooms.reduce((a, b) => a + b.kapasitas, 0);
            const occ = rooms.reduce((a, b) => a + getKamarOccupancy(b.id), 0);
            const pembina = db.pengguna.find((u) => u.id === g.pembinaId);
            return (
              <div
                key={g.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900">{g.nama}</h3>
                    <StatusTag
                      label={g.jenis}
                      tone={g.jenis === 'Putra' ? 'blue' : 'emerald'}
                      withIcon={false}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{g.deskripsi}</p>

                  <dl className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Pembina</dt>
                      <dd className="font-medium text-slate-900">{pembina?.nama ?? '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Jumlah Kamar</dt>
                      <dd className="font-mono-num font-semibold text-slate-900">
                        {rooms.length} kamar
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Hunian Saat Ini</dt>
                      <dd className="font-mono-num font-semibold text-slate-900">
                        {occ} / {kap} santri
                      </dd>
                    </div>
                  </dl>
                </div>

                {(canEdit || canDelete) && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEditGedung(g)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Ubah</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() =>
                          askConfirm({
                            title: 'Hapus Gedung',
                            message: `Yakin ingin menghapus ${g.nama}? Gedung hanya dapat dihapus jika tidak memiliki kamar.`,
                            onConfirm: () => deleteGedung(g.id),
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Riwayat Perpindahan */}
      {activeTab === 'riwayat' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <History className="w-4 h-4 text-teal-700" />
            <span>Riwayat Penempatan & Perpindahan Kamar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Tanggal</th>
                  <th className="py-2.5 px-4 font-medium">Nama Santri</th>
                  <th className="py-2.5 px-4 font-medium">Dari Kamar</th>
                  <th className="py-2.5 px-4 font-medium">Ke Kamar</th>
                  <th className="py-2.5 px-4 font-medium">Alasan</th>
                  <th className="py-2.5 px-4 font-medium">Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.penempatan.map((pm) => {
                  const s = db.penghuni.find((p) => p.id === pm.penghuniId);
                  const dari = db.kamar.find((k) => k.id === pm.dariKamarId);
                  const ke = db.kamar.find((k) => k.id === pm.keKamarId);
                  return (
                    <tr key={pm.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                        {formatTanggal(pm.tanggal)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {s ? (
                          <button
                            type="button"
                            onClick={() => setProfileId(s.id)}
                            className="hover:text-teal-700 text-left"
                          >
                            {s.nama}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {dari ? dari.nomor : 'Penempatan Awal'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-teal-700">
                        {ke?.nomor ?? '-'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{pm.alasan}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-500">{pm.dicatatOleh}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Kamar Modal */}
      <Modal
        open={Boolean(detailKamar)}
        onClose={() => setDetailKamarId(null)}
        title={detailKamar ? `Kamar ${detailKamar.nomor} — ${detailGedung?.nama ?? ''}` : ''}
        subtitle={
          detailKamar
            ? `Lantai ${detailKamar.lantai} · Kapasitas ${detailResidents.length}/${detailKamar.kapasitas} · Kondisi: ${detailKamar.kondisi}`
            : ''
        }
        size="lg"
      >
        {detailKamar && detailGedung && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <div className="text-xs font-medium text-slate-500">Fasilitas Kamar</div>
                <div className="text-sm text-slate-800 mt-1">
                  {detailKamar.fasilitas.length > 0
                    ? detailKamar.fasilitas.join(' · ')
                    : 'Belum ada daftar fasilitas'}
                </div>
              </div>
              {(canEdit || canDelete) && (
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailKamarId(null);
                        openEditKamar(detailKamar);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Edit / Ubah Kondisi</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: 'Hapus Kamar',
                          message: `Yakin ingin menghapus Kamar ${detailKamar.nomor}?`,
                          onConfirm: () => {
                            const res = deleteKamar(detailKamar.id);
                            if (res.ok) setDetailKamarId(null);
                          },
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Daftar Penghuni di Kamar */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2.5">
                <Users className="w-4 h-4 text-teal-700" />
                <span>Daftar Penghuni ({detailResidents.length}/{detailKamar.kapasitas})</span>
              </div>
              {detailResidents.length === 0 ? (
                <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl p-4 text-center">
                  Belum ada penghuni di kamar ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {detailResidents.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => setProfileId(r.id)}
                          className="font-semibold text-sm text-slate-900 hover:text-teal-700 text-left"
                        >
                          {r.nama}
                        </button>
                        <div className="text-xs text-slate-500 font-mono-num">
                          NIS {r.nis} · Kelas {r.kelas}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusTag
                          label={r.status}
                          tone={r.status === 'Aktif' ? 'emerald' : r.status === 'Izin' ? 'blue' : 'amber'}
                        />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setMoveTargetKamarId(r.id);
                            }}
                            className="text-xs font-medium text-teal-700 hover:underline px-2 py-1"
                          >
                            Pindahkan →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Place Resident into THIS Room */}
            {canEdit &&
              detailKamar.kondisi === 'Baik' &&
              detailResidents.length < detailKamar.kapasitas && (
                <form
                  onSubmit={handlePlaceOrMoveResident}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ArrowLeftRight className="w-4 h-4 text-teal-700" />
                    <span>Tempatkan / Pindahkan Santri ke Kamar {detailKamar.nomor}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      required
                      value={movePenghuniId}
                      onChange={(e) => setMovePenghuniId(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
                    >
                      <option value="">-- Pilih Santri ({detailGedung.jenis}) --</option>
                      {db.penghuni
                        .filter(
                          (p) =>
                            p.status !== 'Lulus' &&
                            p.jenisKelamin === detailGedung.jenis &&
                            p.kamarId !== detailKamar.id
                        )
                        .map((p) => {
                          const curRoom = db.kamar.find((k) => k.id === p.kamarId);
                          return (
                            <option key={p.id} value={p.id}>
                              {p.nama} (Saat ini: {curRoom?.nomor ?? '-'})
                            </option>
                          );
                        })}
                    </select>
                    <input
                      type="text"
                      value={moveAlasan}
                      onChange={(e) => setMoveAlasan(e.target.value)}
                      placeholder="Alasan penempatan / perpindahan..."
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                    >
                      Tempatkan ke Kamar {detailKamar.nomor}
                    </button>
                  </div>
                </form>
              )}

            {/* Quick move resident OUT if clicked "Pindahkan" */}
            {moveTargetKamarId && (
              <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    Pindahkan {db.penghuni.find((p) => p.id === moveTargetKamarId)?.nama} ke kamar lain
                  </span>
                  <button
                    type="button"
                    onClick={() => setMoveTargetKamarId('')}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Tutup
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {db.kamar
                    .filter((k) => {
                      const g = db.gedung.find((gd) => gd.id === k.gedungId);
                      return (
                        k.id !== detailKamar.id &&
                        g?.jenis === detailGedung.jenis &&
                        k.kondisi === 'Baik' &&
                        getKamarOccupancy(k.id) < k.kapasitas
                      );
                    })
                    .map((k) => {
                      const occ = getKamarOccupancy(k.id);
                      const g = db.gedung.find((gd) => gd.id === k.gedungId);
                      return (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => {
                            const res = pindahKamar(
                              moveTargetKamarId,
                              k.id,
                              `Dipindahkan dari kamar ${detailKamar.nomor}`
                            );
                            if (res.ok) setMoveTargetKamarId('');
                          }}
                          className="text-left px-3 py-2 text-xs bg-white border border-slate-200 hover:border-teal-600 rounded-lg"
                        >
                          <div className="font-semibold text-slate-900">
                            Kamar {k.nomor} ({occ}/{k.kapasitas})
                          </div>
                          <div className="text-slate-500">{g?.nama}</div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Tambah/Edit Gedung */}
      <Modal
        open={gedungModalOpen}
        onClose={() => setGedungModalOpen(false)}
        title={editGedung ? `Edit Gedung: ${editGedung.nama}` : 'Tambah Gedung Asrama'}
        size="md"
      >
        <form onSubmit={handleSaveGedung} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Gedung *</label>
            <input
              required
              type="text"
              value={gNama}
              onChange={(e) => setGNama(e.target.value)}
              placeholder="Contoh: Asrama Al-Ikhlas"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Peruntukan *</label>
              <select
                value={gJenis}
                onChange={(e) => setGJenis(e.target.value as JenisKelamin)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Pembina / Musyrif *</label>
              <select
                required
                value={gPembinaId}
                onChange={(e) => setGPembinaId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                {pembinaOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi</label>
            <textarea
              rows={2}
              value={gDeskripsi}
              onChange={(e) => setGDeskripsi(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setGedungModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Simpan Gedung
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah/Edit Kamar */}
      <Modal
        open={kamarModalOpen}
        onClose={() => setKamarModalOpen(false)}
        title={editKamar ? `Edit Kamar ${editKamar.nomor}` : 'Tambah Kamar Baru'}
        size="md"
      >
        <form onSubmit={handleSaveKamar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Gedung *</label>
              <select
                required
                value={kGedungId}
                onChange={(e) => setKGedungId(e.target.value)}
                disabled={Boolean(editKamar)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 focus:outline-none focus:border-teal-600"
              >
                {db.gedung.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} ({g.jenis})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nomor Kamar *</label>
              <input
                required
                type="text"
                value={kNomor}
                onChange={(e) => setKNomor(e.target.value)}
                placeholder="Misal: F-203"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Lantai *</label>
              <input
                required
                type="number"
                min={1}
                max={10}
                value={kLantai}
                onChange={(e) => setKLantai(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kapasitas *</label>
              <input
                required
                type="number"
                min={1}
                max={20}
                value={kKapasitas}
                onChange={(e) => setKKapasitas(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kondisi Kamar *</label>
              <select
                value={kKondisi}
                onChange={(e) => setKKondisi(e.target.value as KondisiKamar)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="Baik">Baik</option>
                <option value="Dalam Perbaikan">Dalam Perbaikan</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fasilitas (pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={kFasilitasText}
                onChange={(e) => setKFasilitasText(e.target.value)}
                placeholder="4 Dipan, 4 Lemari, Kipas Angin"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setKamarModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Simpan Kamar
            </button>
          </div>
        </form>
      </Modal>

      <PenghuniProfileModal penghuniId={profileId} onClose={() => setProfileId(null)} />
    </div>
  );
};
