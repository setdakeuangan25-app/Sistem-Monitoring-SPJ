// Impor data lama dari CSV Google Sheet ke Supabase.
//
// Pakai:
//   1. Isi .env.import (lihat .env.import.example).
//   2. Ekspor Sheet: File -> Download -> Comma-separated values (.csv).
//   3. Uji dulu:   npm run import:sheet -- data/spj.csv --dry-run
//   4. Impor asli: npm run import:sheet -- data/spj.csv
//
// Opsi:
//   --dry-run  hanya tampilkan ringkasan, tidak menulis ke database
//   --force    tetap impor walau tabel spj sudah berisi data
//
// Kolom CSV (urutan sama dengan Sheet lama, baris 1 = header):
//   0 No | 1 Bagian | 2 Kategori | 3 Uraian | 4 Nama | 5 Nominal | 6 Total Nominal
//   7 Status | 8 Tgl Masuk | 9 Tgl Keluar | 10 Tgl Berkas | 11 Tgl Bayar | 12 Keterangan | 13 ID_SPJ
//
// Format tanggal CSV diasumsikan hari/bulan/tahun (d/m/yyyy) atau yyyy-mm-dd,
// atau nama bulan Indonesia ("5 Maret 2026").

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const DRY = args.includes('--dry-run');
const FORCE = args.includes('--force');

if (!file) {
  console.error('Pemakaian: npm run import:sheet -- <file.csv> [--dry-run] [--force]');
  process.exit(1);
}

const BAGIAN = ['UMUM', 'PEMBANGUNAN', 'KESRA', 'EKONOMI', 'HUKUM', 'PBJ', 'ORGANISASI', 'PEMERINTAHAN', 'PROKOM'];
const BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];

const warnings = [];
const warn = (msg) => warnings.push(msg);
const s = (v) => String(v ?? '').trim();
const digits = (v) => s(v).replace(/[^\d]/g, '');

function pad(n) { return String(n).padStart(2, '0'); }
function iso(y, m, d) {
  const yy = Number(y), mm = Number(m), dd = Number(d);
  if (yy < 1900 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yy}-${pad(mm)}-${pad(dd)}`;
}

function parseDate(raw, ctx) {
  const v = s(raw);
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(m[1], m[2], m[3]);
  m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return iso(m[3], m[2], m[1]);
  m = v.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (m && BULAN.indexOf(m[2]) >= 0) return iso(m[3], BULAN.indexOf(m[2]) + 1, m[1]);
  warn(`${ctx}: tanggal tidak dikenali "${v}" -> dikosongkan`);
  return null;
}

function normStatus(raw) {
  const v = s(raw).toUpperCase();
  if (v === 'ACC') return 'ACC';
  if (v === 'REVISI') return 'REVISI';
  return null;
}

function normKategori(raw, ctx) {
  const v = s(raw);
  if (/dinas/i.test(v)) return 'Perjalanan Dinas';
  if (/belanja/i.test(v)) return 'Belanja Langsung';
  if (v) warn(`${ctx}: kategori tidak umum "${v}" disimpan apa adanya`);
  return v || 'Belanja Langsung';
}

// ---- Baca CSV ----
const records = parse(readFileSync(file, 'utf8'), {
  relax_column_count: true,
  skip_empty_lines: false,
  bom: true,
});
const rows = records.slice(1); // buang header

// ---- Kelompokkan baris (logika sama dengan getAppData di Code.gs) ----
const groups = new Map();
let lastId = 'DEFAULT_ID';
let skippedEmpty = 0;

rows.forEach((row, i) => {
  const c = (n) => s(row[n]);
  const idSpj = c(13), no = c(0), bagian = c(1), kategori = c(2), uraian = c(3), nama = c(4), nominal = c(5), totalNom = c(6);
  if (!no && !bagian && !uraian && !nama && !kategori) { skippedEmpty++; return; }

  let cur;
  if (idSpj) cur = idSpj;
  else if (no || bagian || uraian) cur = 'OLD_' + i;
  else cur = lastId;
  lastId = cur;

  if (!groups.has(cur)) {
    groups.set(cur, {
      key: cur, line: i + 2,
      no, bagian, kategori, uraian, totalNom,
      status: c(7), tglMasuk: c(8), tglKeluar: c(9), tglBerkas: c(10), tglBayar: c(11), ket: c(12),
      names: [], noms: [],
    });
  }
  const g = groups.get(cur);
  if (nama) g.names.push(nama);
  if (nominal) g.noms.push(nominal);
  if (totalNom && !g.totalNom) g.totalNom = totalNom;
});

// ---- Format lama: "Nama (Rp 1.000.000) | Nama2 (Rp 500.000)" di kolom Nama ----
function expandLegacy(g) {
  if (g.noms.length > 0) return;
  const joined = g.names.join('\n');
  if (!(joined.includes(' | ') || /\(\s*Rp/i.test(joined))) return;
  const parts = joined.includes('\n') ? joined.split('\n') : joined.split(' | ');
  const names = [], noms = [];
  for (const p of parts) {
    const m = p.match(/^(.*?)\s*\(\s*Rp\s*([\d.,]+)\s*\)$/i);
    if (m) { names.push(m[1].trim()); noms.push(digits(m[2])); }
    else if (p.trim()) { names.push(p.trim()); noms.push('0'); }
  }
  g.names = names; g.noms = noms;
}

// ---- Bentuk record siap insert ----
const spjRows = [];
const pegawaiRows = [];
let totalSheetMismatch = 0;
const base = Date.now() - groups.size * 1000;
let idx = 0;

for (const g of groups.values()) {
  expandLegacy(g);
  const ctx = `Baris ${g.line}`;
  const bagian = s(g.bagian).toUpperCase();
  if (!BAGIAN.includes(bagian)) { warn(`${ctx}: bagian "${g.bagian}" tidak valid -> SPJ dilewati`); continue; }
  if (!g.uraian) { warn(`${ctx}: uraian kosong -> SPJ dilewati`); continue; }

  const pegawai = g.names.map((nama, k) => ({ nama, nominal: Number(digits(g.noms[k]) || 0) }));
  if (pegawai.length === 0) { warn(`${ctx}: tidak ada pegawai -> SPJ dilewati`); continue; }

  const sum = pegawai.reduce((a, p) => a + p.nominal, 0);
  const sheetTotal = Number(digits(g.totalNom) || 0);
  if (sheetTotal && sheetTotal !== sum) {
    totalSheetMismatch++;
    warn(`${ctx}: total Sheet ${sheetTotal} != jumlah pegawai ${sum} -> pakai jumlah pegawai`);
  }

  const id = randomUUID();
  spjRows.push({
    id,
    no: g.no || null,
    bagian,
    kategori: normKategori(g.kategori, ctx),
    uraian: g.uraian,
    status: normStatus(g.status),
    total_nominal: sum || sheetTotal,
    tgl_masuk: parseDate(g.tglMasuk, ctx),
    tgl_keluar: parseDate(g.tglKeluar, ctx),
    tgl_berkas: parseDate(g.tglBerkas, ctx),
    tgl_bayar: parseDate(g.tglBayar, ctx),
    ket: g.ket || null,
    // urutan Sheet lama: baris atas = paling lama. Register menampilkan created_at terbaru di atas.
    created_at: new Date(base + idx * 1000).toISOString(),
  });
  pegawai.forEach((p, k) => pegawaiRows.push({ spj_id: id, urutan: k, nama: p.nama, nominal: p.nominal }));
  idx++;
}

const totalNominal = spjRows.reduce((a, r) => a + Number(r.total_nominal), 0);

// ---- Ringkasan ----
function report(prefix) {
  console.log(`\n${prefix}`);
  console.log(`  Baris data dibaca     : ${rows.length - skippedEmpty}`);
  console.log(`  Baris kosong dilewati : ${skippedEmpty}`);
  console.log(`  SPJ siap impor        : ${spjRows.length}`);
  console.log(`  Pegawai siap impor    : ${pegawaiRows.length}`);
  console.log(`  Total nominal         : Rp ${totalNominal.toLocaleString('id-ID')}`);
  console.log(`  Selisih total Sheet   : ${totalSheetMismatch} SPJ`);
  console.log(`  Peringatan            : ${warnings.length}`);
  warnings.slice(0, 50).forEach((w) => console.log('   - ' + w));
  if (warnings.length > 50) console.log(`   ... dan ${warnings.length - 50} peringatan lain`);
}

if (DRY) {
  report('DRY RUN (tidak ada data ditulis)');
  process.exit(0);
}

// ---- Tulis ke Supabase ----
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.import');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const { count, error: cErr } = await sb.from('spj').select('id', { count: 'exact', head: true });
if (cErr) { console.error('Gagal cek tabel spj:', cErr.message); process.exit(1); }
if ((count ?? 0) > 0 && !FORCE) {
  console.error(`Tabel spj sudah berisi ${count} data. Impor dibatalkan agar tidak dobel. Pakai --force bila memang disengaja.`);
  process.exit(1);
}

async function insertChunks(table, list, size) {
  for (let i = 0; i < list.length; i += size) {
    const { error } = await sb.from(table).insert(list.slice(i, i + size));
    if (error) throw new Error(`${table} (batch ${i / size + 1}): ${error.message}`);
  }
}

try {
  await insertChunks('spj', spjRows, 200);
  await insertChunks('spj_pegawai', pegawaiRows, 500);
  report('IMPOR SELESAI');
} catch (e) {
  console.error('\nIMPOR GAGAL:', e.message);
  console.error('Data yang sempat masuk bisa dihapus lewat SQL Editor: delete from spj; (pegawai ikut terhapus). Lalu ulangi.');
  process.exit(1);
}
