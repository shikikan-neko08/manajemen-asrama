import React, { useState } from 'react';
import {
  Award,
  BedDouble,
  CalendarCheck,
  CreditCard,
  FileText,
  HeartPulse,
  Phone,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useDorm } from '../context/DormContext';
import { Modal } from './ui/Modal';
import { StatusTag } from './ui/StatusTag';
import {
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
  getLevelPeringatan,
  getStatusIzinEfektif,
} from '../utils/formatters';

interface PenghuniProfileModalProps {
  penghuniId: string | null;
  onClose: () => void;
}

export const PenghuniProfileModal: React.FC<PenghuniProfileModalProps> = ({
  penghuniId,
  onClose,
}) => {
  const { db, getPenghuniPoin } = useDorm();
  const [tab, setTab] = useState<
    'ringkasan' | 'absensi' | 'izin' | 'pelanggaran' | 'tagihan'
  >('ringkasan');

  const penghuni = db.penghuni.find((p) => p.id === penghuniId);
  if (!penghuni) return null;

  const kamar = db.kamar.find((k) => k.id === penghuni.kamarId);
  const gedung = kamar ? db.gedung.find((g) => g.id === kamar.gedungId) : undefined;
  const poin = getPenghuniPoin(penghuni.id);
  const level = getLevelPeringatan(poin.poinBersih, db.pengaturan);

  const riwayatPenempatan = db.penempatan
    .filter((pm) => pm.penghuniId === penghuni.id)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const riwayatIzin = db.perizinan
    .filter((iz) => iz.penghuniId === penghuni.id)
    .sort((a, b) => b.tanggalKeluar.localeCompare(a.tanggalKeluar));
  const riwayatAbsensi = db.absensi
    .filter((ab) => ab.penghuniId === penghuni.id)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const riwayatPelanggaran = db.pelanggaran
    .filter((pl) => pl.penghuniId === penghuni.id)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const riwayatPembinaan = db.pembinaanPrestasi
    .filter((pp) => pp.penghuniId === penghuni.id)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const riwayatKesehatan = db.kesehatan
    .filter((ks) => ks.penghuniId === penghuni.id)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const riwayatTagihan = db.tagihan.filter((tg) => tg.penghuniId === penghuni.id);

  const absHadir = riwayatAbsensi.filter((a) => a.status === 'Hadir').length;
  const absTotal = riwayatAbsensi.length;
  const absPersen = absTotal > 0 ? Math.round((absHadir / absTotal) * 100) : 100;

  const statusTone =
    penghuni.status === 'Aktif'
      ? 'emerald'
      : penghuni.status === 'Izin'
      ? 'blue'
      : penghuni.status === 'Pulang'
      ? 'amber'
      : 'slate';

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan & Kamar' },
    { id: 'absensi', label: `Absensi (${riwayatAbsensi.length})` },
    { id: 'izin', label: `Perizinan (${riwayatIzin.length})` },
    { id: 'pelanggaran', label: `Poin & Pembinaan (${riwayatPelanggaran.length})` },
    { id: 'tagihan', label: `Tagihan & Kesehatan` },
  ] as const;

  return (
    <Modal
      open={Boolean(penghuniId)}
      onClose={onClose}
      title={penghuni.nama}
      subtitle={`NIS ${penghuni.nis} · Kelas ${penghuni.kelas} · ${penghuni.jenisKelamin}`}
      size="xl"
    >
      {/* Header Profil */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0 font-display font-bold text-lg">
            {penghuni.nama
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag label={penghuni.status} tone={statusTone} />
              <StatusTag
                label={`${poin.poinBersih} Poin · ${level.label}`}
                tone={level.tone === 'emerald' ? 'emerald' : level.tone === 'amber' ? 'amber' : level.tone === 'orange' ? 'orange' : 'red'}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Masuk asrama: {formatTanggal(penghuni.tanggalMasuk)} · Kamar{' '}
              <span className="font-semibold text-slate-800">
                {kamar ? `${kamar.nomor} (${gedung?.nama ?? ''})` : 'Belum ditempatkan'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-sm border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <div>
            <div className="text-xs text-slate-500">Kehadiran</div>
            <div className="font-semibold text-slate-900 font-mono-num">{absPersen}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Total Izin</div>
            <div className="font-semibold text-slate-900 font-mono-num">{riwayatIzin.length}x</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Poin Bersih</div>
            <div className="font-semibold text-slate-900 font-mono-num">{poin.poinBersih}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto py-3 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors min-h-[36px] ${
              tab === t.id
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-4 space-y-5">
        {tab === 'ringkasan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <User className="w-4 h-4 text-teal-700" />
                <span>Informasi Wali & Kontak Darurat</span>
              </div>
              <dl className="grid grid-cols-1 gap-2.5 text-sm">
                <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                  <dt className="text-slate-500">Nama Wali</dt>
                  <dd className="font-medium text-slate-900 text-right">{penghuni.namaWali}</dd>
                </div>
                <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                  <dt className="text-slate-500">Kontak Wali</dt>
                  <dd className="font-medium text-slate-900 font-mono-num flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {penghuni.kontakWali}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 py-1 border-b border-slate-100">
                  <dt className="text-slate-500">Kontak Darurat</dt>
                  <dd className="font-medium text-slate-900 font-mono-num">{penghuni.kontakDarurat || '-'}</dd>
                </div>
                <div className="pt-1">
                  <dt className="text-slate-500 text-xs mb-1">Catatan Khusus</dt>
                  <dd className="text-slate-700 text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {penghuni.catatanKhusus || 'Tidak ada catatan khusus.'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BedDouble className="w-4 h-4 text-teal-700" />
                <span>Riwayat Penempatan & Perpindahan Kamar</span>
              </div>
              {riwayatPenempatan.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada riwayat perpindahan kamar.</p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {riwayatPenempatan.map((pm) => {
                    const dari = db.kamar.find((k) => k.id === pm.dariKamarId);
                    const ke = db.kamar.find((k) => k.id === pm.keKamarId);
                    return (
                      <div
                        key={pm.id}
                        className="text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50/70"
                      >
                        <div className="flex items-center justify-between gap-2 font-medium text-slate-900">
                          <span>
                            {dari ? `Dari ${dari.nomor}` : 'Penempatan Awal'} → Kamar {ke?.nomor ?? '-'}
                          </span>
                          <span className="text-slate-500 font-mono-num">{formatTanggal(pm.tanggal)}</span>
                        </div>
                        <p className="text-slate-600 mt-1">{pm.alasan}</p>
                        <p className="text-slate-400 mt-0.5">Dicatat oleh: {pm.dicatatOleh}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'absensi' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CalendarCheck className="w-4 h-4 text-teal-700" />
                <span>Riwayat Absensi Asrama</span>
              </div>
              <span className="text-xs text-slate-600 tabular-nums">
                Hadir: {absHadir} dari {absTotal} sesi ({absPersen}%)
              </span>
            </div>
            {riwayatAbsensi.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Belum ada catatan absensi.</p>
            ) : (
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Tanggal</th>
                      <th className="py-2.5 px-4 font-medium">Sesi</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riwayatAbsensi.slice(0, 25).map((ab) => (
                      <tr key={ab.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono-num text-xs text-slate-700">
                          {formatTanggal(ab.tanggal)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800">{ab.sesi}</td>
                        <td className="py-2.5 px-4">
                          <StatusTag
                            label={ab.status}
                            tone={
                              ab.status === 'Hadir'
                                ? 'emerald'
                                : ab.status === 'Izin'
                                ? 'blue'
                                : ab.status === 'Sakit'
                                ? 'amber'
                                : 'red'
                            }
                          />
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">
                          {ab.keterangan || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'izin' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="w-4 h-4 text-teal-700" />
              <span>Riwayat Perizinan Keluar / Pulang</span>
            </div>
            {riwayatIzin.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Belum ada riwayat pengajuan izin.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {riwayatIzin.map((iz) => {
                  const efektif = getStatusIzinEfektif(iz);
                  return (
                    <div key={iz.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-900">{iz.jenis}</span>
                          <StatusTag
                            label={efektif}
                            tone={
                              efektif === 'Kembali'
                                ? 'emerald'
                                : efektif === 'Terlambat' || efektif === 'Ditolak'
                                ? 'red'
                                : efektif === 'Keluar'
                                ? 'amber'
                                : 'blue'
                            }
                          />
                        </div>
                        <p className="text-xs text-slate-600">{iz.alasan}</p>
                        <p className="text-xs text-slate-500">
                          Keluar: {formatTanggalWaktu(iz.tanggalKeluar)} · Perkiraan kembali:{' '}
                          {formatTanggalWaktu(iz.perkiraanKembali)}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 sm:text-right">
                        <div>Penjemput: {iz.penjemput}</div>
                        {iz.tanggalKembaliAktual && (
                          <div className="text-emerald-700 font-medium mt-0.5">
                            Kembali aktual: {formatTanggalWaktu(iz.tanggalKembaliAktual)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'pelanggaran' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                <div className="text-xs text-slate-500">Poin Pelanggaran</div>
                <div className="text-xl font-bold text-red-700 font-mono-num mt-0.5">
                  +{poin.totalPelanggaran}
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                <div className="text-xs text-slate-500">Pengurangan (Prestasi/Pembinaan)</div>
                <div className="text-xl font-bold text-emerald-700 font-mono-num mt-0.5">
                  -{poin.totalPengurang}
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                <div className="text-xs text-slate-500">Akumulasi Poin Bersih</div>
                <div className="text-xl font-bold text-slate-900 font-mono-num mt-0.5">
                  {poin.poinBersih} ({level.level})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Catatan Pelanggaran</span>
                </div>
                {riwayatPelanggaran.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">Tidak ada catatan pelanggaran.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {riwayatPelanggaran.map((pl) => (
                      <div key={pl.id} className="p-3.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">{pl.namaPelanggaran}</span>
                          <StatusTag label={`+${pl.poin} poin`} tone="red" withIcon={false} />
                        </div>
                        <div className="text-slate-600">Sanksi: {pl.sanksi}</div>
                        <div className="text-slate-400">
                          {formatTanggal(pl.tanggal)} · Pencatat: {pl.pencatat}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Pembinaan & Prestasi</span>
                </div>
                {riwayatPembinaan.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">Belum ada catatan prestasi/pembinaan.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {riwayatPembinaan.map((pp) => (
                      <div key={pp.id} className="p-3.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">{pp.judul}</span>
                          <StatusTag label={`-${pp.poinPengurang} poin`} tone="emerald" withIcon={false} />
                        </div>
                        <div className="text-slate-600">{pp.deskripsi}</div>
                        <div className="text-slate-400">
                          {formatTanggal(pp.tanggal)} · {pp.pencatat}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'tagihan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CreditCard className="w-4 h-4 text-teal-700" />
                <span>Riwayat Tagihan Asrama</span>
              </div>
              {riwayatTagihan.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Belum ada data tagihan.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {riwayatTagihan.map((tg) => (
                    <div key={tg.id} className="p-3.5 text-xs flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{tg.judul}</div>
                        <div className="text-slate-500 mt-0.5">
                          Jatuh tempo: {formatTanggal(tg.jatuhTempo)}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-semibold text-slate-900 font-mono-num">
                          {formatRupiah(tg.nominal)}
                        </div>
                        <StatusTag
                          label={tg.status}
                          tone={tg.status === 'Lunas' ? 'emerald' : 'amber'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>Catatan Kesehatan Ringkas</span>
              </div>
              {riwayatKesehatan.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Tidak ada catatan keluhan kesehatan.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {riwayatKesehatan.map((ks) => (
                    <div key={ks.id} className="p-3.5 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{ks.keluhan}</span>
                        <StatusTag
                          label={ks.status}
                          tone={ks.status === 'Sembuh' ? 'emerald' : 'amber'}
                        />
                      </div>
                      <p className="text-slate-600">Tindakan: {ks.tindakan}</p>
                      <p className="text-slate-400">{formatTanggal(ks.tanggal)} · {ks.dicatatOleh}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
