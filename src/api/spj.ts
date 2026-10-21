import { isRealSupabase, supabase } from '../lib/supabase';
import { BAGIAN_LIST, type Spj, type SpjInput, type Stats } from '../types';

// PostgREST membatasi 1000 baris per request, jadi ambil per halaman.
const PAGE = 1000;

/* eslint-disable @typescript-eslint/no-explicit-any */
function toSpj(r: any): Spj {
  const pegawai = [...(r.spj_pegawai ?? [])]
    .sort((a: any, b: any) => a.urutan - b.urutan)
    .map((p: any) => ({ nama: String(p.nama), nominal: Number(p.nominal) }));
  return {
    id: r.id,
    no: r.no ?? '',
    bagian: r.bagian,
    kategori: r.kategori,
    uraian: r.uraian,
    status: r.status ?? null,
    nominal: Number(r.total_nominal ?? 0),
    tglMasuk: r.tgl_masuk ?? '',
    tglKeluar: r.tgl_keluar ?? '',
    tglBerkas: r.tgl_berkas ?? '',
    tglBayar: r.tgl_bayar ?? '',
    ket: r.ket ?? '',
    pegawai,
    nama: pegawai.map((p) => p.nama).join('\n'),
    nomList: pegawai.map((p) => String(p.nominal)).join('\n'),
  };
}

const STORAGE_KEY = 'spj_monitoring_data_v1';

const SEED_SPJ: Spj[] = [
  {
    id: 'spj-seed-1',
    no: '001/UMUM/SPJ/2026',
    bagian: 'UMUM',
    kategori: 'Perjalanan Dinas',
    uraian: 'Biaya Perjalanan Dinas Konsultasi Koordinasi Penyusunan Anggaran ke BPKAD Provinsi Kalimantan Tengah di Palangka Raya',
    status: 'ACC',
    nominal: 10500000,
    tglMasuk: '2026-03-01',
    tglKeluar: '2026-03-05',
    tglBerkas: '2026-03-06',
    tglBayar: '2026-03-10',
    ket: 'Berkas lengkap dan sesuai ketentuan',
    pegawai: [
      { nama: 'Drs. H. Ahmad Fauzi, M.Si', nominal: 4500000 },
      { nama: 'Siti Rahmawati, S.E.', nominal: 3200000 },
      { nama: 'Bambang Supriyanto', nominal: 2800000 },
    ],
    nama: 'Drs. H. Ahmad Fauzi, M.Si\nSiti Rahmawati, S.E.\nBambang Supriyanto',
    nomList: '4500000\n3200000\n2800000',
  },
  {
    id: 'spj-seed-2',
    no: '002/KESRA/SPJ/2026',
    bagian: 'KESRA',
    kategori: 'Belanja Langsung',
    uraian: 'Belanja Makanan dan Minuman Kegiatan Rapat Koordinasi Lintas Sektor Program Kemasyarakatan',
    status: 'ACC',
    nominal: 8750000,
    tglMasuk: '2026-03-02',
    tglKeluar: '2026-03-04',
    tglBerkas: '2026-03-05',
    tglBayar: '2026-03-08',
    ket: 'Kuitansi dan faktur pajak terlampir lengkap',
    pegawai: [{ nama: 'CV. Berkah Rasa Catering', nominal: 8750000 }],
    nama: 'CV. Berkah Rasa Catering',
    nomList: '8750000',
  },
  {
    id: 'spj-seed-3',
    no: '003/BANG/SPJ/2026',
    bagian: 'PEMBANGUNAN',
    kategori: 'Perjalanan Dinas',
    uraian: 'Monitoring dan Evaluasi Pelaksanaan Proyek Pembangunan Infrastruktur Pedesaan di Wilayah Kecamatan Kumai',
    status: 'REVISI',
    nominal: 6000000,
    tglMasuk: '2026-03-08',
    tglKeluar: '2026-03-12',
    tglBerkas: '',
    tglBayar: '',
    ket: 'Lampiran laporan hasil monev dan dokumentasi foto belum ditandatangani PPTK',
    pegawai: [
      { nama: 'Ir. Hendra Kusuma, S.T.', nominal: 3500000 },
      { nama: 'Rian Hidayat, S.T.', nominal: 2500000 },
    ],
    nama: 'Ir. Hendra Kusuma, S.T.\nRian Hidayat, S.T.',
    nomList: '3500000\n2500000',
  },
  {
    id: 'spj-seed-4',
    no: '004/HKM/SPJ/2026',
    bagian: 'HUKUM',
    kategori: 'Belanja Langsung',
    uraian: 'Pengadaan Bahan Sosialisasi Produk Hukum Daerah dan Peraturan Bupati Kotawaringin Barat',
    status: null,
    nominal: 6200000,
    tglMasuk: '2026-03-14',
    tglKeluar: '',
    tglBerkas: '',
    tglBayar: '',
    ket: 'Dalam tahap verifikasi kelengkapan kuitansi',
    pegawai: [{ nama: 'Percetakan Grafika Mandiri', nominal: 6200000 }],
    nama: 'Percetakan Grafika Mandiri',
    nomList: '6200000',
  },
  {
    id: 'spj-seed-5',
    no: '005/EKO/SPJ/2026',
    bagian: 'EKONOMI',
    kategori: 'Perjalanan Dinas',
    uraian: 'Koordinasi Pengendalian Inflasi Daerah dan Pasokan Bahan Pangan Pokok Tingkat Kabupaten Kotawaringin Barat',
    status: 'ACC',
    nominal: 6000000,
    tglMasuk: '2026-02-20',
    tglKeluar: '2026-02-23',
    tglBerkas: '2026-02-25',
    tglBayar: '2026-02-28',
    ket: 'Selesai diverifikasi dan telah dicairkan',
    pegawai: [
      { nama: 'Dewi Lestari, S.E., M.M.', nominal: 3800000 },
      { nama: 'Anwar Sanusi', nominal: 2200000 },
    ],
    nama: 'Dewi Lestari, S.E., M.M.\nAnwar Sanusi',
    nomList: '3800000\n2200000',
  },
  {
    id: 'spj-seed-6',
    no: '006/PBJ/SPJ/2026',
    bagian: 'PBJ',
    kategori: 'Belanja Langsung',
    uraian: 'Belanja Alat Tulis Kantor dan Bahan Komputer untuk Pelaksanaan Tender Elektronik LPSE',
    status: null,
    nominal: 4350000,
    tglMasuk: '2026-03-15',
    tglKeluar: '',
    tglBerkas: '',
    tglBayar: '',
    ket: 'Menunggu konfirmasi nota dinas',
    pegawai: [{ nama: 'Toko ATK Sahabat Kita', nominal: 4350000 }],
    nama: 'Toko ATK Sahabat Kita',
    nomList: '4350000',
  },
  {
    id: 'spj-seed-7',
    no: '007/PROKOM/SPJ/2026',
    bagian: 'PROKOM',
    kategori: 'Perjalanan Dinas',
    uraian: 'Liputan dan Pendampingan Dokumentasi Pimpinan Daerah pada Kegiatan Kunjungan Kerja Lapangan',
    status: 'ACC',
    nominal: 5000000,
    tglMasuk: '2026-03-05',
    tglKeluar: '2026-03-07',
    tglBerkas: '2026-03-09',
    tglBayar: '2026-03-12',
    ket: 'Lengkap dan siap arsip',
    pegawai: [
      { nama: 'Fajar Nugraha, S.I.Kom', nominal: 2900000 },
      { nama: 'Dimas Pratama (Juru Kamera)', nominal: 2100000 },
    ],
    nama: 'Fajar Nugraha, S.I.Kom\nDimas Pratama (Juru Kamera)',
    nomList: '2900000\n2100000',
  },
  {
    id: 'spj-seed-8',
    no: '008/ORG/SPJ/2026',
    bagian: 'ORGANISASI',
    kategori: 'Belanja Langsung',
    uraian: 'Honorarium Tim Penyusun Analisis Jabatan dan Analisis Beban Kerja (Anjab ABK) Sekretariat Daerah',
    status: 'REVISI',
    nominal: 8500000,
    tglMasuk: '2026-03-10',
    tglKeluar: '2026-03-13',
    tglBerkas: '',
    tglBayar: '',
    ket: 'Daftar tanda terima honor belum dibubuhi meterai Rp 10.000',
    pegawai: [
      { nama: 'Dra. Hj. Nurul Hidayah', nominal: 5000000 },
      { nama: 'Eko Prasetyo, S.Sos', nominal: 3500000 },
    ],
    nama: 'Dra. Hj. Nurul Hidayah\nEko Prasetyo, S.Sos',
    nomList: '5000000\n3500000',
  },
  {
    id: 'spj-seed-9',
    no: '009/PEM/SPJ/2026',
    bagian: 'PEMERINTAHAN',
    kategori: 'Perjalanan Dinas',
    uraian: 'Fasilitasi dan Penataan Batas Wilayah Administrasi Antar Desa / Kelurahan di Kabupaten Kotawaringin Barat',
    status: null,
    nominal: 6700000,
    tglMasuk: '2026-03-16',
    tglKeluar: '',
    tglBerkas: '',
    tglBayar: '',
    ket: 'Berkas baru masuk ke meja verifikator',
    pegawai: [
      { nama: 'M. Yusuf, S.STP', nominal: 4100000 },
      { nama: 'Agus Salim', nominal: 2600000 },
    ],
    nama: 'M. Yusuf, S.STP\nAgus Salim',
    nomList: '4100000\n2600000',
  },
];

function getMockStorage(): Spj[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SPJ));
      return [...SEED_SPJ];
    }
    return JSON.parse(raw) as Spj[];
  } catch {
    return [...SEED_SPJ];
  }
}

function setMockStorage(data: Spj[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Gagal menyimpan ke localStorage:', e);
  }
}

/** Pengganti getAppData() di Code.gs. Urutan: terbaru di atas. */
export async function fetchAllSpj(): Promise<Spj[]> {
  if (!isRealSupabase) {
    return getMockStorage();
  }

  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('spj')
      .select('*, spj_pegawai(nama, nominal, urutan)')
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows.map(toSpj);
}

/** Pengganti processData() di Code.gs. Insert bila tanpa id, update bila ada id. */
export async function saveSpj(input: SpjInput): Promise<string> {
  if (!isRealSupabase) {
    const list = getMockStorage();
    const totalNominal = input.pegawai.reduce((acc, p) => acc + (Number(p.nominal) || 0), 0);
    const spjRecord: Spj = {
      id: input.id || 'spj-' + Date.now(),
      no: input.no,
      bagian: input.bagian,
      kategori: input.kategori,
      uraian: input.uraian,
      status: input.status,
      nominal: totalNominal,
      tglMasuk: input.tglMasuk,
      tglKeluar: input.tglKeluar,
      tglBerkas: input.tglBerkas,
      tglBayar: input.tglBayar,
      ket: input.ket,
      pegawai: input.pegawai,
      nama: input.pegawai.map((p) => p.nama).join('\n'),
      nomList: input.pegawai.map((p) => String(p.nominal)).join('\n'),
    };

    if (input.id) {
      const idx = list.findIndex((x) => x.id === input.id);
      if (idx !== -1) {
        list[idx] = spjRecord;
      } else {
        list.unshift(spjRecord);
      }
    } else {
      list.unshift(spjRecord);
    }
    setMockStorage(list);
    return input.id ? 'Data SPJ berhasil diperbarui.' : 'Data SPJ baru berhasil disimpan.';
  }

  const { error } = await supabase.rpc('save_spj', {
    p_id: input.id ?? null,
    p_spj: {
      no: input.no,
      bagian: input.bagian,
      kategori: input.kategori,
      uraian: input.uraian,
      status: input.status ?? '',
      tglMasuk: input.tglMasuk,
      tglKeluar: input.tglKeluar,
      tglBerkas: input.tglBerkas,
      tglBayar: input.tglBayar,
      ket: input.ket,
    },
    p_pegawai: input.pegawai,
  });
  if (error) throw new Error(error.message);
  return input.id ? 'Data SPJ berhasil diperbarui.' : 'Data SPJ baru berhasil disimpan.';
}

/** Pengganti deleteData() di Code.gs. Pegawai ikut terhapus (on delete cascade). */
export async function deleteSpj(id: string): Promise<string> {
  if (!isRealSupabase) {
    const list = getMockStorage();
    const updated = list.filter((x) => x.id !== id);
    setMockStorage(updated);
    return 'Data rombongan berhasil dihapus.';
  }

  const { error } = await supabase.from('spj').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return 'Data rombongan berhasil dihapus.';
}

export function computeStats(list: Spj[]) {
  const stats: Stats = { total: 0, acc: 0, revisi: 0, belum: 0 };
  const statsBagian: Record<string, number> = {};
  const statsKategori: Record<string, { dinas: number; belanja: number }> = {};
  BAGIAN_LIST.forEach((b) => {
    statsBagian[b] = 0;
    statsKategori[b] = { dinas: 0, belanja: 0 };
  });

  for (const it of list) {
    stats.total++;
    if (it.status === 'ACC') stats.acc++;
    else if (it.status === 'REVISI') stats.revisi++;
    else stats.belum++;

    const bg = it.bagian.toUpperCase();
    if (bg in statsBagian) {
      statsBagian[bg]++;
      if (it.kategori.toLowerCase().includes('dinas')) statsKategori[bg].dinas++;
      else statsKategori[bg].belanja++;
    }
  }
  return { stats, statsBagian, statsKategori };
}
