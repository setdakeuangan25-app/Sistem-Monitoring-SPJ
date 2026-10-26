import type { IncomingMessage, ServerResponse } from 'http';
import { extractSpjWithGemini } from '../../src/utils/geminiExtractor';
import { completeSpj } from '../../src/utils/fallbackExtract';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '30mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = req.body;
  const body = typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : (rawBody || {});

  try {
    const result = await extractSpjWithGemini(body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Vercel API extract-spj error:', error);
    const fallbackToday =
      typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
        ? body.today
        : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Pontianak' });

    return res.status(200).json({
      success: true,
      data: completeSpj(
        null,
        typeof body.text === 'string' ? body.text : '',
        fallbackToday,
        `Layanan AI tidak merespons (${error?.message || 'kesalahan konfigurasi/kuota'}). Draf disusun otomatis dari masukan yang ada.`,
      ),
    });
  }
}
