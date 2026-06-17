import { Router, Request, Response, NextFunction } from 'express';
import {
  getAiSummary,
  triggerSummarize,
  triggerBatchSummarize,
  getTodaysBrief,
  getBriefByDate,
  listDailyBriefs,
  triggerGenerateBrief,
  getTags,
  getFlaggedArticles,
  getStats
} from '../controllers/aiController';

const router = Router();

// Simple token-based auth middleware for admin-only endpoints
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret-admin-token';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${ADMIN_TOKEN}`) {
    res.status(401).json({ error: 'Unauthorized – admin token required' });
    return;
  }
  next();
}

// ── Public Endpoints ──────────────────────────────────────────────────────────

// GET  /api/ai/summary/:articleId   – Get AI summary for a specific article
router.get('/summary/:articleId', getAiSummary);

// GET  /api/ai/daily-brief          – Get today's morning brief
router.get('/daily-brief', getTodaysBrief);

// GET  /api/ai/daily-briefs         – List all published daily briefs (paginated)
router.get('/daily-briefs', listDailyBriefs);

// GET  /api/ai/daily-brief/:date    – Get brief for a specific date (YYYY-MM-DD)
router.get('/daily-brief/:date', getBriefByDate);

// GET  /api/ai/tags                 – List all auto-generated article tags
router.get('/tags', getTags);

// GET  /api/ai/stats                – AI processing statistics
router.get('/stats', getStats);

// ── Admin-Protected Endpoints ─────────────────────────────────────────────────

// POST /api/ai/summarize/:articleId – (Re-)generate AI summary for one article
router.post('/summarize/:articleId', requireAdmin, triggerSummarize);

// POST /api/ai/summarize-batch      – Process all pending articles in background
// Query params: ?limit=50&concurrency=3
router.post('/summarize-batch', requireAdmin, triggerBatchSummarize);

// POST /api/ai/generate-brief       – Manually generate daily brief
// Query params: ?date=YYYY-MM-DD (optional, defaults to today)
router.post('/generate-brief', requireAdmin, triggerGenerateBrief);

// GET  /api/ai/flagged              – Articles flagged for low-confidence review
router.get('/flagged', requireAdmin, getFlaggedArticles);

export default router;
