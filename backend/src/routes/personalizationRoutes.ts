import { Router } from 'express';
import {
  getPreferences,
  updatePreferences,
  getBookmarks,
  addBookmark,
  removeBookmark,
  isBookmarked,
  getReadingHistory,
  trackReading,
  getFollowedTopics,
  followTopic,
  unfollowTopic,
  getFollowedCompanies,
  followCompany,
  unfollowCompany,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPersonalizedFeed,
  getPersonalizedBrief
} from '../controllers/personalizationController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All personalization routes require authentication
router.use(authenticateToken);

// ── Preferences ──────────────────────────────────────────────────────────────
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

// ── Bookmarks ─────────────────────────────────────────────────────────────────
router.get('/bookmarks', getBookmarks);
router.post('/bookmarks/:articleId', addBookmark);
router.delete('/bookmarks/:articleId', removeBookmark);
router.get('/bookmarks/:articleId/check', isBookmarked);

// ── Reading History ───────────────────────────────────────────────────────────
router.get('/history', getReadingHistory);
router.post('/history/:articleId', trackReading);

// ── Followed Topics ───────────────────────────────────────────────────────────
router.get('/topics', getFollowedTopics);
router.post('/topics', followTopic);
router.delete('/topics/:topicSlug', unfollowTopic);

// ── Followed Companies ────────────────────────────────────────────────────────
router.get('/companies', getFollowedCompanies);
router.post('/companies', followCompany);
router.delete('/companies/:companyName', unfollowCompany);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', getNotifications);
router.put('/notifications/:notificationId/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

// ── Personalized Feed & Brief ─────────────────────────────────────────────────
router.get('/feed', getPersonalizedFeed);
router.get('/brief', getPersonalizedBrief);

export default router;
