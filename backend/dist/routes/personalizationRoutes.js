"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const personalizationController_1 = require("../controllers/personalizationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// All personalization routes require authentication
router.use(authMiddleware_1.authenticateToken);
// ── Preferences ──────────────────────────────────────────────────────────────
router.get('/preferences', personalizationController_1.getPreferences);
router.put('/preferences', personalizationController_1.updatePreferences);
// ── Bookmarks ─────────────────────────────────────────────────────────────────
router.get('/bookmarks', personalizationController_1.getBookmarks);
router.post('/bookmarks/:articleId', personalizationController_1.addBookmark);
router.delete('/bookmarks/:articleId', personalizationController_1.removeBookmark);
router.get('/bookmarks/:articleId/check', personalizationController_1.isBookmarked);
// ── Reading History ───────────────────────────────────────────────────────────
router.get('/history', personalizationController_1.getReadingHistory);
router.post('/history/:articleId', personalizationController_1.trackReading);
// ── Followed Topics ───────────────────────────────────────────────────────────
router.get('/topics', personalizationController_1.getFollowedTopics);
router.post('/topics', personalizationController_1.followTopic);
router.delete('/topics/:topicSlug', personalizationController_1.unfollowTopic);
// ── Followed Companies ────────────────────────────────────────────────────────
router.get('/companies', personalizationController_1.getFollowedCompanies);
router.post('/companies', personalizationController_1.followCompany);
router.delete('/companies/:companyName', personalizationController_1.unfollowCompany);
// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', personalizationController_1.getNotifications);
router.put('/notifications/:notificationId/read', personalizationController_1.markNotificationRead);
router.put('/notifications/read-all', personalizationController_1.markAllNotificationsRead);
// ── Personalized Feed & Brief ─────────────────────────────────────────────────
router.get('/feed', personalizationController_1.getPersonalizedFeed);
router.get('/brief', personalizationController_1.getPersonalizedBrief);
exports.default = router;
