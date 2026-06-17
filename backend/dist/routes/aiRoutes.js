"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const router = (0, express_1.Router)();
// Simple token-based auth middleware for admin-only endpoints
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret-admin-token';
function requireAdmin(req, res, next) {
    const token = req.headers['authorization'];
    if (token !== `Bearer ${ADMIN_TOKEN}`) {
        res.status(401).json({ error: 'Unauthorized – admin token required' });
        return;
    }
    next();
}
// ── Public Endpoints ──────────────────────────────────────────────────────────
// GET  /api/ai/summary/:articleId   – Get AI summary for a specific article
router.get('/summary/:articleId', aiController_1.getAiSummary);
// GET  /api/ai/daily-brief          – Get today's morning brief
router.get('/daily-brief', aiController_1.getTodaysBrief);
// GET  /api/ai/daily-briefs         – List all published daily briefs (paginated)
router.get('/daily-briefs', aiController_1.listDailyBriefs);
// GET  /api/ai/daily-brief/:date    – Get brief for a specific date (YYYY-MM-DD)
router.get('/daily-brief/:date', aiController_1.getBriefByDate);
// GET  /api/ai/tags                 – List all auto-generated article tags
router.get('/tags', aiController_1.getTags);
// GET  /api/ai/stats                – AI processing statistics
router.get('/stats', aiController_1.getStats);
// ── Admin-Protected Endpoints ─────────────────────────────────────────────────
// POST /api/ai/summarize/:articleId – (Re-)generate AI summary for one article
router.post('/summarize/:articleId', requireAdmin, aiController_1.triggerSummarize);
// POST /api/ai/summarize-batch      – Process all pending articles in background
// Query params: ?limit=50&concurrency=3
router.post('/summarize-batch', requireAdmin, aiController_1.triggerBatchSummarize);
// POST /api/ai/generate-brief       – Manually generate daily brief
// Query params: ?date=YYYY-MM-DD (optional, defaults to today)
router.post('/generate-brief', requireAdmin, aiController_1.triggerGenerateBrief);
// GET  /api/ai/flagged              – Articles flagged for low-confidence review
router.get('/flagged', requireAdmin, aiController_1.getFlaggedArticles);
exports.default = router;
