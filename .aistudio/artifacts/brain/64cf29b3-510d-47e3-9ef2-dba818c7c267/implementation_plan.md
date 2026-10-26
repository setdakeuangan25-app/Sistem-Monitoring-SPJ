# Fitur Asisten AI Gemini Auto-Fill SPJ Baru

Pengembangan asisten cerdas berbasis AI Gemini untuk mempercepat dan mempermudah pengisian formulir SPJ Baru (*Input SPJ Baru*). Pengguna dapat mengunggah foto dokumen/kuitansi, mengetikkan ringkasan kegiatan, atau merekam suara (*voice input*). AI akan menganalisis data tersebut secara otomatis dan menampilkan modal **Pratinjau & Review Draf** agar pengguna dapat memeriksa hasil ekstraksi sebelum dimasukkan ke dalam form.

---

> [!IMPORTANT]
> **Keputusan Hasil Diskusi & Klarifikasi Pengguna:**
> - **Multi-modal Input**: Mendukung kombinasi Foto Dokumen/Kuitansi (Image Vision), Teks Bebas (Prompt), dan Rekaman Suara / Voice Note (Audio Transcription via Gemini).
> - **Alur Kerja**: **Pratinjau & Review Draf Dulu**. Hasil ekstraksi AI ditampilkan dalam bentuk kartu draf pratinjau yang ringkas. Pengguna dapat mengedit/menyetujui draf tersebut sebelum diterapkan ke formulir SPJ.
> - **Arsitektur Server-Side**: SDK `@google/genai` diproses secara aman di backend server Express (`server.ts`) menggunakan model `gemini-3.8-flash` dengan respon terstruktur JSON Schema.

---

## 1. Overview & Core Concept

- **Apa Yang Dibuat**: Komponen modal asisten AI **"Pindai & Ekstrak SPJ dengan Gemini AI"** di halaman *Input SPJ Baru*.
- **Target Pengguna**: Verifikator & Petugas Keuangan Sekretariat Daerah Kotawaringin Barat yang ingin menginput puluhan kuitansi/SPJ dengan cepat tanpa perlu mengetik ulang semua rincian secara manual.
- **Nilai Utama**: Menghemat waktu penginputan hingga 80%, mengurangi kesalahan ketik (*human error*) pada nama pegawai dan nominal angka, serta mendukung penginputan saat bergerak via rekaman suara atau foto kuitansi langsung.

---

## 2. User Experience & Visual Design

### Alur Pengguna (User Flow)
1. **Pemicu Asisten AI**: Di halaman *Input SPJ Baru*, terdapat tombol banner baru **"Isi Otomatis dengan AI Gemini"** bertema *purple-indigo gradient* dengan ikon kilat/bintang AI.
2. **Modal Input Multimodal**:
   - **Tab 1: Unggah Foto Kuitansi / Dokumen**: Drag-and-drop atau ambil foto kuitansi/SPJ (format PNG/JPG/WebP).
   - **Tab 2: Teks Ringkasan**: Area ketik catatan bebas (misal: *"Perjalanan dinas ke Palangka Raya tanggal 12 Okt 2026 atas nama Budi Rp 2.500.000 dan Ani Rp 1.800.000 Bagian Umum"*).
   - **Tab 3: Rekaman Suara (Voice)**: Tombol rekam suara menggunakan mikrofon peramban untuk menyampaikan rincian kuitansi secara lisan.
3. **Proses Analisis AI**: Animasi pemrosesan transparan yang menampilkan status ekstraksi AI.
4. **Pratinjau & Review Draf**:
   - Kartu pratinjau yang menampilkan hasil ekstraksi terstruktur: *Bagian, Kategori, Uraian, Daftar Pegawai & Nominal, Tanggal, dan Status*.
   - Pengguna dapat mengoreksi data langsung di dalam draf jika ada penyesuaian.
5. **Terapkan ke Form**: Tombol **"Gunakan Data Draf ke Formulir"** secara otomatis mengisi seluruh 5 bagian beraksen warna di form SPJ Baru.

### Desain Visual & Tema
- **Warna & Aksen**: Aksen AI Violet-Indigo (`#7c3aed` ke `#4f46e5`) dengan *glow effect* lembut, dipadukan dengan desain flat yang konsisten.
- **Status Loading & Toast**: Indikator progres yang informatif saat AI memproses gambar/audio/teks.

---

## 3. Key Product Decisions & Trade-Offs

1. **Pemilihan Model Gemini SDK (`@google/genai`)**:
   - *Pilihan*: Model `gemini-3.8-flash` pada server-side Express endpoint (`/api/gemini/extract-spj`).
   - *Alasan*: Kecepatan tinggi, mendukung multimodal (foto, teks, dan audio transcription), serta mendukung `responseSchema` terstruktur JSON.
2. **Pratinjau Draf Sebelum Mengisi Form**:
   - *Pilihan*: Menampilkan modal pratinjau draf terlebih dahulu daripada langsung menimpa form.
   - *Alasan*: Memberikan kontrol penuh dan verifikasi keselamatan kepada pengguna sebelum data dimasukkan.
3. **Ekstraksi Terstruktur Berbasis JSON Schema**:
   - *Pilihan*: Menggunakan `responseMimeType: "application/json"` dan `responseSchema` untuk mengembalikan field `bagian`, `kategori`, `uraian`, `pegawai` (nama & nominal), `tglMasuk`, `status`, dan `ket`.

---

## 4. Technical Architecture & Data Strategy

### Diagram Komponen & Arsitektur System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React Client)                          │
│                                                                             │
│  ┌─────────────────────────┐          ┌──────────────────────────────────┐  │
│  │   SpjForm.tsx           │ ─────────│ AiSpjExtractorModal.tsx          │  │
│  │ (5 Section Form SPJ)    │          │ - Upload Foto Kuitansi           │  │
│  └─────────────────────────┘          │ - Prompt Teks Ringkasan          │  │
│               ▲                       │ - Voice Recorder (Mic Lisan)     │  │
│               │ (Apply Draft Data)    └──────────────────────────────────┘  │
│               │                                         │                   │
└───────────────┼─────────────────────────────────────────┼───────────────────┘
                │                                         │ (POST FormData/JSON)
                │                                         ▼
┌───────────────┼─────────────────────────────────────────────────────────────┐
│               │             SERVER BACKEND (Express / server.ts)            │
│               │                                                             │
│               │                       ┌──────────────────────────────────┐  │
│               └───────────────────────│ POST /api/gemini/extract-spj     │  │
│                                       └──────────────────────────────────┘  │
│                                                         │                   │
│                                                         │ (@google/genai)   │
│                                                         ▼                   │
│                                       ┌──────────────────────────────────┐  │
│                                       │ GoogleGenAI SDK (Server-Side)    │  │
│                                       │ Model: gemini-3.8-flash          │  │
│                                       │ JSON Schema Extraction           │  │
│                                       └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pemetaan Endpoint Server & Skema Respon
- **Endpoint**: `POST /api/gemini/extract-spj`
- **Input**: Multimodal Parts (Base64 Foto/Audio + Teks Prompt)
- **Skema Output JSON**:
  ```json
  {
    "bagian": "UMUM",
    "kategori": "Perjalanan Dinas",
    "uraian": "Biaya perjalanan dinas konsultasi perencanaan anggaran ke Palangka Raya",
    "pegawai": [
      { "nama": "Budi Santoso", "nominal": 2500000 },
      { "nama": "Siti Aminah", "nominal": 1800000 }
    ],
    "tglMasuk": "2026-10-25",
    "status": "ACC",
    "ket": "Lampiran kuitansi dan SPPD lengkap"
  }
  ```

---

## Langkah Pelaksanaan (Execution Steps)

1. **Instalasi Dependency**:
   - Memastikan `@google/genai` terinstal untuk server backend Express.
2. **Pengembangan Server Route (`server.ts`)**:
   - Menambahkan handler `POST /api/gemini/extract-spj` di Express `server.ts`.
   - Konfigurasi `GoogleGenAI` server-side dengan `User-Agent: 'aistudio-build'`.
3. **Pengembangan UI Modal AI Frontend (`AiSpjExtractorModal.tsx`)**:
   - Membuat komponen modal multimodal (Upload Foto, Input Teks, Rekaman Suara Audio Web API).
   - Membuat antarmuka kartu Pratinjau & Review Draf.
4. **Integrasi dengan `SpjForm.tsx`**:
   - Menambahkan tombol pemicu AI di bagian atas form.
   - Mengisi otomatis seluruh 5 section form saat draf disetujui pengguna.
5. **Verifikasi & Pengujian**:
   - Verifikasi kompilasi `compile_applet` dan `lint_applet`.
