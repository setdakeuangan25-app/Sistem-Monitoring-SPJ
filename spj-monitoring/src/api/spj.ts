import { supabase } from '../lib/supabase';
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

/** Pengganti getAppData() di Code.gs. Urutan: terbaru di atas. */
export async function fetchAllSpj(): Promise<Spj[]> {
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
