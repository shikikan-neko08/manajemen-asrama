import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCheck, Save, Search } from 'lucide-react';
import { useDorm } from '../../context/DormContext';
import { SesiAbsensi, StatusAbsensi } from '../../types/dorm';
import { addDaysISO, formatTanggal, getTodayISO } from '../../utils/formatters';
import { StatusTag } from '../ui/StatusTag';
import { Pagination } from '../ui/Pagination';

const PAGE_SIZE = 12;

export const AbsensiPage: React.FC = () => {
  const { db, currentUser, activeRole, saveAbsensiBatch } = useDorm();
  const isWali = activeRole.scopeMode === 'anak_terkait';
  const canInput = activeRole.capabilities.canCreateEdit;

  const [tab, setTab] = useState<'input' | 'rekap'>(canInput ? 'input' : 'rekap');

  // Input state
  const [tanggal, setTanggal] = useState(getTodayISO());
  const [sesi, setSesi] = useState<SesiAbsensi>('Apel Malam');
  const [gedungId, setGedungId] = useState<string>(
    currentUser?.gedungIds?.[0] || db.gedung[0]?.id || 'Semua'
  );
  const [kamarId, setKamarId] = useState<string>('Semua');

  // Draft attendance map: penghuniId -> { status, keterangan }
  const [draft, setDraft] = useState<
    Record<string, { status: StatusAbsensi; keterangan: string }>
  >({});

  // Rekap state
  const [rekapPeriode, setRekapPeriode] = useState<'harian' | 'mingguan' | 'bulanan'>('mingguan');
  const [rekapGedung, setRekapGedung] = useState<string>('Semua');
  const [rekapSearch, setRekapSearch] = useState('');
  const [rekapPage, setRekapPage] = useState(1);

  const kamarOptions = useMemo(() => {
    if (gedungId === 'Semua') return db.kamar;
    return db.kamar.filter((k) => k.gedungId === gedungId);
  }, [db.kamar, gedungId]);

  const inputResidents = useMemo(() => {
    return db.penghuni
      .filter((p) => p.status !== 'Lulus')
      .filter((p) => {
        const k = db.kamar.find((km) => km.id === p.kamarId);
        if (gedungId !== 'Semua' && k?.gedungId !== gedungId) return false;
        if (kamarId !== 'Semua' && p.kamarId !== kamarId) return false;
        return true;
      })
      .sort((a, b) => {
        const ka = db.kamar.find((k) => k.id === a.kamarId)?.nomor ?? '';
        const kb = db.kamar.find((k) => k.id === b.kamarId)?.nomor ?? '';
        return ka.localeCompare(kb) || a.nama.localeCompare(b.nama);
      });
  }, [db.penghuni, db.kamar, gedungId, kamarId]);

  // Populate draft whenever date/sesi/filter changes
  useEffect(() => {
    const nextDraft: Record<string, { status: StatusAbsensi; keterangan: string }> = {};
    inputResidents.forEach((p) => {
      const existing = db.absensi.find(
        (a) => a.tanggal === tanggal && a.sesi === sesi && a.penghuniId === p.id
      );
      if (existing) {
        nextDraft[p.id] = { status: existing.status, keterangan: existing.keterangan };
      } else if (p.status === 'Izin' || p.status === 'Pulang') {
        nextDraft[p.id] = {
          status: 'Izin',
          keterangan: `Status penghuni sedang ${p.status}`,
        };
      } else {
        nextDraft[p.id] = { status: 'Hadir', keterangan: '' };
      }
    });
    setDraft(nextDraft);
  }, [inputResidents, db.absensi, tanggal, sesi]);

  const setResidentStatus = (penghuniId: string, status: StatusAbsensi) => {
    setDraft((prev) => ({
      ...prev,
      [penghuniId]: {
        status,
        keterangan: prev[penghuniId]?.keterangan ?? '',
      },
    }));
  };

  const setResidentNote = (penghuniId: string, keterangan: string) => {
    setDraft((prev) => ({
      ...prev,
      [penghuniId]: {
        status: prev[penghuniId]?.status ?? 'Hadir',
        keterangan,
      },
    }));
  };

  const markAllHadir = () => {
    setDraft((prev) => {
      const next = { ...prev };
      inputResidents.forEach((p) => {
        if (p.status === 'Izin' || p.status === 'Pulang') {
          next[p.id] = { status: 'Izin', keterangan: `Status penghuni sedang ${p.status}` };
        } else {
          next[p.id] = { status: 'Hadir', keterangan: '' };
        }
      });
      return next;
    });
  };

  const handleSaveBatch = () => {
    const records = inputResidents.map((p) => {
      const entry = draft[p.id] ?? { status: 'Hadir' as StatusAbsensi, keterangan: '' };
      return {
        tanggal,
        sesi,
        penghuniId: p.id,
        kamarId: p.kamarId,
        status: entry.status,
        keterangan: entry.keterangan,
        dicatatOleh: currentUser?.nama ?? 'Pembina',
      };
    });
    saveAbsensiBatch(records);
  };

  // Rekap calculations
  const rekapDateRange = useMemo(() => {
    const end = getTodayISO();
    const start =
      rekapPeriode === 'harian'
        ? end
        : rekapPeriode === 'mingguan'
        ? addDaysISO(end, -6)
        : addDaysISO(end, -29);
    return { start, end };
  }, [rekapPeriode]);

  const rekapRows = useMemo(() => {
    const q = rekapSearch.trim().toLowerCase();
    const baseResidents = isWali
      ? db.penghuni.filter((p) => currentUser?.penghuniIds?.includes(p.id))
      : db.penghuni.filter((p) => p.status !== 'Lulus');

    return baseResidents
      .filter((p) => {
        const k = db.kamar.find((km) => km.id === p.kamarId);
        if (!isWali && rekapGedung !== 'Semua' && k?.gedungId !== rekapGedung) return false;
        if (q && !p.nama.toLowerCase().includes(q) && !p.nis.includes(q)) return false;
        return true;
      })
      .map((p) => {
        const kamar = db.kamar.find((k) => k.id === p.kamarId);
        const gedung = kamar ? db.gedung.find((g) => g.id === kamar.gedungId) : undefined;
        const logs = db.absensi.filter(
          (a) =>
            a.penghuniId === p.id &&
            a.tanggal >= rekapDateRange.start &&
            a.tanggal <= rekapDateRange.end
        );
        const hadir = logs.filter((l) => l.status === 'Hadir').length;
        const izin = logs.filter((l) => l.status === 'Izin').length;
        const sakit = logs.filter((l) => l.status === 'Sakit').length;
        const alpa = logs.filter((l) => l.status === 'Alpa').length;
        const total = logs.length;
        const pct = total > 0 ? Math.round(((hadir + izin) / total) * 100) : 100;
        return { penghuni: p, kamar, gedung, hadir, izin, sakit, alpa, total, pct };
      });
  }, [db.penghuni, db.kamar, db.gedung, db.absensi, isWali, currentUser, rekapGedung, rekapSearch, rekapDateRange]);

  const safeRekapPage = Math.min(rekapPage, Math.max(1, Math.ceil(rekapRows.length / PAGE_SIZE)));
  const paginatedRekap = rekapRows.slice(
    (safeRekapPage - 1) * PAGE_SIZE,
    safeRekapPage * PAGE_SIZE
  );

  const summaryCounts = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    inputResidents.forEach((p) => {
      const st = draft[p.id]?.status ?? 'Hadir';
      if (st === 'Hadir') hadir++;
      else if (st === 'Izin') izin++;
      else if (st === 'Sakit') sakit++;
      else alpa++;
    });
    return { hadir, izin, sakit, alpa };
  }, [inputResidents, draft]);

  return (
    <div className="space-y-5">
      {/* Header Tabs */}
      {canInput && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setTab('input')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                tab === 'input'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Input Cepat Absensi
            </button>
            <button
              type="button"
              onClick={() => setTab('rekap')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                tab === 'rekap'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Harian / Mingguan / Bulanan
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Santri berstatus <strong>Izin / Pulang</strong> otomatis tercatat Izin dan tidak dihitung Alpa.
          </div>
        </div>
      )}

      {/* TAB 1: INPUT CEPAT */}
      {tab === 'input' && canInput && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sesi Absensi</label>
              <select
                value={sesi}
                onChange={(e) => setSesi(e.target.value as SesiAbsensi)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600 min-h-[40px]"
              >
                <option value="Subuh">Subuh</option>
                <option value="Maghrib">Maghrib</option>
                <option value="Apel Malam">Apel Malam</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gedung</label>
              <select
                value={gedungId}
                onChange={(e) => {
                  setGedungId(e.target.value);
                  setKamarId('Semua');
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600 min-h-[40px]"
              >
                <option value="Semua">Semua Gedung</option>
                {db.gedung.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} ({g.jenis})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kamar</label>
              <select
                value={kamarId}
                onChange={(e) => setKamarId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-600 min-h-[40px]"
              >
                <option value="Semua">Semua Kamar</option>
                {kamarOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kamar {k.nomor}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllHadir}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg min-h-[40px] whitespace-nowrap"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Semua Hadir</span>
              </button>
            </div>
          </div>

          {/* Summary Bar + Save */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-teal-700" />
                {sesi} · {formatTanggal(tanggal)}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-emerald-700 font-mono-num font-medium">
                Hadir: {summaryCounts.hadir}
              </span>
              <span className="text-sky-700 font-mono-num font-medium">
                Izin: {summaryCounts.izin}
              </span>
              <span className="text-amber-700 font-mono-num font-medium">
                Sakit: {summaryCounts.sakit}
              </span>
              <span className="text-red-700 font-mono-num font-medium">
                Alpa: {summaryCounts.alpa}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={inputResidents.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-40 rounded-lg min-h-[40px] whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Absensi ({inputResidents.length})</span>
            </button>
          </div>

          {/* List Input */}
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {inputResidents.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Tidak ada penghuni aktif pada gedung/kamar yang dipilih.
              </div>
            ) : (
              inputResidents.map((p) => {
                const kamar = db.kamar.find((k) => k.id === p.kamarId);
                const onLeave = p.status === 'Izin' || p.status === 'Pulang';
                const currentEntry = draft[p.id] ?? { status: 'Hadir', keterangan: '' };

                return (
                  <div
                    key={p.id}
                    className="p-3.5 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono-num font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {kamar?.nomor ?? '-'}
                        </span>
                        <span className="font-semibold text-sm text-slate-900">{p.nama}</span>
                        {onLeave && (
                          <StatusTag label={`Sedang ${p.status}`} tone="blue" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Kelas {p.kelas} · NIS {p.nis}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg">
                        {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as StatusAbsensi[]).map((st) => {
                          const disabled = onLeave && st === 'Alpa';
                          const active = currentEntry.status === st;
                          const activeStyle =
                            st === 'Hadir'
                              ? 'bg-emerald-600 text-white'
                              : st === 'Izin'
                              ? 'bg-sky-600 text-white'
                              : st === 'Sakit'
                              ? 'bg-amber-600 text-white'
                              : 'bg-red-600 text-white';
                          return (
                            <button
                              key={st}
                              type="button"
                              disabled={disabled}
                              onClick={() => setResidentStatus(p.id, st)}
                              title={
                                disabled
                                  ? 'Penghuni berstatus Izin/Pulang tidak dapat ditandai Alpa'
                                  : st
                              }
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[34px] disabled:opacity-30 disabled:cursor-not-allowed ${
                                active
                                  ? activeStyle
                                  : 'text-slate-700 hover:bg-white'
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={currentEntry.keterangan}
                        onChange={(e) => setResidentNote(p.id, e.target.value)}
                        placeholder="Catatan (opsional)..."
                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 sm:w-48 min-h-[36px]"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REKAP */}
      {tab === 'rekap' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['harian', 'mingguan', 'bulanan'] as const).map((pr) => (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => {
                      setRekapPeriode(pr);
                      setRekapPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                      rekapPeriode === pr
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {pr === 'harian' ? 'Hari Ini' : pr === 'mingguan' ? '7 Hari' : '30 Hari'}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500">
                Periode: {formatTanggal(rekapDateRange.start)} – {formatTanggal(rekapDateRange.end)}
              </span>
            </div>

            {!isWali && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rekapSearch}
                    onChange={(e) => {
                      setRekapSearch(e.target.value);
                      setRekapPage(1);
                    }}
                    placeholder="Cari santri..."
                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600 min-h-[38px]"
                  />
                </div>
                <select
                  value={rekapGedung}
                  onChange={(e) => {
                    setRekapGedung(e.target.value);
                    setRekapPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-600 min-h-[38px]"
                >
                  <option value="Semua">Semua Gedung</option>
                  {db.gedung.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Nama Santri</th>
                    <th className="py-3 px-4 font-medium">Kamar</th>
                    <th className="py-3 px-4 font-medium text-right">Hadir</th>
                    <th className="py-3 px-4 font-medium text-right">Izin</th>
                    <th className="py-3 px-4 font-medium text-right">Sakit</th>
                    <th className="py-3 px-4 font-medium text-right">Alpa</th>
                    <th className="py-3 px-4 font-medium text-right">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRekap.map(({ penghuni, kamar, gedung, hadir, izin, sakit, alpa, pct }) => (
                    <tr key={penghuni.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{penghuni.nama}</div>
                        <div className="text-xs text-slate-500">Kelas {penghuni.kelas}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {kamar?.nomor ?? '-'} · {gedung?.nama ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-emerald-700 font-medium">
                        {hadir}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-sky-700 font-medium">
                        {izin}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-amber-700 font-medium">
                        {sakit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-red-700 font-semibold">
                        {alpa}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <StatusTag
                          label={`${pct}%`}
                          tone={pct >= 90 ? 'emerald' : pct >= 75 ? 'amber' : 'red'}
                          withIcon={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={safeRekapPage}
              totalItems={rekapRows.length}
              pageSize={PAGE_SIZE}
              onPageChange={setRekapPage}
            />
          </div>
        </div>
      )}
    </div>
  );
};
