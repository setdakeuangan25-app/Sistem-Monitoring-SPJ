import * as XLSX from 'xlsx';
import type { Spj } from '../types';
import { formatTanggalIndo, pegawaiList, statusLabel } from './format';

export function exportToExcel(data: Spj[]) {
  const rows = data.map((d, index) => {
    const p = pegawaiList(d);
    return {
      'No': index + 1,
      'Bagian': d.bagian,
      'Kategori': d.kategori,
      'Uraian': d.uraian,
      'Daftar Pegawai': p.names.join('\n'),
      'Rincian Nominal': p.noms.join('\n'),
      'Total Nominal': Number(d.nominal),
      'Status': statusLabel(d.status),
      'Tgl Masuk': formatTanggalIndo(d.tglMasuk),
      'Tgl Keluar': formatTanggalIndo(d.tglKeluar),
      'Tgl Lengkap': formatTanggalIndo(d.tglBerkas),
      'Tgl Bayar/ SPM': formatTanggalIndo(d.tglBayar),
      'Catatan': d.ket,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SPJ');
  XLSX.writeFile(wb, 'Register_SPJ.xlsx');
}
