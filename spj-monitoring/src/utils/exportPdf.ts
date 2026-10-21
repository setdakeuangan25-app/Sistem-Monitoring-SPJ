import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Spj } from '../types';
import { formatRp, formatTanggalIndo, pegawaiList, statusLabel } from './format';

export function exportToPDF(data: Spj[]) {
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(14);
  doc.text('Laporan Register SPJ - Setda Kobar', 14, 15);

  const body = data.map((d, index) => {
    const p = pegawaiList(d);
    return [
      index + 1,
      d.bagian,
      d.kategori,
      d.uraian,
      p.names.join('\n'),
      p.noms.join('\n'),
      `Rp ${formatRp(d.nominal)}`,
      statusLabel(d.status),
      formatTanggalIndo(d.tglMasuk),
      formatTanggalIndo(d.tglKeluar),
      formatTanggalIndo(d.tglBerkas),
      formatTanggalIndo(d.tglBayar),
      d.ket,
    ];
  });

  autoTable(doc, {
    head: [['No', 'Bagian', 'Kategori', 'Uraian', 'Daftar Pegawai', 'Rincian Nom', 'Total Nominal', 'Status', 'Masuk', 'Keluar', 'Berkas', 'Bayar/ SPM', 'Catatan']],
    body,
    startY: 26,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 1.5, valign: 'middle' },
    headStyles: { fillColor: [79, 70, 229] },
  });
  doc.save('Register_SPJ.pdf');
}
