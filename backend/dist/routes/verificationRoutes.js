"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verificationController_1 = require("../controllers/verificationController");
const router = (0, express_1.Router)();
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
// GET  /api/verification/report/:articleId – Get verification report for an article
router.get('/report/:articleId', verificationController_1.getVerificationReport);
// ── Admin Endpoints ───────────────────────────────────────────────────────────
// POST /api/verification/verify/:articleId – Manually run/rerun verification checks
router.post('/verify/:articleId', requireAdmin, verificationController_1.triggerVerification);
// POST /api/verification/override/:articleId – Manually override credibility status and score
router.post('/override/:articleId', requireAdmin, verificationController_1.overrideReport);
// GET  /api/verification/flagged – List all flagged articles for admin dashboard
router.get('/flagged', requireAdmin, verificationController_1.getFlaggedReports);
exports.default = router;
