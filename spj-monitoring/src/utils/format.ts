import type { Spj, Status } from '../types';

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatRp(n: number | string): string {
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString('id-ID') : String(n);
}

/** "2026-03-05" -> "5 Maret 2026". Kosong -> "-". */
export function formatTanggalIndo(s?: string): string {
  if (!s || !s.trim()) return '-';
  const m = s.split('T')[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}`;
}

export function statusLabel(status: Status): string {
  if (status === 'ACC') return 'ACC';
  if (status === 'REVISI') return 'Revisi';
  return 'Belum Diproses';
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

export function onlyDigits(s: string): string {
  return s.replace(/[^0-9]/g, '');
}

/** "1500000" -> "1.500.000". Kosong tetap kosong. */
export function formatRibuan(s: string): string {
  const d = onlyDigits(s);
  return d === '' ? '' : parseInt(d, 10).toLocaleString('id-ID');
}

export function todayLocal(): string {
  return new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd, zona waktu lokal
}

/** Daftar nama dan nominal terformat untuk tabel, export, dan kartu. */
export function pegawaiList(item: Spj): { names: string[]; noms: string[] } {
  if (item.pegawai.length === 0) return { names: ['-'], noms: ['-'] };
  return {
    names: item.pegawai.map((p) => p.nama),
    noms: item.pegawai.map((p) => formatRp(p.nominal)),
  };
}
