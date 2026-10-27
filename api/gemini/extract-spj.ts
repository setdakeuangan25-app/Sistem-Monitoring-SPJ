// Fungsi serverless Vercel: POST /api/gemini/extract-spj
// Butuh environment variable GEMINI_API_KEY di Vercel (Project Settings → Environment Variables).
import { extractSpj } from '../../src/server/extractSpj.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Gunakan metode POST.' });
    return;
  }
  res.status(200).json(await extractSpj(req.body));
}
