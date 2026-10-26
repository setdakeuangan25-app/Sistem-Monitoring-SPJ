export interface CompletedSpj {
  bagian: string;
  kategori: string;
  uraian: string;
  pegawai: { nama: string; nominal: number }[];
  tglMasuk: string;
  status: string;
  ket: string;
  confidenceNote: string;
}

const BULAN: Record<string, string> = {
  januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
  juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
};

/** Ambil nominal Rp terbesar dari teks (umumnya total kuitansi). 0 jika tidak ada. */
function guessNominal(text: string): number {
  let best = 0;
  for (const m of text.matchAll(/Rp\.?\s*([\d][\d.,]*)/gi)) {
    const cleaned = m[1].replace(/[,.]-?$/, '').replace(/,\d{2}$/, '');
    const n = Number(cleaned.replace(/\D/g, ''));
    if (n > best) best = n;
  }
  return best;
}

/** Ambil tanggal terbaru yang tertulis ("14 Maret 2026") sebagai YYYY-MM-DD. */
function guessDate(text: string): string {
  let best = '';
  const re = new RegExp(`(\\d{1,2})\\s+(${Object.keys(BULAN).join('|')})\\s+(\\d{4})`, 'gi');
  for (const m of text.matchAll(re)) {
    const iso = `${m[3]}-${BULAN[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
    if (iso > best) best = iso;
  }
  return best;
}

function guessName(text: string): string {
  const m = text.match(
    /\b((?:CV|PT|UD|TOKO)\.?\s+[A-Z0-9][A-Za-z0-9&.\- ]*?)(?=\s+(?:dengan|sebesar|senilai|jumlah|nominal|Rp)\b|[,;\n]|\.\s|$)/i,
  );
  return m ? m[1].trim() : '';
}

function guessKategori(text: string): string {
  if (/perjalanan dinas|perjadin/i.test(text)) return 'Perjalanan Dinas';
  if (/belanja langsung/i.test(text)) return 'Belanja Langsung';
  return '';
}

function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Lengkapi hasil AI (atau null) dengan nilai dari teks masukan,
 * sehingga draf SPJ selalu terbentuk walau suara/dokumen tidak terbaca.
 */
export function completeSpj(raw: any, text: string, today: string, note = ''): CompletedSpj {
  const src = (text || '')
    .replace(/Transkrip Dikte Suara:|Catatan Pengguna:/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const r = raw && typeof raw === 'object' ? raw : {};

  const aiPegawai = Array.isArray(r.pegawai)
    ? r.pegawai
        .map((p: any) => ({ nama: String(p?.nama ?? '').trim(), nominal: Number(p?.nominal) || 0 }))
        .filter((p: { nama: string; nominal: number }) => p.nama || p.nominal)
    : [];

  const pegawai =
    aiPegawai.length > 0
      ? aiPegawai
      : [{ nama: guessName(src), nominal: guessNominal(src) }];

  return {
    bagian: typeof r.bagian === 'string' ? r.bagian : '',
    kategori: typeof r.kategori === 'string' && r.kategori ? r.kategori : guessKategori(src),
    uraian: (typeof r.uraian === 'string' && r.uraian.trim()) || src.slice(0, 1200),
    pegawai,
    tglMasuk: isIsoDate(r.tglMasuk) ? r.tglMasuk : guessDate(src) || today,
    status: typeof r.status === 'string' ? r.status : 'REVISI',
    ket: typeof r.ket === 'string' ? r.ket : '',
    confidenceNote:
      note ||
      (typeof r.confidenceNote === 'string' && r.confidenceNote) ||
      'Data kuitansi berhasil diekstrak dan disesuaikan dengan format SPJ Setda Kobar.',
  };
}
