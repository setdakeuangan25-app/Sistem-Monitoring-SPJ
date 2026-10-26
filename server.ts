import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

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
    const { text, imageBase64, imageMimeType, audioBase64, audioMimeType } = req.body;

    if (!text && !imageBase64 && !audioBase64) {
      return res.status(400).json({
        success: false,
        error: 'Mohon sertakan teks keterangan, foto kuitansi/dokumen, atau rekaman suara.',
      });
    }

    const ai = getGenAI();

    // Prepare multimodal parts
    const parts: any[] = [];

    // System prompt & guidance
    const promptInstructions = `
Ekstrak informasi SPJ (Surat Pertanggungjawaban) dari masukan berikut (bisa berupa foto kuitansi/dokumen dinas, rekaman suara, dan/atau teks ringkasan) ke format data SPJ terstruktur Sekretariat Daerah Kotawaringin Barat (Setda Kobar).

Ketentuan Ekstraksi:
1. bagian: Pilih salah satu dari nilai berikut:
   - "UMUM" (bagian umum, perlengkapan, operasional pimpinan, sekretariat)
   - "PEMBANGUNAN" (bagian administrasi pembangunan, monev)
   - "KESRA" (bagian kesejahteraan rakyat, keagamaan, sosial)
   - "EKONOMI" (bagian perekonomian, sda)
   - "HUKUM" (bagian hukum, perundang-undangan)
   - "PBJ" (pengadaan barang dan jasa)
   - "ORGANISASI" (bagian organisasi, kelembagaan, anjab)
   - "PEMERINTAHAN" (bagian tata pemerintahan, perbatasan)
   - "PROKOM" (bagian protokol dan komunikasi pimpinan, humas)
   Jika tidak disebutkan eksplisit, analisis dari konteks kegiatan.

2. kategori:
   - "Perjalanan Dinas" jika terkait SPT, tiket, transport, uang harian, perjalanan dinas luar/dalam daerah.
   - "Belanja Langsung" jika belanja barang, jasa, konsumsi makan minum rapat, ATK, pemeliharaan, servis, sewa, dsb.

3. uraian: Buat kalimat ringkas, formal, dan jelas mengenai maksud belanja/perjalanan SPJ.

4. pegawai: Daftar penerima / pegawai yang bertanggung jawab beserta nominal masing-masing (angka tanpa titik/koma desimal).
   Jika hanya ada 1 penerima / toko / pihak ketiga, masukkan namanya dan total nominal kuitansi.
   Jika ada rincian beberapa pegawai, pecah menjadi list penerima masing-masing.

5. tglMasuk: Format YYYY-MM-DD. Ambil dari tanggal kuitansi / nota belanja / surat tugas jika ada. Jika tidak tertera jelas, gunakan tanggal hari ini.

6. status: Rekomendasi status verifikasi: "ACC", "REVISI", atau "PROSES".

7. ket: Catatan verifikator mengenai kelengkapan berkas (misal: "Kuitansi bermaterai cukup", "Nota rincian belanja terlampir", dll).

8. confidenceNote: Catatan singkat (1-2 kalimat) untuk user tentang apa saja yang berhasil dibaca oleh AI dari kuitansi/suara/teks.
`;

    // Attach image if present
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType || 'image/jpeg',
          data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
        },
      });
    }

    // Attach audio if present
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: audioMimeType || 'audio/webm',
          data: audioBase64.replace(/^data:[^;]+;base64,/, ''),
        },
      });
    }

    // Attach user text context & extraction prompt
    const userContext = text ? `\nKeterangan / Input Tambahan Pengguna:\n"${text}"` : '';
    parts.push({
      text: `${promptInstructions}\n${userContext}`,
    });

    // Resilient model selection: gemini-3.1-flash-lite is fast & highly responsive
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let response: any = null;
    let lastModelError: any = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: parts,
          config: {
            systemInstruction:
              'Anda adalah asisten AI resmi verifikasi SPJ Pemerintah Kabupaten Kotawaringin Barat. Ekstraksi data harus teliti, nominal akurat sesuai angka di kuitansi/suara, dan nama terformat rapi.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bagian: {
                  type: Type.STRING,
                  description:
                    'Salah satu dari: UMUM, PEMBANGUNAN, KESRA, EKONOMI, HUKUM, PBJ, ORGANISASI, PEMERINTAHAN, PROKOM',
                },
                kategori: {
                  type: Type.STRING,
                  description: 'Perjalanan Dinas atau Belanja Langsung',
                },
                uraian: {
                  type: Type.STRING,
                  description: 'Uraian keperluan kegiatan SPJ secara lengkap dan baku',
                },
                pegawai: {
                  type: Type.ARRAY,
                  description: 'Daftar penerima dengan nama dan nominal rupiah',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nama: { type: Type.STRING, description: 'Nama pegawai atau nama rekanan / toko' },
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
                  description: 'Status rekomendasi: ACC, REVISI, atau PROSES',
                },
                ket: {
                  type: Type.STRING,
                  description: 'Keterangan verifikasi berkas',
                },
                confidenceNote: {
                  type: Type.STRING,
                  description: 'Ringkasan apa saja data yang berhasil diekstrak oleh AI',
                },
              },
              required: ['bagian', 'kategori', 'uraian', 'pegawai', 'tglMasuk'],
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
    const parsedData = JSON.parse(rawText);

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Gemini extraction error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Terjadi kesalahan saat memproses data dengan AI Gemini.',
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
