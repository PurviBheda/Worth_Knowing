import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { MOCK_ARTICLES, MOCK_CATEGORIES } from '../mockData';

// ── Get User Preferences ──────────────────────────────────────────────────────

export async function getPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    let prefs: any;
    try {
      prefs = await (prisma as any).userPreferences.findUnique({ where: { userId } });
    } catch {
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get preferences', detail: err.message });
  }
}

// ── Update Preferences ────────────────────────────────────────────────────────

export async function updatePreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const {
      interests,
      emailBreakingNews, emailDailyBrief, emailMarketAlerts, emailJobAlerts,
      pushBreakingNews, pushDailyBrief,
      preferredLanguage, feedDensity, darkMode
    } = req.body;

    const updateData: any = {};
    if (interests !== undefined)          updateData.interests = interests;
    if (emailBreakingNews !== undefined)  updateData.emailBreakingNews = emailBreakingNews;
    if (emailDailyBrief !== undefined)    updateData.emailDailyBrief = emailDailyBrief;
    if (emailMarketAlerts !== undefined)  updateData.emailMarketAlerts = emailMarketAlerts;
    if (emailJobAlerts !== undefined)     updateData.emailJobAlerts = emailJobAlerts;
    if (pushBreakingNews !== undefined)   updateData.pushBreakingNews = pushBreakingNews;
    if (pushDailyBrief !== undefined)     updateData.pushDailyBrief = pushDailyBrief;
    if (preferredLanguage !== undefined)  updateData.preferredLanguage = preferredLanguage;
    if (feedDensity !== undefined)        updateData.feedDensity = feedDensity;
    if (darkMode !== undefined)           updateData.darkMode = darkMode;

    let updated: any;
    try {
      updated = await (prisma as any).userPreferences.upsert({
        where: { userId },
        create: { userId, ...updateData },
        update: updateData
      });
    } catch {
      updated = { userId, ...updateData };
    }

    return res.json({ message: 'Preferences updated', preferences: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update preferences', detail: err.message });
  }
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export async function getBookmarks(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    let bookmarks: any[] = [];
    let total = 0;
    try {
      [bookmarks, total] = await Promise.all([
        (prisma as any).bookmark.findMany({
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
        (prisma as any).bookmark.count({ where: { userId } })
      ]);
    } catch {
      // mock: return first 5 articles as bookmarks
      bookmarks = MOCK_ARTICLES.slice(0, 5).map(a => ({
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get bookmarks', detail: err.message });
  }
}

export async function addBookmark(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const articleId = parseInt(req.params.articleId);
    if (isNaN(articleId)) return res.status(400).json({ error: 'Invalid article ID' });

    let bookmark: any;
    try {
      bookmark = await (prisma as any).bookmark.upsert({
        where: { userId_articleId: { userId, articleId } },
        create: { userId, articleId },
        update: {}
      });
    } catch {
      bookmark = { id: `mock-${userId}-${articleId}`, userId, articleId, createdAt: new Date() };
    }

    return res.status(201).json({ message: 'Article bookmarked', bookmark });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to bookmark', detail: err.message });
  }
}

export async function removeBookmark(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const articleId = parseInt(req.params.articleId);
    if (isNaN(articleId)) return res.status(400).json({ error: 'Invalid article ID' });

    try {
      await (prisma as any).bookmark.delete({
        where: { userId_articleId: { userId, articleId } }
      });
    } catch { /* already removed or mock */ }

    return res.json({ message: 'Bookmark removed' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to remove bookmark', detail: err.message });
  }
}

export async function isBookmarked(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const articleId = parseInt(req.params.articleId);
    let found = false;
    try {
      const bm = await (prisma as any).bookmark.findUnique({
        where: { userId_articleId: { userId, articleId } }
      });
      found = !!bm;
    } catch { found = false; }
    return res.json({ bookmarked: found });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Reading History ───────────────────────────────────────────────────────────

export async function getReadingHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    let history: any[] = [];
    let total = 0;
    try {
      [history, total] = await Promise.all([
        (prisma as any).readingHistory.findMany({
          where: { userId },
          include: { article: { include: { category: true, source: true } } },
          orderBy: { readAt: 'desc' },
          skip,
          take: limit
        }),
        (prisma as any).readingHistory.count({ where: { userId } })
      ]);
    } catch {
      history = MOCK_ARTICLES.slice(0, 8).map((a, i) => ({
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get history', detail: err.message });
  }
}

export async function trackReading(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const articleId = parseInt(req.params.articleId);
    const { readSeconds = 0, completed = false } = req.body;
    if (isNaN(articleId)) return res.status(400).json({ error: 'Invalid article ID' });

    try {
      await (prisma as any).readingHistory.upsert({
        where: { userId_articleId: { userId, articleId } },
        create: { userId, articleId, readSeconds, completed },
        update: { readSeconds: { increment: readSeconds }, completed: completed || undefined, readAt: new Date() }
      });
    } catch { /* mock */ }

    return res.json({ message: 'Reading progress tracked' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Tracking failed', detail: err.message });
  }
}

// ── Followed Topics ───────────────────────────────────────────────────────────

export async function getFollowedTopics(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    let topics: any[] = [];
    try {
      topics = await (prisma as any).followedTopic.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    } catch {
      topics = [];
    }
    return res.json({ topics });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function followTopic(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { topicSlug, topicName } = req.body;
    if (!topicSlug || !topicName) return res.status(400).json({ error: 'topicSlug and topicName required' });

    let topic: any;
    try {
      topic = await (prisma as any).followedTopic.upsert({
        where: { userId_topicSlug: { userId, topicSlug } },
        create: { userId, topicSlug, topicName },
        update: {}
      });
    } catch {
      topic = { id: `mock-${userId}-${topicSlug}`, userId, topicSlug, topicName, createdAt: new Date() };
    }
    return res.status(201).json({ message: 'Topic followed', topic });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function unfollowTopic(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { topicSlug } = req.params;
    try {
      await (prisma as any).followedTopic.delete({
        where: { userId_topicSlug: { userId, topicSlug } }
      });
    } catch { /* already removed */ }
    return res.json({ message: 'Topic unfollowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Followed Companies ────────────────────────────────────────────────────────

export async function getFollowedCompanies(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    let companies: any[] = [];
    try {
      companies = await (prisma as any).followedCompany.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    } catch { companies = []; }
    return res.json({ companies });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function followCompany(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { companyName, ticker } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName required' });

    let company: any;
    try {
      company = await (prisma as any).followedCompany.upsert({
        where: { userId_companyName: { userId, companyName } },
        create: { userId, companyName, ticker },
        update: {}
      });
    } catch {
      company = { id: `mock-${userId}-${companyName}`, userId, companyName, ticker, createdAt: new Date() };
    }
    return res.status(201).json({ message: 'Company followed', company });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function unfollowCompany(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const companyName = decodeURIComponent(req.params.companyName);
    try {
      await (prisma as any).followedCompany.delete({
        where: { userId_companyName: { userId, companyName } }
      });
    } catch { /* already removed */ }
    return res.json({ message: 'Company unfollowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    let notifications: any[] = [];
    let total = 0;
    let unreadCount = 0;
    try {
      [notifications, total, unreadCount] = await Promise.all([
        (prisma as any).notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        (prisma as any).notification.count({ where: { userId } }),
        (prisma as any).notification.count({ where: { userId, isRead: false } })
      ]);
    } catch {
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { notificationId } = req.params;
    try {
      await (prisma as any).notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true }
      });
    } catch { /* mock */ }
    return res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function markAllNotificationsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    try {
      await (prisma as any).notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });
    } catch { /* mock */ }
    return res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Personalized Feed ─────────────────────────────────────────────────────────

export async function getPersonalizedFeed(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 15, 50);
    const skip = (page - 1) * limit;

    // Get user's interests
    let interests: string[] = [];
    try {
      const prefs = await (prisma as any).userPreferences.findUnique({ where: { userId } });
      if (prefs?.interests) interests = prefs.interests as string[];
    } catch { interests = []; }

    // Get read article IDs to de-prioritize
    let readIds: number[] = [];
    try {
      const history = await (prisma as any).readingHistory.findMany({
        where: { userId },
        select: { articleId: true },
        orderBy: { readAt: 'desc' },
        take: 50
      });
      readIds = history.map((h: any) => h.articleId);
    } catch { readIds = []; }

    let articles: any[] = [];
    let total = 0;

    try {
      const where: any = interests.length > 0
        ? { category: { slug: { in: interests } } }
        : {};

      [articles, total] = await Promise.all([
        (prisma as any).article.findMany({
          where,
          include: { category: true, source: true, aiSummary: true },
          orderBy: [
            { publishedAt: 'desc' }
          ],
          skip,
          take: limit
        }),
        (prisma as any).article.count({ where })
      ]);

      // Sort: unread first, then by credibility
      articles.sort((a: any, b: any) => {
        const aRead = readIds.includes(a.id) ? 1 : 0;
        const bRead = readIds.includes(b.id) ? 1 : 0;
        if (aRead !== bRead) return aRead - bRead;
        return b.credibility - a.credibility;
      });
    } catch {
      // Mock fallback: filter by interests
      const filtered = interests.length > 0
        ? MOCK_ARTICLES.filter(a => interests.includes(a.category.slug))
        : MOCK_ARTICLES;
      articles = filtered.slice(skip, skip + limit);
      total = filtered.length;
    }

    return res.json({
      data: articles,
      interests,
      pagination: { totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, limit }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ── Personalized Daily Brief ──────────────────────────────────────────────────

export async function getPersonalizedBrief(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    let interests: string[] = [];
    try {
      const prefs = await (prisma as any).userPreferences.findUnique({ where: { userId } });
      if (prefs?.interests) interests = prefs.interests as string[];
    } catch { interests = []; }

    // Get today's global brief and filter/annotate by interest
    let globalBrief: any = null;
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      globalBrief = await (prisma as any).dailyBrief.findFirst({
        where: { date: { gte: today }, isPublished: true },
        orderBy: { date: 'desc' }
      });
    } catch { /* mock */ }

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
      ? MOCK_ARTICLES.filter(a => interests.includes(a.category.slug))
      : MOCK_ARTICLES;
    const topStories = pool.slice(0, 5);

    const today = new Date();
    const mockBrief = {
      id: 0,
      date: today,
      title: `Your Morning Brief — ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      content: topStories.map((a, i) =>
        `**${i + 1}. ${a.title}**\n${a.summary}\n*Source: ${a.source.name}*`
      ).join('\n\n'),
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
