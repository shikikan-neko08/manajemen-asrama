import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import {
  addDaysISO,
  exportToCSV,
  formatRupiah,
  formatTanggal,
  formatTanggalWaktu,
  getLevelPeringatan,
  getStatusIzinEfektif,
  getTodayISO,
} from '../../utils/formatters';

type ReportType =
  | 'hunian'
  | 'absensi'
  | 'perizinan'
  | 'pelanggaran'
  | 'inventaris'
  | 'kerusakan';

export const LaporanPage: React.FC = () => {
  const { db, activeRole, getKamarOccupancy, getPenghuniPoin, showToast } = useDorm();
  const canExport = activeRole.capabilities.canExportReport;

  const [reportType, setReportType] = useState<ReportType>('hunian');
  const [filterGedung, setFilterGedung] = useState('Semua');
  const [dateFrom, setDateFrom] = useState(addDaysISO(getTodayISO(), -30));
  const [dateTo, setDateTo] = useState(getTodayISO());

  const reportData = useMemo(() => {
    if (reportType === 'hunian') {
      const headers = ['Gedung', 'Jenis', 'Kamar', 'Lantai', 'Kapasitas', 'Terisi', 'Sisa', 'Kondisi'];
      const rows = db.kamar
        .filter((k) => filterGedung === 'Semua' || k.gedungId === filterGedung)
        .map((k) => {
          const g = db.gedung.find((gd) => gd.id === k.gedungId);
          const occ = getKamarOccupancy(k.id);
          return [
            g?.nama ?? '-',
            g?.jenis ?? '-',
            k.nomor,
            k.lantai,
            k.kapasitas,
            occ,
            Math.max(0, k.kapasitas - occ),
            k.kondisi,
          ];
        });
      return { title: 'Laporan Hunian Gedung & Kamar', headers, rows };
    }

    if (reportType === 'absensi') {
      const headers = ['Nama Santri', 'NIS', 'Gedung', 'Kamar', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Persentase'];
      const rows = db.penghuni
        .filter((p) => p.status !== 'Lulus')
        .filter((p) => {
          const k = db.kamar.find((km) => km.id === p.kamarId);
          return filterGedung === 'Semua' || k?.gedungId === filterGedung;
        })
        .map((p) => {
          const k = db.kamar.find((km) => km.id === p.kamarId);
          const g = k ? db.gedung.find((gd) => gd.id === k.gedungId) : undefined;
          const logs = db.absensi.filter(
            (a) => a.penghuniId === p.id && a.tanggal >= dateFrom && a.tanggal <= dateTo
          );
          const h = logs.filter((l) => l.status === 'Hadir').length;
          const i = logs.filter((l) => l.status === 'Izin').length;
          const s = logs.filter((l) => l.status === 'Sakit').length;
          const al = logs.filter((l) => l.status === 'Alpa').length;
          const pct = logs.length > 0 ? `${Math.round(((h + i) / logs.length) * 100)}%` : '100%';
          return [p.nama, p.nis, g?.nama ?? '-', k?.nomor ?? '-', h, i, s, al, pct];
        });
      return { title: 'Laporan Rekapitulasi Absensi Asrama', headers, rows };
    }

    if (reportType === 'perizinan') {
      const headers = ['Nama Santri', 'Kamar', 'Jenis Izin', 'Waktu Keluar', 'Batas Kembali', 'Status', 'Penjemput'];
      const rows = db.perizinan
        .filter((iz) => {
          const s = db.penghuni.find((p) => p.id === iz.penghuniId);
          const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
          if (filterGedung !== 'Semua' && k?.gedungId !== filterGedung) return false;
          const tgl = iz.tanggalKeluar.slice(0, 10);
          return tgl >= dateFrom && tgl <= dateTo;
        })
        .map((iz) => {
          const s = db.penghuni.find((p) => p.id === iz.penghuniId);
          const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
          return [
            s?.nama ?? '-',
            k?.nomor ?? '-',
            iz.jenis,
            formatTanggalWaktu(iz.tanggalKeluar),
            formatTanggalWaktu(iz.perkiraanKembali),
            getStatusIzinEfektif(iz),
            iz.penjemput,
          ];
        });
      return { title: 'Laporan Perizinan Keluar & Pulang Santri', headers, rows };
    }

    if (reportType === 'pelanggaran') {
      const headers = ['Tanggal', 'Nama Santri', 'Kamar', 'Kategori', 'Pelanggaran', 'Poin', 'Sanksi', 'Level SP Saat Ini'];
      const rows = db.pelanggaran
        .filter((pl) => {
          const s = db.penghuni.find((p) => p.id === pl.penghuniId);
          const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
          if (filterGedung !== 'Semua' && k?.gedungId !== filterGedung) return false;
          return pl.tanggal >= dateFrom && pl.tanggal <= dateTo;
        })
        .map((pl) => {
          const s = db.penghuni.find((p) => p.id === pl.penghuniId);
          const k = s ? db.kamar.find((km) => km.id === s.kamarId) : undefined;
          const poin = s ? getPenghuniPoin(s.id).poinBersih : 0;
          const lvl = getLevelPeringatan(poin, db.pengaturan).label;
          return [
            formatTanggal(pl.tanggal),
            s?.nama ?? '-',
            k?.nomor ?? '-',
            pl.kategori,
            pl.namaPelanggaran,
            pl.poin,
            pl.sanksi,
            `${poin} (${lvl})`,
          ];
        });
      return { title: 'Laporan Pelanggaran & Pembinaan Santri', headers, rows };
    }

    if (reportType === 'inventaris') {
      const headers = ['Gedung', 'Kamar', 'Nama Barang', 'Jumlah', 'Kondisi', 'Keterangan'];
      const rows = db.inventaris
        .filter((inv) => {
          const k = db.kamar.find((km) => km.id === inv.kamarId);
          return filterGedung === 'Semua' || k?.gedungId === filterGedung;
        })
        .map((inv) => {
          const k = db.kamar.find((km) => km.id === inv.kamarId);
          const g = k ? db.gedung.find((gd) => gd.id === k.gedungId) : undefined;
          return [g?.nama ?? '-', k?.nomor ?? '-', inv.namaBarang, inv.jumlah, inv.kondisi, inv.keterangan || '-'];
        });
      return { title: 'Laporan Inventaris Fasilitas Kamar', headers, rows };
    }

    // kerusakan
    const headers = ['Tanggal', 'Gedung', 'Kamar', 'Pelapor', 'Deskripsi Kerusakan', 'Prioritas', 'Status', 'Biaya Perbaikan'];
    const rows = db.laporanKerusakan
      .filter((lk) => {
        const k = db.kamar.find((km) => km.id === lk.kamarId);
        if (filterGedung !== 'Semua' && k?.gedungId !== filterGedung) return false;
        return lk.tanggal >= dateFrom && lk.tanggal <= dateTo;
      })
      .map((lk) => {
        const k = db.kamar.find((km) => km.id === lk.kamarId);
        const g = k ? db.gedung.find((gd) => gd.id === k.gedungId) : undefined;
        return [
          formatTanggal(lk.tanggal),
          g?.nama ?? '-',
          k?.nomor ?? '-',
          lk.pelapor,
          lk.deskripsi,
          lk.prioritas,
          lk.status,
          formatRupiah(lk.biayaPerbaikan),
        ];
      });
    return { title: 'Laporan Kerusakan & Biaya Perawatan', headers, rows };
  }, [reportType, db, filterGedung, dateFrom, dateTo, getKamarOccupancy, getPenghuniPoin]);

  const handleExportCSV = () => {
    exportToCSV(
      `laporan-${reportType}-${getTodayISO()}.csv`,
      reportData.headers,
      reportData.rows
    );
    showToast(`File Excel/CSV "${reportData.title}" berhasil diunduh.`, 'success');
  };

  const reportOptions: { id: ReportType; label: string }[] = [
    { id: 'hunian', label: 'Hunian Kamar' },
    { id: 'absensi', label: 'Absensi Asrama' },
    { id: 'perizinan', label: 'Perizinan' },
    { id: 'pelanggaran', label: 'Pelanggaran' },
    { id: 'inventaris', label: 'Inventaris' },
    { id: 'kerusakan', label: 'Kerusakan' },
  ];

  return (
    <div className="space-y-5">
      {/* Controls (Hidden on Print) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          {reportOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setReportType(opt.id)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors ${
                reportType === opt.id
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gedung</label>
              <select
                value={filterGedung}
                onChange={(e) => setFilterGedung(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="Semua">Semua Gedung</option>
                {db.gedung.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </div>
            {reportType !== 'hunian' && reportType !== 'inventaris' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </>
            )}
          </div>

          {canExport ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg whitespace-nowrap min-h-[40px]"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap min-h-[40px]"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Unduh PDF</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Ekspor & cetak PDF dinonaktifkan untuk role {activeRole.nama}.
            </div>
          )}
        </div>
      </div>

      {/* Printable Report Surface */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print-container">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
              {db.pengaturan.namaLembaga}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{reportData.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dicetak pada {formatTanggal(getTodayISO())} · Jumlah baris: {reportData.rows.length}
            </p>
          </div>
          <div className="text-xs text-slate-400 no-print flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            <span>Siap dicetak atau diekspor</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                {reportData.headers.map((h) => (
                  <th key={h} className="py-3 px-4 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={reportData.headers.length}
                    className="py-8 text-center text-slate-500"
                  >
                    Tidak ada data pada rentang atau filter yang dipilih.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-2.5 px-4 ${
                          typeof cell === 'number' ? 'font-mono-num' : ''
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
