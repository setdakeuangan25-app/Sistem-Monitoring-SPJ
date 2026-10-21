# Sistem Monitoring SPJ - Setda Kobar

Migrasi dari Google Apps Script + Google Sheet ke **Vite + React + TypeScript**, **Supabase** (Postgres + Auth), dan **Vercel**.

## Isi project

```
src/api/spj.ts            query Supabase (pengganti Code.gs)
src/components/           Dashboard, Register, SpjForm, Login, Header, Loader
src/utils/                filter, format, export Excel/PDF, cetak kartu (canvas)
supabase/schema.sql       tabel, RLS, RPC save_spj
scripts/import-from-sheet.mjs   impor CSV dari Sheet lama
vercel.json               rewrite SPA
```

## 1. Siapkan Supabase

1. Buat project di https://supabase.com (region terdekat, misalnya Singapore).
2. Buka **SQL Editor -> New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
3. Buka **Authentication -> Providers -> Email**. Matikan **Allow new users to sign up** (agar orang luar tidak bisa mendaftar sendiri).
4. Buka **Authentication -> Users -> Add user -> Create new user**. Isi email dan password, centang auto confirm. Buat satu akun per pengguna.
5. Buka **Project Settings -> API**. Salin **Project URL** dan **anon public key**.

## 2. Jalankan di komputer sendiri

Butuh Node.js 20.6 atau lebih baru.

```bash
npm install
cp .env.example .env      # lalu isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
npm run dev               # buka http://localhost:3000
```

Cek tipe (opsional): `npm run typecheck`.

## 3. Impor data lama dari Google Sheet

1. Di Google Sheet: **File -> Download -> Comma-separated values (.csv)**. Simpan misalnya sebagai `data/spj.csv`. Folder `data/` dan file `*.csv` sudah diabaikan Git.
2. Salin `.env.import.example` menjadi `.env.import`, isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` (Project Settings -> API -> service_role). Kunci ini hanya untuk komputer Anda. Jangan commit dan jangan taruh di Vercel.
3. Uji dulu tanpa menulis data:
   ```bash
   npm run import:sheet -- data/spj.csv --dry-run
   ```
4. Cocokkan ringkasan dengan Sheet: jumlah SPJ dan **total nominal**. Baca daftar peringatan (tanggal tidak dikenali, bagian tidak valid, dan sebagainya).
5. Impor asli:
   ```bash
   npm run import:sheet -- data/spj.csv
   ```
   Skrip menolak jalan bila tabel `spj` sudah berisi data. Pakai `--force` hanya bila disengaja.

Catatan format: tanggal CSV dibaca sebagai `d/m/yyyy`, `yyyy-mm-dd`, atau nama bulan Indonesia ("5 Maret 2026").

## 4. Upload ke GitHub

1. Buat repository kosong di https://github.com/new (disarankan **Private**, tanpa README).
2. Di folder project:
   ```bash
   git init
   git add .
   git commit -m "Migrasi SPJ ke Vite + Supabase"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
3. Pastikan file `.env` dan `.env.import` **tidak** ikut ter-upload (sudah ada di `.gitignore`). Cek di halaman repository.

## 5. Deploy ke Vercel

1. Masuk https://vercel.com dengan akun GitHub, klik **Add New -> Project**, pilih repository tadi.
2. Framework terdeteksi **Vite**. Biarkan Build Command `npm run build` dan Output Directory `dist`.
3. Buka **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Klik **Deploy**. Setiap `git push` ke `main` memicu deploy ulang otomatis.

## 6. Sinkron ke Google AI Studio

Per dokumentasi Google, Build mode mendukung impor dan sinkron dua arah dengan GitHub. Menu bisa berubah, jadi cek tampilan terbaru.

1. Buka https://aistudio.google.com, masuk ke **Build**.
2. Di kotak prompt, klik ikon **+ (Add files)** lalu pilih **Import from GitHub**. Izinkan akses GitHub App, pilih repository ini.
3. Untuk sinkron dua arah, buka **Settings -> GitHub** di AI Studio. Dari sana Anda bisa push perubahan ke repository (dengan pesan commit otomatis) dan pull perubahan dari GitHub.
4. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di pengaturan environment/secret workspace AI Studio bila tersedia.
5. AI Studio dapat menyesuaikan struktur project agar cocok dengan runtime-nya. Setelah impor, periksa `package.json`, `vite.config.ts`, dan `.gitignore` sebelum push balik. Lakukan push/pull di AI Studio dan di komputer bergantian, jangan bersamaan, agar tidak konflik.

## Perbedaan dengan versi GAS

- Wajib login (email + password Supabase). Versi lama terbuka untuk siapa saja yang punya link.
- Data relasional: tabel `spj` dan `spj_pegawai`. Total nominal dihitung otomatis dari jumlah nominal pegawai.
- Simpan dan edit SPJ berjalan atomik lewat fungsi Postgres `save_spj`.
- Status disimpan sebagai `ACC`, `REVISI`, atau kosong. Tampilan tetap "Revisi".
- Aplikasi mengambil data per 1000 baris karena batas API Supabase.

## Checklist uji sebelum mematikan GAS

- [ ] Jumlah SPJ dan total nominal di Dashboard sama dengan Sheet.
- [ ] Input SPJ baru dengan 3 pegawai, cek total dan tampilan di Register.
- [ ] Edit SPJ, ubah pegawai dan status, simpan.
- [ ] Hapus SPJ uji.
- [ ] Filter bagian, kategori, tanggal, kata kunci, dan sort kolom.
- [ ] Export Excel dan PDF dari data terfilter.
- [ ] Cetak kartu untuk satu SPJ Perjalanan Dinas dan satu Belanja Langsung, bandingkan dengan hasil lama.
- [ ] Akses tanpa login ditolak.
