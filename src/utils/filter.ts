import type { Filters, Spj } from '../types';

type Rec = Record<string, unknown>;

export function getFilteredData(list: Spj[], f: Filters): Spj[] {
  const val = f.search.toLowerCase();

  let data = list.filter((d) => {
    const matchBagian = f.bagian === 'ALL' || d.bagian.toUpperCase() === f.bagian;
    const matchKategori = f.kategori === 'ALL' || d.kategori === f.kategori;

    const itemStatus = (d.status || 'PROSES').toUpperCase();
    const matchStatus =
      !f.status || f.status === 'ALL'
        ? true
        : f.status === 'PROSES'
        ? !d.status || d.status === null || itemStatus === 'PROSES' || itemStatus === 'BELUM PROSES'
        : itemStatus === f.status;

    const statTxt = d.status ? String(d.status) : 'belum proses';
    const global = `${d.no} ${d.bagian} ${d.kategori} ${d.nama} ${d.nomList} ${d.nominal} ${statTxt} ${d.uraian} ${d.tglMasuk} ${d.tglKeluar} ${d.tglBerkas} ${d.tglBayar} ${d.ket}`.toLowerCase();
    const matchSearch = global.includes(val);

    let matchTanggal = true;
    if (f.dateFrom || f.dateTo) {
      const raw = (d as unknown as Rec)[f.dateField];
      if (!raw) {
        matchTanggal = false;
      } else {
        const itemDate = String(raw).split('T')[0];
        if (f.dateFrom && itemDate < f.dateFrom) matchTanggal = false;
        if (f.dateTo && itemDate > f.dateTo) matchTanggal = false;
      }
    }
    return matchBagian && matchKategori && matchStatus && matchSearch && matchTanggal;
  });

  if (f.sortKey !== '') {
    const key = f.sortKey;
    const asc = f.sortAsc;
    data = [...data].sort((a, b) => {
      const va = (a as unknown as Rec)[key];
      const vb = (b as unknown as Rec)[key];
      const sa = va === null || va === undefined ? '' : String(va);
      const sb = vb === null || vb === undefined ? '' : String(vb);
      if (key === 'nominal' || key === 'no') {
        let na = parseFloat(sa.replace(/[^\d.-]/g, ''));
        let nb = parseFloat(sb.replace(/[^\d.-]/g, ''));
        if (isNaN(na)) na = asc ? Infinity : -Infinity;
        if (isNaN(nb)) nb = asc ? Infinity : -Infinity;
        if (na === nb) return 0;
        return asc ? na - nb : nb - na;
      }
      if (key === 'tglMasuk' || key === 'tglKeluar' || key === 'tglBerkas' || key === 'tglBayar') {
        if (!sa && !sb) return 0;
        if (!sa) return 1;
        if (!sb) return -1;
        return asc ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }
      const la = sa.toLowerCase();
      const lb = sb.toLowerCase();
      if (la < lb) return asc ? -1 : 1;
      if (la > lb) return asc ? 1 : -1;
      return 0;
    });
  }
  return data;
}
