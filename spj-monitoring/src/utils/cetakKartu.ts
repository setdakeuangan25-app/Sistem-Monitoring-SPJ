import type { Spj } from '../types';
import { formatRp, formatTanggalIndo, pegawaiList, statusLabel } from './format';

/**
 * Port dari cetakKartuSPJ() di Index.html lama.
 * Menggambar kartu berkas SPJ di canvas dan mengunduhnya sebagai PNG.
 */
export function cetakKartuSPJ(item: Spj) {
  const parsed = pegawaiList(item);
  const uraianTeks = item.uraian || '-';
  const tglMasuk = formatTanggalIndo(item.tglMasuk);
  const tglKeluar = formatTanggalIndo(item.tglKeluar);
  const catatan = item.ket || '-';

  // ---- Tema warna ----
  const isPerdin = /perjalanan.?dinas/i.test(item.kategori || '');
  const theme = isPerdin
    ? { hdr: '#b45309', subBg: '#fef3c7', subTxt: '#92400e', border: '#d97706', borderIn: '#fcd34d', labelClr: '#78350f' }
    : { hdr: '#4f46e5', subBg: '#ede9fe', subTxt: '#4f46e5', border: '#4f46e5', borderIn: '#a5b4fc', labelClr: '#1e1b4b' };

  const DPI = 150;
  const MM = DPI / 25.4;
  const cardW = Math.round(178 * MM);
  const hdrH = Math.round(18 * MM);
  const subH = Math.round(8 * MM);
  const lineH = Math.round(6 * MM);
  const fs = Math.round(3.1 * MM);
  const lh = Math.round(4.6 * MM);
  const contentX = Math.round(5 * MM);
  const colonX = Math.round(57 * MM);
  const valX = Math.round(60 * MM);
  const maxValW = cardW - Math.round(65 * MM);
  const footerH = Math.round(20 * MM); // tinggi area footer

  // ---- Helper: ukur wrap tanpa render (kanvas kecil di luar layar) ----
  const measCanvas = document.createElement('canvas');
  measCanvas.width = cardW;
  measCanvas.height = 10;
  const mCtx = measCanvas.getContext('2d') as CanvasRenderingContext2D;

  function measureWrap(text: string, maxW: number, fontStr: string): string[] {
    mCtx.font = fontStr;
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (mCtx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function rowHeight(value: string): number {
    const lines = measureWrap(value, maxValW, fs + 'px Arial');
    return lines.length > 1 ? lines.length * lh + Math.round(1.5 * MM) : lineH;
  }

  // ---- Pass 1: hitung total tinggi konten ----
  let contentH = Math.round(6.5 * MM); // padding atas konten
  contentH += rowHeight((item.no || '-') + ' \u2014 ' + (item.bagian || '-'));
  contentH += rowHeight(uraianTeks);
  contentH += rowHeight(parsed.names.join(', ') || '-');
  contentH += rowHeight(tglMasuk);
  contentH += rowHeight(tglKeluar);
  contentH += lineH; // status badge
  contentH += rowHeight(catatan);
  contentH += Math.round(4 * MM); // jarak sebelum footer

  const cardH = hdrH + subH + contentH + footerH;

  // ---- Buat kanvas dengan tinggi dinamis ----
  const canvas = document.createElement('canvas');
  canvas.width = cardW;
  canvas.height = cardH;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cardW, cardH);

  // Border
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, cardW - 3, cardH - 3);
  ctx.strokeStyle = theme.borderIn;
  ctx.lineWidth = 1;
  ctx.strokeRect(5, 5, cardW - 10, cardH - 10);

  // Header
  ctx.fillStyle = theme.hdr;
  ctx.fillRect(0, 0, cardW, hdrH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(5.5 * MM) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('KARTU BERKAS SPJ MASUK', cardW / 2, Math.round(12 * MM));
  if (isPerdin) {
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold ' + Math.round(2.5 * MM) + 'px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('\u2708 PERJALANAN DINAS', cardW - Math.round(4 * MM), Math.round(7 * MM));
  }

  // Sub header
  ctx.fillStyle = theme.subBg;
  ctx.fillRect(0, hdrH, cardW, subH);
  ctx.fillStyle = theme.subTxt;
  ctx.font = Math.round(3 * MM) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Sub Bagian Keuangan - Sekretariat Daerah Kotawaringin Barat', cardW / 2, hdrH + Math.round(5.5 * MM));

  // ---- Render konten (Pass 2) ----
  ctx.textAlign = 'left';

  function wrapText(text: string, maxW: number): string[] {
    ctx.font = fs + 'px Arial';
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawRow(label: string, value: string, yPos: number, bold: boolean): number {
    ctx.fillStyle = theme.labelClr;
    ctx.font = 'bold ' + fs + 'px Arial';
    ctx.fillText(label, contentX, yPos);
    ctx.fillText(':', colonX, yPos);
    ctx.fillStyle = '#1f2937';
    ctx.font = (bold ? 'bold ' : '') + fs + 'px Arial';
    const lines = wrapText(value, maxValW);
    lines.forEach((ln, i) => ctx.fillText(ln, valX, yPos + i * lh));
    return yPos + (lines.length > 1 ? lines.length * lh + Math.round(1.5 * MM) : lineH);
  }

  let y = hdrH + subH + Math.round(6.5 * MM);
  y = drawRow('Nomor Urut / Bagian', (item.no || '-') + ' \u2014 ' + (item.bagian || '-'), y, true);
  y = drawRow('Uraian SPJ', uraianTeks, y, false);
  y = drawRow('Dari', parsed.names.join(', ') || '-', y, false);
  y = drawRow('Tgl. Masuk Berkas', tglMasuk, y, false);
  y = drawRow('Tgl. Perbaikan / Keluar', tglKeluar, y, false);

  // Status badge
  const statusText = statusLabel(item.status);
  let statusColor = '#f59e0b';
  if (item.status === 'ACC') statusColor = '#10b981';
  else if (item.status === 'REVISI') statusColor = '#ef4444';
  ctx.fillStyle = theme.labelClr;
  ctx.font = 'bold ' + fs + 'px Arial';
  ctx.fillText('Status Verifikasi', contentX, y);
  ctx.fillText(':', colonX, y);
  const bW = Math.round(26 * MM);
  const bH = Math.round(5.5 * MM);
  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.roundRect(valX, y - Math.round(4 * MM), bW, bH, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(2.7 * MM) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(statusText.toUpperCase(), valX + bW / 2, y + Math.round(0.8 * MM));
  ctx.textAlign = 'left';
  y += lineH;

  // Catatan dengan blok merah per baris
  ctx.fillStyle = theme.labelClr;
  ctx.font = 'bold ' + fs + 'px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Catatan / Lampiran', contentX, y);
  ctx.fillText(':', colonX, y);
  if (catatan && catatan !== '-') {
    const catatanLines = measureWrap(catatan, maxValW, fs + 'px Arial');
    const bPad = Math.round(2.5 * MM);
    const bH2 = Math.round(5.2 * MM);
    ctx.font = 'bold ' + fs + 'px Arial';
    catatanLines.forEach((ln, i) => {
      const ty = y + i * lh;
      const tw = ctx.measureText(ln).width;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(valX - bPad, ty - Math.round(4 * MM), tw + bPad * 2, bH2, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ln, valX, ty);
    });
    y += catatanLines.length > 1 ? catatanLines.length * lh + Math.round(1.5 * MM) : lineH;
  } else {
    ctx.fillStyle = '#1f2937';
    ctx.font = fs + 'px Arial';
    ctx.fillText('-', valX, y);
    y += lineH;
  }

  // Garis footer
  const footerY = cardH - footerH;
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(5 * MM), footerY);
  ctx.lineTo(cardW - Math.round(5 * MM), footerY);
  ctx.stroke();

  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold ' + Math.round(3 * MM) + 'px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Penerima (Paraf) :', Math.round(5 * MM), footerY + Math.round(6.5 * MM));
  ctx.textAlign = 'right';
  ctx.fillText('Total Nominal : Rp ' + formatRp(item.nominal || 0), cardW - Math.round(5 * MM), footerY + Math.round(6.5 * MM));
  ctx.fillStyle = '#374151';
  ctx.font = Math.round(2.8 * MM) + 'px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('______________________________', Math.round(5 * MM), footerY + Math.round(13 * MM));

  // Unduh PNG
  const namaFile = 'Kartu_SPJ_' + (item.bagian || 'SPJ').replace(/\s/g, '_') + '_' + (item.no || item.id.slice(0, 8)) + '.png';
  const link = document.createElement('a');
  link.download = namaFile;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
