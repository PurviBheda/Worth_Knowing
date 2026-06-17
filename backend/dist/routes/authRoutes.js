"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// ── Public Auth ──────────────────────────────────────────────────────────────
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/logout', authController_1.logout);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password', authController_1.resetPassword);
router.get('/verify-email/:token', authController_1.verifyEmail);
// ── Protected ────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware_1.authenticateToken, authController_1.getMe);
router.put('/me', authMiddleware_1.authenticateToken, authController_1.updateProfile);
router.put('/me/password', authMiddleware_1.authenticateToken, authController_1.changePassword);
router.post('/me/onboarding', authMiddleware_1.authenticateToken, authController_1.completeOnboarding);
exports.default = router;
