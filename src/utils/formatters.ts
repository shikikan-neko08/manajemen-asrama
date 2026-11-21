import { PengaturanAsrama, Perizinan, StatusIzinEfektif } from '../types/dorm';

export function formatTanggal(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatTanggalWaktu(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRupiah(nominal: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(nominal);
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNowDateTimeLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function addDaysISO(baseDateStr: string, days: number): string {
  const d = new Date(baseDateStr);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getStatusIzinEfektif(izin: Perizinan, now: Date = new Date()): StatusIzinEfektif {
  if (izin.status === 'Keluar') {
    const deadline = new Date(izin.perkiraanKembali);
    if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < now.getTime()) {
      return 'Terlambat';
    }
  }
  return izin.status;
}

export interface LevelPeringatan {
  label: string;
  level: 'Aman' | 'Lisan' | 'SP1' | 'SP2' | 'SP3';
  tone: 'emerald' | 'amber' | 'orange' | 'red';
}

export function getLevelPeringatan(
  poinBersih: number,
  pengaturan: PengaturanAsrama
): LevelPeringatan {
  if (poinBersih >= pengaturan.ambangSP3) {
    return { label: 'SP 3 (Pemanggilan Wali)', level: 'SP3', tone: 'red' };
  }
  if (poinBersih >= pengaturan.ambangSP2) {
    return { label: 'Surat Peringatan 2', level: 'SP2', tone: 'red' };
  }
  if (poinBersih >= pengaturan.ambangSP1) {
    return { label: 'Surat Peringatan 1', level: 'SP1', tone: 'orange' };
  }
  if (poinBersih >= pengaturan.ambangPeringatanLisan) {
    return { label: 'Peringatan Lisan', level: 'Lisan', tone: 'amber' };
  }
  return { label: 'Baik / Aman', level: 'Aman', tone: 'emerald' };
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
