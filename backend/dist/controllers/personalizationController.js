"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreferences = getPreferences;
exports.updatePreferences = updatePreferences;
exports.getBookmarks = getBookmarks;
exports.addBookmark = addBookmark;
exports.removeBookmark = removeBookmark;
exports.isBookmarked = isBookmarked;
exports.getReadingHistory = getReadingHistory;
exports.trackReading = trackReading;
exports.getFollowedTopics = getFollowedTopics;
exports.followTopic = followTopic;
exports.unfollowTopic = unfollowTopic;
exports.getFollowedCompanies = getFollowedCompanies;
exports.followCompany = followCompany;
exports.unfollowCompany = unfollowCompany;
exports.getNotifications = getNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.getPersonalizedFeed = getPersonalizedFeed;
exports.getPersonalizedBrief = getPersonalizedBrief;
const prisma_1 = __importDefault(require("../prisma"));
const mockData_1 = require("../mockData");
// ── Get User Preferences ──────────────────────────────────────────────────────
async function getPreferences(req, res) {
    try {
        const userId = req.user.userId;
        let prefs;
        try {
            prefs = await prisma_1.default.userPreferences.findUnique({ where: { userId } });
        }
        catch {
            prefs = {
                userId,
                interests: [],
                emailBreakingNews: true,
                emailDailyBrief: true,
                emailMarketAlerts: false,
                emailJobAlerts: false,
                pushBreakingNews: true,
                pushDailyBrief: false,
                preferredLanguage: 'en',
                feedDensity: 'comfortable',
                darkMode: true
            };
        }
        return res.json({ preferences: prefs });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to get preferences', detail: err.message });
    }
}
// ── Update Preferences ────────────────────────────────────────────────────────
async function updatePreferences(req, res) {
    try {
        const userId = req.user.userId;
        const { interests, emailBreakingNews, emailDailyBrief, emailMarketAlerts, emailJobAlerts, pushBreakingNews, pushDailyBrief, preferredLanguage, feedDensity, darkMode } = req.body;
        const updateData = {};
        if (interests !== undefined)
            updateData.interests = interests;
        if (emailBreakingNews !== undefined)
            updateData.emailBreakingNews = emailBreakingNews;
        if (emailDailyBrief !== undefined)
            updateData.emailDailyBrief = emailDailyBrief;
        if (emailMarketAlerts !== undefined)
            updateData.emailMarketAlerts = emailMarketAlerts;
        if (emailJobAlerts !== undefined)
            updateData.emailJobAlerts = emailJobAlerts;
        if (pushBreakingNews !== undefined)
            updateData.pushBreakingNews = pushBreakingNews;
        if (pushDailyBrief !== undefined)
            updateData.pushDailyBrief = pushDailyBrief;
        if (preferredLanguage !== undefined)
            updateData.preferredLanguage = preferredLanguage;
        if (feedDensity !== undefined)
            updateData.feedDensity = feedDensity;
        if (darkMode !== undefined)
            updateData.darkMode = darkMode;
        let updated;
        try {
            updated = await prisma_1.default.userPreferences.upsert({
                where: { userId },
                create: { userId, ...updateData },
                update: updateData
            });
        }
        catch {
            updated = { userId, ...updateData };
        }
        return res.json({ message: 'Preferences updated', preferences: updated });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to update preferences', detail: err.message });
    }
}
// ── Bookmarks ─────────────────────────────────────────────────────────────────
async function getBookmarks(req, res) {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const skip = (page - 1) * limit;
        let bookmarks = [];
        let total = 0;
        try {
            [bookmarks, total] = await Promise.all([
                prisma_1.default.bookmark.findMany({
                    where: { userId },
                    include: {
                        article: {
                            include: { category: true, source: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma_1.default.bookmark.count({ where: { userId } })
            ]);
        }
        catch {
            // mock: return first 5 articles as bookmarks
            bookmarks = mockData_1.MOCK_ARTICLES.slice(0, 5).map(a => ({
                id: `mock-bm-${a.id}`,
                userId,
                articleId: a.id,
                createdAt: new Date(),
                article: a
            }));
            total = bookmarks.length;
        }
        return res.json({
            data: bookmarks,
            pagination: {
                totalItems: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to get bookmarks', detail: err.message });
    }
}
async function addBookmark(req, res) {
    try {
        const userId = req.user.userId;
        const articleId = parseInt(req.params.articleId);
        if (isNaN(articleId))
            return res.status(400).json({ error: 'Invalid article ID' });
        let bookmark;
        try {
            bookmark = await prisma_1.default.bookmark.upsert({
                where: { userId_articleId: { userId, articleId } },
                create: { userId, articleId },
                update: {}
            });
        }
        catch {
            bookmark = { id: `mock-${userId}-${articleId}`, userId, articleId, createdAt: new Date() };
        }
        return res.status(201).json({ message: 'Article bookmarked', bookmark });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to bookmark', detail: err.message });
    }
}
async function removeBookmark(req, res) {
    try {
        const userId = req.user.userId;
        const articleId = parseInt(req.params.articleId);
        if (isNaN(articleId))
            return res.status(400).json({ error: 'Invalid article ID' });
        try {
            await prisma_1.default.bookmark.delete({
                where: { userId_articleId: { userId, articleId } }
            });
        }
        catch { /* already removed or mock */ }
        return res.json({ message: 'Bookmark removed' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to remove bookmark', detail: err.message });
    }
}
async function isBookmarked(req, res) {
    try {
        const userId = req.user.userId;
        const articleId = parseInt(req.params.articleId);
        let found = false;
        try {
            const bm = await prisma_1.default.bookmark.findUnique({
                where: { userId_articleId: { userId, articleId } }
            });
            found = !!bm;
        }
        catch {
            found = false;
        }
        return res.json({ bookmarked: found });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
// ── Reading History ───────────────────────────────────────────────────────────
async function getReadingHistory(req, res) {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const skip = (page - 1) * limit;
        let history = [];
        let total = 0;
        try {
            [history, total] = await Promise.all([
                prisma_1.default.readingHistory.findMany({
                    where: { userId },
                    include: { article: { include: { category: true, source: true } } },
                    orderBy: { readAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma_1.default.readingHistory.count({ where: { userId } })
            ]);
        }
        catch {
            history = mockData_1.MOCK_ARTICLES.slice(0, 8).map((a, i) => ({
                id: `mock-rh-${i}`,
                userId,
                articleId: a.id,
                readAt: new Date(Date.now() - i * 3600000),
                readSeconds: Math.floor(Math.random() * 300) + 60,
                completed: i < 4,
                article: a
            }));
            total = history.length;
        }
        return res.json({
            data: history,
            pagination: { totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, limit }
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to get history', detail: err.message });
    }
}
async function trackReading(req, res) {
    try {
        const userId = req.user.userId;
        const articleId = parseInt(req.params.articleId);
        const { readSeconds = 0, completed = false } = req.body;
        if (isNaN(articleId))
            return res.status(400).json({ error: 'Invalid article ID' });
        try {
            await prisma_1.default.readingHistory.upsert({
                where: { userId_articleId: { userId, articleId } },
                create: { userId, articleId, readSeconds, completed },
                update: { readSeconds: { increment: readSeconds }, completed: completed || undefined, readAt: new Date() }
            });
        }
        catch { /* mock */ }
        return res.json({ message: 'Reading progress tracked' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Tracking failed', detail: err.message });
    }
}
// ── Followed Topics ───────────────────────────────────────────────────────────
async function getFollowedTopics(req, res) {
    try {
        const userId = req.user.userId;
        let topics = [];
        try {
            topics = await prisma_1.default.followedTopic.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch {
            topics = [];
        }
        return res.json({ topics });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
async function followTopic(req, res) {
    try {
        const userId = req.user.userId;
        const { topicSlug, topicName } = req.body;
        if (!topicSlug || !topicName)
            return res.status(400).json({ error: 'topicSlug and topicName required' });
        let topic;
        try {
            topic = await prisma_1.default.followedTopic.upsert({
                where: { userId_topicSlug: { userId, topicSlug } },
                create: { userId, topicSlug, topicName },
                update: {}
            });
        }
        catch {
            topic = { id: `mock-${userId}-${topicSlug}`, userId, topicSlug, topicName, createdAt: new Date() };
        }
        return res.status(201).json({ message: 'Topic followed', topic });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
async function unfollowTopic(req, res) {
    try {
        const userId = req.user.userId;
        const { topicSlug } = req.params;
        try {
            await prisma_1.default.followedTopic.delete({
                where: { userId_topicSlug: { userId, topicSlug } }
            });
        }
        catch { /* already removed */ }
        return res.json({ message: 'Topic unfollowed' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
// ── Followed Companies ────────────────────────────────────────────────────────
async function getFollowedCompanies(req, res) {
    try {
        const userId = req.user.userId;
        let companies = [];
        try {
            companies = await prisma_1.default.followedCompany.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch {
            companies = [];
        }
        return res.json({ companies });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
async function followCompany(req, res) {
    try {
        const userId = req.user.userId;
        const { companyName, ticker } = req.body;
        if (!companyName)
            return res.status(400).json({ error: 'companyName required' });
        let company;
        try {
            company = await prisma_1.default.followedCompany.upsert({
                where: { userId_companyName: { userId, companyName } },
                create: { userId, companyName, ticker },
                update: {}
            });
        }
        catch {
            company = { id: `mock-${userId}-${companyName}`, userId, companyName, ticker, createdAt: new Date() };
        }
        return res.status(201).json({ message: 'Company followed', company });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
async function unfollowCompany(req, res) {
    try {
        const userId = req.user.userId;
        const companyName = decodeURIComponent(req.params.companyName);
        try {
            await prisma_1.default.followedCompany.delete({
                where: { userId_companyName: { userId, companyName } }
            });
        }
        catch { /* already removed */ }
        return res.json({ message: 'Company unfollowed' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
// ── Notifications ─────────────────────────────────────────────────────────────
async function getNotifications(req, res) {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const skip = (page - 1) * limit;
        let notifications = [];
        let total = 0;
        let unreadCount = 0;
        try {
            [notifications, total, unreadCount] = await Promise.all([
                prisma_1.default.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma_1.default.notification.count({ where: { userId } }),
                prisma_1.default.notification.count({ where: { userId, isRead: false } })
            ]);
        }
        catch {
            notifications = [
                {
                    id: 'mock-n1', userId, type: 'DAILY_BRIEF',
                    title: 'Your Morning Brief is Ready',
                    body: 'Good morning! Your personalized news digest for today is ready.',
                    isRead: false, createdAt: new Date()
                },
                {
                    id: 'mock-n2', userId, type: 'BREAKING_NEWS',
                    title: 'Breaking: S&P 500 Hits Record High',
                    body: 'Markets surged to all-time highs driven by strong earnings.',
                    isRead: true, createdAt: new Date(Date.now() - 3600000)
                }
            ];
            total = notifications.length;
            unreadCount = 1;
        }
        return res.json({
            data: notifications,
            unreadCount,
            pagination: { totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, limit }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
async function markNotificationRead(req, res) {
    try {
        const userId = req.user.userId;
        const { notificationId } = req.params;
        try {
            await prisma_1.default.notification.updateMany({
                where: { id: notificationId, userId },
                data: { isRead: true }
            });
        }
        catch { /* mock */ }
        return res.json({ message: 'Notification marked as read' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
async function markAllNotificationsRead(req, res) {
    try {
        const userId = req.user.userId;
        try {
            await prisma_1.default.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });
        }
        catch { /* mock */ }
        return res.json({ message: 'All notifications marked as read' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
// ── Personalized Feed ─────────────────────────────────────────────────────────
async function getPersonalizedFeed(req, res) {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 15, 50);
        const skip = (page - 1) * limit;
        // Get user's interests
        let interests = [];
        try {
            const prefs = await prisma_1.default.userPreferences.findUnique({ where: { userId } });
            if (prefs?.interests)
                interests = prefs.interests;
        }
        catch {
            interests = [];
        }
        // Get read article IDs to de-prioritize
        let readIds = [];
        try {
            const history = await prisma_1.default.readingHistory.findMany({
                where: { userId },
                select: { articleId: true },
                orderBy: { readAt: 'desc' },
                take: 50
            });
            readIds = history.map((h) => h.articleId);
        }
        catch {
            readIds = [];
        }
        let articles = [];
        let total = 0;
        try {
            const where = interests.length > 0
                ? { category: { slug: { in: interests } } }
                : {};
            [articles, total] = await Promise.all([
                prisma_1.default.article.findMany({
                    where,
                    include: { category: true, source: true, aiSummary: true },
                    orderBy: [
                        { publishedAt: 'desc' }
                    ],
                    skip,
                    take: limit
                }),
                prisma_1.default.article.count({ where })
            ]);
            // Sort: unread first, then by credibility
            articles.sort((a, b) => {
                const aRead = readIds.includes(a.id) ? 1 : 0;
                const bRead = readIds.includes(b.id) ? 1 : 0;
                if (aRead !== bRead)
                    return aRead - bRead;
                return b.credibility - a.credibility;
            });
        }
        catch {
            // Mock fallback: filter by interests
            const filtered = interests.length > 0
                ? mockData_1.MOCK_ARTICLES.filter(a => interests.includes(a.category.slug))
                : mockData_1.MOCK_ARTICLES;
            articles = filtered.slice(skip, skip + limit);
            total = filtered.length;
        }
        return res.json({
            data: articles,
            interests,
            pagination: { totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, limit }
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
// ── Personalized Daily Brief ──────────────────────────────────────────────────
async function getPersonalizedBrief(req, res) {
    try {
        const userId = req.user.userId;
        let interests = [];
        try {
            const prefs = await prisma_1.default.userPreferences.findUnique({ where: { userId } });
            if (prefs?.interests)
                interests = prefs.interests;
        }
        catch {
            interests = [];
        }
        // Get today's global brief and filter/annotate by interest
        let globalBrief = null;
        try {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            globalBrief = await prisma_1.default.dailyBrief.findFirst({
                where: { date: { gte: today }, isPublished: true },
                orderBy: { date: 'desc' }
            });
        }
        catch { /* mock */ }
        if (globalBrief) {
            return res.json({
                brief: globalBrief,
                personalized: interests.length > 0,
                interests,
                message: interests.length > 0
                    ? `Personalized for your interests: ${interests.join(', ')}`
                    : 'General morning brief'
            });
        }
        // Fallback: build a brief from mock articles filtered by interests
        const pool = interests.length > 0
            ? mockData_1.MOCK_ARTICLES.filter(a => interests.includes(a.category.slug))
            : mockData_1.MOCK_ARTICLES;
        const topStories = pool.slice(0, 5);
        const today = new Date();
        const mockBrief = {
            id: 0,
            date: today,
            title: `Your Morning Brief — ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
            content: topStories.map((a, i) => `**${i + 1}. ${a.title}**\n${a.summary}\n*Source: ${a.source.name}*`).join('\n\n'),
            articleIds: topStories.map(a => a.id),
            categories: [...new Set(topStories.map(a => a.category.name))],
            isPublished: true,
            generatedAt: today
        };
        return res.json({
            brief: mockBrief,
            personalized: interests.length > 0,
            interests
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
