import { Router, Request, Response } from 'express';
import { ingestNews } from '../services/ingestionService';
import { processPendingArticles, generateDailyBrief } from '../services/aiService';

const router = Router();

// Simple token-based auth placeholder (could be replaced with real auth)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret-admin-token';

function authCheck(req: Request, res: Response): boolean {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${ADMIN_TOKEN}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// POST /api/admin/ingest – Manually trigger RSS ingestion
router.post('/ingest', async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  try {
    const stats = await ingestNews();
    res.json({ message: 'Ingestion completed', stats });
  } catch (error: any) {
    console.error('Admin ingestion error:', error);
    res.status(500).json({ error: error.message || 'Ingestion failed' });
  }
});

// POST /api/admin/ai/summarize-batch – Process pending articles without AI summaries
// Query: ?limit=50&concurrency=3
router.post('/ai/summarize-batch', async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  const limit       = parseInt(req.query.limit       as string || '50', 10);
  const concurrency = parseInt(req.query.concurrency as string || '3',  10);

  res.json({
    message: `Batch AI summarization started for up to ${limit} articles`,
    status:  'processing'
  });

  processPendingArticles(limit, concurrency).then(stats => {
    console.log('✅ Admin batch summarization complete:', stats);
  }).catch(err => {
    console.error('❌ Admin batch summarization error:', err.message);
  });
});

// POST /api/admin/ai/generate-brief – Manually trigger daily brief generation
// Query: ?date=YYYY-MM-DD (optional, defaults to today)
router.post('/ai/generate-brief', async (req: Request, res: Response) => {
  if (!authCheck(req, res)) return;
  try {
    const rawDate = req.query.date as string | undefined;
    const date    = rawDate ? new Date(rawDate) : new Date();

    if (isNaN(date.getTime())) {
      res.status(400).json({ error: 'Invalid date. Use ?date=YYYY-MM-DD' });
      return;
    }

    const brief = await generateDailyBrief(date);
    if (!brief) {
      res.status(500).json({ error: 'Brief generation failed – check AI service logs' });
      return;
    }

    res.json({
      message: 'Daily Brief generated successfully',
      brief: {
        id:          brief.id,
        date:        brief.date,
        title:       brief.title,
        wordCount:   brief.content.split(' ').length,
        generatedAt: brief.generatedAt
      }
    });
  } catch (error: any) {
    console.error('Admin brief generation error:', error);
    res.status(500).json({ error: error.message || 'Brief generation failed' });
  }
});

export default router;

