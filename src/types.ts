export const BAGIAN_LIST = [
  'UMUM', 'PEMBANGUNAN', 'KESRA', 'EKONOMI', 'HUKUM', 'PBJ', 'ORGANISASI', 'PEMERINTAHAN', 'PROKOM',
] as const;

export const KATEGORI_LIST = ['Perjalanan Dinas', 'Belanja Langsung'] as const;

export const BAGIAN_CLASS: Record<string, string> = {
  UMUM: 'bg-umum',
  PEMBANGUNAN: 'bg-pembangunan',
  KESRA: 'bg-kesra',
  EKONOMI: 'bg-ekonomi',
  HUKUM: 'bg-hukum',
  PBJ: 'bg-pbj',
  ORGANISASI: 'bg-organisasi',
  PEMERINTAHAN: 'bg-pemerintahan',
  PROKOM: 'bg-prokom',
};

export type Status = 'ACC' | 'REVISI' | null;
export type DateField = 'tglMasuk' | 'tglKeluar' | 'tglBerkas' | 'tglBayar';

export interface Pegawai {
  nama: string;
  nominal: number;
}

export interface Spj {
  id: string;
  no: string;
  bagian: string;
  kategori: string;
  uraian: string;
  status: Status;
  nominal: number;
  tglMasuk: string;
  tglKeluar: string;
  tglBerkas: string;
  tglBayar: string;
  ket: string;
  pegawai: Pegawai[];
  /** nama pegawai digabung "\n" (dipakai untuk cari dan urut) */
  nama: string;
  /** nominal pegawai digabung "\n" (dipakai untuk cari dan urut) */
  nomList: string;
}

export interface SpjInput {
  id?: string;
  no: string;
  bagian: string;
  kategori: string;
  uraian: string;
  status: Status;
  tglMasuk: string;
  tglKeluar: string;
  tglBerkas: string;
  tglBayar: string;
  ket: string;
  pegawai: Pegawai[];
}

export interface Filters {
  bagian: string;
  kategori: string;
  search: string;
  dateField: DateField;
  dateFrom: string;
  dateTo: string;
  sortKey: string;
  sortAsc: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  bagian: 'ALL',
  kategori: 'ALL',
  search: '',
  dateField: 'tglMasuk',
  dateFrom: '',
  dateTo: '',
  sortKey: '',
  sortAsc: true,
};

export interface Stats {
  total: number;
  acc: number;
  revisi: number;
  belum: number;
}
