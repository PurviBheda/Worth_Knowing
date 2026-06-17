import { Router, Request, Response, NextFunction } from 'express';
import {
  getVerificationReport,
  triggerVerification,
  overrideReport,
  getFlaggedReports
} from '../controllers/verificationController';

const router = Router();

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

// GET  /api/verification/report/:articleId – Get verification report for an article
router.get('/report/:articleId', getVerificationReport);

// ── Admin Endpoints ───────────────────────────────────────────────────────────

// POST /api/verification/verify/:articleId – Manually run/rerun verification checks
router.post('/verify/:articleId', requireAdmin, triggerVerification);

// POST /api/verification/override/:articleId – Manually override credibility status and score
router.post('/override/:articleId', requireAdmin, overrideReport);

// GET  /api/verification/flagged – List all flagged articles for admin dashboard
router.get('/flagged', requireAdmin, getFlaggedReports);

export default router;
