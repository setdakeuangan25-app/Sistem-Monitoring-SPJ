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

import { extractSpjWithGemini } from './src/utils/geminiExtractor';

// SPJ Extraction Endpoint
app.post('/api/gemini/extract-spj', async (req: Request, res: Response) => {
  try {
    const result = await extractSpjWithGemini(req.body || {});
    return res.json(result);
  } catch (error: any) {
    console.error('Gemini extraction error:', error);
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
