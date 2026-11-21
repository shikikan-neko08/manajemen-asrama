import React, { useMemo, useState } from 'react';
import { Edit3, HeartPulse, Plus, Search, Trash2 } from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { Kesehatan, StatusKesehatan } from '../../types/dorm';
import { formatTanggal, getTodayISO } from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Modal } from '../ui/Modal';

export const KesehatanPage: React.FC = () => {
  const { db, currentUser, activeRole, saveKesehatan, deleteKesehatan, askConfirm } = useDorm();
  const isWali = activeRole.scopeMode === 'anak_terkait';
  const canEdit = activeRole.capabilities.canCreateEdit;
  const canDelete = activeRole.capabilities.canDelete;

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Kesehatan | null>(null);

  const [tanggal, setTanggal] = useState(getTodayISO());
  const [penghuniId, setPenghuniId] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [tindakan, setTindakan] = useState('');
  const [status, setStatus] = useState<StatusKesehatan>('Istirahat di Asrama');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.kesehatan
      .filter((ks) => {
        if (isWali && !currentUser?.penghuniIds?.includes(ks.penghuniId)) return false;
        if (q) {
          const s = db.penghuni.find((p) => p.id === ks.penghuniId);
          return (
            s?.nama.toLowerCase().includes(q) ||
            ks.keluhan.toLowerCase().includes(q) ||
            ks.tindakan.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [db.kesehatan, db.penghuni, isWali, currentUser, search]);

  const openAdd = () => {
    setEditTarget(null);
    setTanggal(getTodayISO());
    setPenghuniId(db.penghuni.find((p) => p.status !== 'Lulus')?.id ?? '');
    setKeluhan('');
    setTindakan('');
    setStatus('Istirahat di Asrama');
    setModalOpen(true);
  };

  const openEdit = (ks: Kesehatan) => {
    setEditTarget(ks);
    setTanggal(ks.tanggal);
    setPenghuniId(ks.penghuniId);
    setKeluhan(ks.keluhan);
    setTindakan(ks.tindakan);
    setStatus(ks.status);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveKesehatan(
      {
        tanggal,
        penghuniId,
        keluhan: keluhan.trim(),
        tindakan: tindakan.trim(),
        status,
        dicatatOleh: currentUser?.nama ?? 'Pembina',
      },
      editTarget?.id
    );
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama santri atau keluhan..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg min-h-[38px]"
          />
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Santri Sakit</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            Tidak ada catatan kesehatan santri.
          </div>
        ) : (
          list.map((ks) => {
            const s = db.penghuni.find((p) => p.id === ks.penghuniId);
            const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
            const tone =
              ks.status === 'Sembuh'
                ? 'emerald'
                : ks.status === 'Dirujuk / Pulang'
                ? 'red'
                : 'amber';
            return (
              <div
                key={ks.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">{s?.nama ?? '-'}</div>
                        <div className="text-xs text-slate-500">
                          Kamar {k?.nomor ?? '-'} · {formatTanggal(ks.tanggal)}
                        </div>
                      </div>
                    </div>
                    <StatusTag label={ks.status} tone={tone} />
                  </div>
                  <div className="mt-3 text-sm text-slate-800">
                    <span className="font-medium">Keluhan:</span> {ks.keluhan}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    <span className="font-medium">Tindakan:</span> {ks.tindakan}
                  </div>
                </div>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Pencatat: {ks.dicatatOleh}</span>
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(ks)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 rounded-lg"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() =>
                            askConfirm({
                              title: 'Hapus Catatan Kesehatan',
                              message: `Hapus catatan kesehatan untuk ${s?.nama ?? ''}?`,
                              onConfirm: () => deleteKesehatan(ks.id),
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Perbarui Catatan Kesehatan' : 'Catat Santri Sakit / Pemantauan'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Santri *</label>
              <select
                required
                value={penghuniId}
                onChange={(e) => setPenghuniId(e.target.value)}
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal *</label>
              <input
                required
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusKesehatan)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Istirahat di Asrama">Istirahat di Asrama</option>
                <option value="Dirawat di UKS">Dirawat di UKS</option>
                <option value="Dirujuk / Pulang">Dirujuk / Pulang</option>
                <option value="Sembuh">Sembuh</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Keluhan *</label>
              <input
                required
                type="text"
                value={keluhan}
                onChange={(e) => setKeluhan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tindakan / Obat *
              </label>
              <textarea
                required
                rows={2}
                value={tindakan}
                onChange={(e) => setTindakan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
