import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock, Megaphone, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { Kegiatan } from '../../types/dorm';
import { formatTanggal, getTodayISO } from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';

export const KegiatanPage: React.FC = () => {
  const {
    db,
    currentUser,
    activeRole,
    saveKegiatan,
    deleteKegiatan,
    saveJadwalPiket,
    deleteJadwalPiket,
    savePengumuman,
    deletePengumuman,
    askConfirm,
  } = useDorm();

  const canEdit = activeRole.capabilities.canCreateEdit;
  const canDelete = activeRole.capabilities.canDelete;
  const isWali = activeRole.scopeMode === 'anak_terkait';

  const [tab, setTab] = useState<'pengumuman' | 'harian' | 'piket'>('pengumuman');

  // Pengumuman Modal
  const [pgOpen, setPgOpen] = useState(false);
  const [pgJudul, setPgJudul] = useState('');
  const [pgIsi, setPgIsi] = useState('');
  const [pgTarget, setPgTarget] = useState<'Semua' | 'Pembina' | 'Wali Santri'>('Semua');
  const [pgPenting, setPgPenting] = useState(false);

  // Kegiatan Modal
  const [kgOpen, setKgOpen] = useState(false);
  const [kgMulai, setKgMulai] = useState('04:30');
  const [kgSelesai, setKgSelesai] = useState('05:30');
  const [kgNama, setKgNama] = useState('');
  const [kgKategori, setKgKategori] = useState<Kegiatan['kategori']>('Ibadah');
  const [kgHari, setKgHari] = useState('Setiap Hari');
  const [kgPJ, setKgPJ] = useState('Musyrif Asrama');

  // Piket Modal
  const [pkOpen, setPkOpen] = useState(false);
  const [pkKamarId, setPkKamarId] = useState(db.kamar[0]?.id ?? '');
  const [pkHari, setPkHari] = useState('Senin');
  const [pkArea, setPkArea] = useState('');
  const [pkKoord, setPkKoord] = useState('');

  const visiblePengumuman = useMemo(() => {
    return db.pengumuman.filter((pg) => {
      if (isWali) return pg.target === 'Semua' || pg.target === 'Wali Santri';
      return true;
    });
  }, [db.pengumuman, isWali]);

  const handleSavePg = (e: React.FormEvent) => {
    e.preventDefault();
    savePengumuman({
      tanggal: getTodayISO(),
      judul: pgJudul.trim(),
      isi: pgIsi.trim(),
      pembuat: currentUser?.nama ?? 'Pembina',
      target: pgTarget,
      penting: pgPenting,
    });
    setPgOpen(false);
    setPgJudul('');
    setPgIsi('');
    setPgPenting(false);
  };

  const handleSaveKg = (e: React.FormEvent) => {
    e.preventDefault();
    saveKegiatan({
      waktuMulai: kgMulai,
      waktuSelesai: kgSelesai,
      nama: kgNama.trim(),
      kategori: kgKategori,
      hari: kgHari.trim(),
      penanggungJawab: kgPJ.trim(),
    });
    setKgOpen(false);
    setKgNama('');
  };

  const handleSavePk = (e: React.FormEvent) => {
    e.preventDefault();
    saveJadwalPiket({
      kamarId: pkKamarId,
      hari: pkHari,
      areaTugas: pkArea.trim(),
      koordinator: pkKoord.trim(),
    });
    setPkOpen(false);
    setPkArea('');
    setPkKoord('');
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('pengumuman')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'pengumuman' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Pengumuman ({visiblePengumuman.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('harian')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'harian' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Jadwal Harian ({db.kegiatan.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('piket')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap ${
              tab === 'piket' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Jadwal Piket Kamar ({db.jadwalPiket.length})
          </button>
        </div>

        {canEdit && (
          <div>
            {tab === 'pengumuman' && (
              <button
                type="button"
                onClick={() => setPgOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Pengumuman</span>
              </button>
            )}
            {tab === 'harian' && (
              <button
                type="button"
                onClick={() => setKgOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kegiatan</span>
              </button>
            )}
            {tab === 'piket' && (
              <button
                type="button"
                onClick={() => setPkOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal Piket</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: PENGUMUMAN */}
      {tab === 'pengumuman' && (
        <div className="space-y-3">
          {visiblePengumuman.map((pg) => (
            <div
              key={pg.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Megaphone className="w-4 h-4 text-teal-700 shrink-0" />
                    <h3 className="text-base font-bold text-slate-900">{pg.judul}</h3>
                    {pg.penting && <StatusTag label="Penting" tone="red" />}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatTanggal(pg.tanggal)} · Oleh {pg.pembuat} · Target: {pg.target}
                  </div>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() =>
                      askConfirm({
                        title: 'Hapus Pengumuman',
                        message: `Hapus pengumuman "${pg.judul}"?`,
                        onConfirm: () => deletePengumuman(pg.id),
                      })
                    }
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{pg.isi}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: JADWAL KEGIATAN HARIAN */}
      {tab === 'harian' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {db.kegiatan.map((kg) => {
              const tone =
                kg.kategori === 'Ibadah'
                  ? 'emerald'
                  : kg.kategori === 'Akademik'
                  ? 'blue'
                  : kg.kategori === 'Kebersihan'
                  ? 'amber'
                  : 'slate';
              return (
                <div
                  key={kg.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="flex items-center gap-1.5 font-mono-num text-sm font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {kg.waktuMulai} – {kg.waktuSelesai}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm sm:text-base">
                          {kg.nama}
                        </span>
                        <StatusTag label={kg.kategori} tone={tone} withIcon={false} />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {kg.hari} · PJ: {kg.penanggungJawab}
                      </div>
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: 'Hapus Jadwal Kegiatan',
                          message: `Hapus kegiatan "${kg.nama}"?`,
                          onConfirm: () => deleteKegiatan(kg.id),
                        })
                      }
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg self-end sm:self-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: JADWAL PIKET KAMAR */}
      {tab === 'piket' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {db.jadwalPiket.map((pk) => {
            const k = db.kamar.find((km) => km.id === pk.kamarId);
            const g = k ? db.gedung.find((gd) => gd.id === k.gedungId) : undefined;
            return (
              <div
                key={pk.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {pk.hari}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() =>
                          askConfirm({
                            title: 'Hapus Jadwal Piket',
                            message: `Hapus jadwal piket hari ${pk.hari} untuk Kamar ${k?.nomor ?? ''}?`,
                            onConfirm: () => deleteJadwalPiket(pk.id),
                          })
                        }
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 mt-3">
                    Kamar {k?.nomor ?? '-'} · {g?.nama ?? '-'}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{pk.areaTugas}</span>
                  </p>
                </div>
                <div className="pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                  Koordinator: <span className="font-medium text-slate-800">{pk.koordinator}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <Modal open={pgOpen} onClose={() => setPgOpen(false)} title="Buat Pengumuman Baru" size="md">
        <form onSubmit={handleSavePg} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Judul *</label>
            <input
              required
              type="text"
              value={pgJudul}
              onChange={(e) => setPgJudul(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Target Pembaca</label>
            <select
              value={pgTarget}
              onChange={(e) => setPgTarget(e.target.value as 'Semua' | 'Pembina' | 'Wali Santri')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="Semua">Semua (Pembina, Petugas & Wali Santri)</option>
              <option value="Wali Santri">Khusus Wali Santri</option>
              <option value="Pembina">Internal Pembina & Petugas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Isi Pengumuman *</label>
            <textarea
              required
              rows={3}
              value={pgIsi}
              onChange={(e) => setPgIsi(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={pgPenting}
              onChange={(e) => setPgPenting(e.target.checked)}
              className="rounded border-slate-300 text-teal-700"
            />
            <span>Tandai sebagai Pengumuman Penting</span>
          </label>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setPgOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Terbitkan
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={kgOpen} onClose={() => setKgOpen(false)} title="Tambah Jadwal Kegiatan" size="md">
        <form onSubmit={handleSaveKg} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Waktu Mulai *</label>
              <input
                required
                type="time"
                value={kgMulai}
                onChange={(e) => setKgMulai(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Waktu Selesai *</label>
              <input
                required
                type="time"
                value={kgSelesai}
                onChange={(e) => setKgSelesai(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Kegiatan *</label>
            <input
              required
              type="text"
              value={kgNama}
              onChange={(e) => setKgNama(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
              <select
                value={kgKategori}
                onChange={(e) => setKgKategori(e.target.value as Kegiatan['kategori'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Ibadah">Ibadah</option>
                <option value="Akademik">Akademik</option>
                <option value="Kebersihan">Kebersihan</option>
                <option value="Istirahat">Istirahat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Hari</label>
              <input
                required
                type="text"
                value={kgHari}
                onChange={(e) => setKgHari(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Penanggung Jawab</label>
            <input
              required
              type="text"
              value={kgPJ}
              onChange={(e) => setKgPJ(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setKgOpen(false)}
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

      <Modal open={pkOpen} onClose={() => setPkOpen(false)} title="Tambah Jadwal Piket Kamar" size="sm">
        <form onSubmit={handleSavePk} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Hari *</label>
            <select
              value={pkHari}
              onChange={(e) => setPkHari(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'].map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Kamar Bertugas *</label>
            <select
              required
              value={pkKamarId}
              onChange={(e) => setPkKamarId(e.target.value)}
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
            <label className="block text-xs font-medium text-slate-700 mb-1">Area Tugas *</label>
            <input
              required
              type="text"
              value={pkArea}
              onChange={(e) => setPkArea(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Koordinator *</label>
            <input
              required
              type="text"
              value={pkKoord}
              onChange={(e) => setPkKoord(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setPkOpen(false)}
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
    </div>
  );
};
