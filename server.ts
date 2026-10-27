import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { completeSpj } from './src/utils/fallbackExtract';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and generous JSON limit for receipt images & audio recordings
app.use(cors());
app.use(express.json({ limit: '35mb' }));

// Helper to get GoogleGenAI client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// SPJ Extraction Endpoint
app.post('/api/gemini/extract-spj', async (req: Request, res: Response) => {
  try {
    const { text, imageBase64, imageMimeType, audioBase64, audioMimeType, today } = req.body;
    const todayStr: string =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Pontianak' });

    // Tidak ada masukan sama sekali: tetap kembalikan draf kosong yang valid, bukan error.
    if (!text && !imageBase64 && !audioBase64) {
      return res.json({
        success: true,
        data: completeSpj(null, '', todayStr, 'Tidak ada masukan terbaca. Silakan lengkapi draf secara manual.'),
      });
    }

    const ai = getGenAI();

    // Prepare multimodal parts
    const parts: any[] = [];

    // System prompt & guidance
    const promptInstructions = `
Ekstrak informasi SPJ (Surat Pertanggungjawaban) dari masukan berikut (bisa berupa dokumen/kuitansi PDF/gambar, rekaman suara/dikte, dan/atau teks ringkasan) ke format data SPJ terstruktur Sekretariat Daerah Kotawaringin Barat (Setda Kobar).

Aturan Format & Ekstraksi Khusus:
1. bagian: Jika tidak disebutkan secara eksplisit pada kuitansi/dokumen/suara, KOSONGKAN (kembalikan string kosong ""). Jika ada bagian Setda yang disebutkan (misal: "UMUM", "PEMBANGUNAN", "KESRA", "EKONOMI", "HUKUM", "PBJ", "ORGANISASI", "PEMERINTAHAN", "PROKOM"), gunakan nama bagian tersebut. Jika tidak pasti atau tidak tertulis jelas, KOSONGKAN ("").

2. kategori: Jika tidak disebutkan secara eksplisit, KOSONGKAN (kembalikan string kosong ""). Jika disebutkan, gunakan salah satu: "Belanja Langsung" atau "Perjalanan Dinas".

3. status: Nilai default adalah "REVISI" (sesuai standar verifikasi awal berkas Setda Kobar). Kembalikan "REVISI" sebagai status rekomendasi utama, kecuali user secara spesifik menyatakan ACC.

4. uraian: Salin dan susun secara LENGKAP & UTUH teks dari kolom "Untuk Pembayaran" pada kuitansi. Wajib menyertakan seluruh kalimat pekerjaan/belanja dan rincian dasar dokumen pendukung beserta nomor dan tanggalnya (seperti Surat Pesanan / SP, Berita Acara Pembayaran / BAP, Berita Acara Serah Terima Pekerjaan / BASTP, dll).
Contoh format susunan uraian yang diharapkan:
Pekerjaan Belanja Bahan-Bahan Lainnya Keperluan Sekretariat Daerah Kabupaten Kotawaringin Barat, Sub Kegiatan Penyediaan Peralatan Rumah Tangga, Kegiatan Administrasi Umum Perangkat Daerah
Berdasarkan:
- Surat Pesanan (SP) No.: 027/SP. 45/BU.III tanggal 19 Oktober 2026
- Berita Acara Pembayaran (BAP) No.: 900/BAP.63/BU tanggal 22 Oktober 2026
- Berita Acara Serah Terima Hasil Pekerjaan (BASTP) No.: 027/BASTP-52/X/2026/BU tanggal 21 Oktober 2026

5. pegawai: Daftar penerima / rekanan penyedia (misal: "CV ESARINDO MULTIGUNA LESTARI") beserta nominal total rupiah kuitansi dalam bentuk angka bulat (misal: 6017310 dari "Rp. 6.017.310,-"). Jika kuitansi mencantumkan nama perusahaan/CV/Toko pada stempel penerima ("Yang Menerima"), utamakan nama CV / Toko rekanan tersebut.

6. ket: Default KOSONGKAN (kembalikan string kosong ""), kecuali jika ada catatan khusus dari masukan user.

7. tglMasuk: Gunakan tanggal kuitansi/pembayaran (format YYYY-MM-DD), atau tanggal hari ini jika tidak tertera jelas.

8. confidenceNote: Ringkasan singkat (1 kalimat) tentang rekanan, nominal, dan berkas yang berhasil dibaca.

9. Jika rekaman suara/dikte kosong, tidak jelas, atau tidak berisi data SPJ, JANGAN gagal: gunakan dokumen/foto dan teks lain yang tersedia. Jika hanya teks pendek yang ada, susun uraian dan pegawai sebaik mungkin dari teks itu. Selalu kembalikan JSON lengkap.
`;

    // Attach document/image if present (supports PDF, JPG, PNG, WEBP)
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType || 'image/jpeg',
          data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
        },
      });
    }

    // Attach audio if present (dipisah agar bisa dibuang saat percobaan ulang)
    const audioPart = audioBase64
      ? {
          inlineData: {
            mimeType: audioMimeType || 'audio/webm',
            data: audioBase64.replace(/^data:[^;]+;base64,/, ''),
          },
        }
      : null;
    if (audioPart) parts.push(audioPart);

    // Attach user text context & extraction prompt
    const userContext = text ? `\nKeterangan / Input Tambahan Pengguna:\n"${text}"` : '';
    parts.push({
      text: `${promptInstructions}\n${userContext}`,
    });

    // Resilient model selection: gemini-3.1-flash-lite is fast & highly responsive
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
    let response: any = null;
    let lastModelError: any = null;

    // Coba semua model dengan audio, lalu semua model tanpa audio (audio kosong/rusak tidak boleh menggagalkan hasil)
    const attempts = [
      ...candidateModels.map((model) => ({ model, contents: parts })),
      ...(audioPart
        ? candidateModels.map((model) => ({ model, contents: parts.filter((p) => p !== audioPart) }))
        : []),
    ];

    for (const { model, contents } of attempts) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction:
              'Anda adalah asisten AI resmi verifikasi SPJ Pemerintah Kabupaten Kotawaringin Barat. Ekstraksi data harus presisi sesuai kuitansi, nama rekanan lengkap, uraian mencakup seluruh rincian dokumen pendukung, dan nominal rupiah akurat.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bagian: {
                  type: Type.STRING,
                  description:
                    'Nama Bagian Setda Kobar jika tertera jelas, atau string kosong jika tidak tertera',
                },
                kategori: {
                  type: Type.STRING,
                  description: 'Belanja Langsung atau Perjalanan Dinas, atau string kosong jika tidak tertera',
                },
                uraian: {
                  type: Type.STRING,
                  description:
                    'Uraian keperluan belanja kuitansi secara lengkap beserta rincian SP, BAP, BASTP',
                },
                pegawai: {
                  type: Type.ARRAY,
                  description: 'Daftar penerima belanja / nama CV rekanan dan nominal rupiah',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nama: { type: Type.STRING, description: 'Nama rekanan / toko / pegawai penerima' },
                      nominal: { type: Type.NUMBER, description: 'Nominal dalam rupiah tanpa simbol/titik' },
                    },
                    required: ['nama', 'nominal'],
                  },
                },
                tglMasuk: {
                  type: Type.STRING,
                  description: 'Tanggal dalam format YYYY-MM-DD',
                },
                status: {
                  type: Type.STRING,
                  description: 'Status verifikasi (default REVISI)',
                },
                ket: {
                  type: Type.STRING,
                  description: 'Catatan tambahan (default kosong)',
                },
                confidenceNote: {
                  type: Type.STRING,
                  description: 'Ringkasan ekstraksi berkas',
                },
              },
              required: ['uraian', 'pegawai', 'tglMasuk'],
            },
          },
        });

        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastModelError = err;
        console.warn(`Model ${model} unavailable or error, trying fallback...`, err?.message);
      }
    }

    if (!response || !response.text) {
      throw lastModelError || new Error('Tidak mendapatkan respon dari layanan AI Gemini.');
    }

    const rawText = response.text || '{}';
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = null;
    }

    return res.json({
      success: true,
      data: completeSpj(parsedData, text || '', todayStr),
    });
  } catch (error: any) {
    console.error('Gemini extraction error:', error);
    // AI gagal: tetap hasilkan draf dari masukan yang ada agar proses berhasil.
    const body = req.body || {};
    const fallbackToday =
      typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
        ? body.today
        : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Pontianak' });
    return res.json({
      success: true,
      data: completeSpj(
        null,
        typeof body.text === 'string' ? body.text : '',
        fallbackToday,
        `Layanan AI tidak merespons (${error?.message || 'kesalahan tidak diketahui'}). Draf disusun otomatis dari masukan yang ada, mohon periksa kembali.`,
      ),
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
