"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategorySlug = getCategorySlug;
exports.fetchUnsplashPhotoId = fetchUnsplashPhotoId;
exports.ingestNews = ingestNews;
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const rss_parser_1 = __importDefault(require("rss-parser"));
const prisma_1 = __importDefault(require("../prisma"));
const aiService_1 = require("./aiService");
const CONFIG_FEEDS = [
    // AI & Technology
    { url: 'https://techcrunch.com/feed/', category: 'AI & Technology', source: 'TechCrunch' },
    { url: 'https://www.theverge.com/rss/index.xml', category: 'AI & Technology', source: 'The Verge' },
    // Startups
    { url: 'https://techcrunch.com/category/startups/feed/', category: 'Startups', source: 'TechCrunch' },
    // Business
    { url: 'https://www.moneycontrol.com/rss/business.xml', category: 'Business', source: 'Moneycontrol' },
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Business', source: 'CNBC' },
    // Stock Market
    { url: 'https://www.moneycontrol.com/rss/latestnews.xml', category: 'Stock Market', source: 'Moneycontrol' },
    { url: 'https://feeds.feedburner.com/ndtvprofit-latest', category: 'Stock Market', source: 'NDTV Profit' },
    // Cryptocurrency
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Cryptocurrency', source: 'CoinDesk' },
    // Politics
    { url: 'https://news.google.com/rss/search?q=politics&hl=en-US&gl=US&ceid=US:en', category: 'Politics', source: 'Google News Politics' },
    // Science
    { url: 'https://www.nature.com/nature.rss', category: 'Science', source: 'Nature' },
    { url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Science', source: 'ScienceDaily' },
    // Global Affairs
    { url: 'https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en', category: 'Global Affairs', source: 'Google News World' },
    // Economy
    { url: 'https://news.google.com/rss/search?q=economy+inflation&hl=en-US&gl=US&ceid=US:en', category: 'Economy', source: 'Google News Economy' },
    // Personal Finance
    { url: 'https://www.moneycontrol.com/rss/personalfinance.xml', category: 'Personal Finance', source: 'Moneycontrol' },
    { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', category: 'Personal Finance', source: 'CNBC' },
    // Jobs
    { url: 'https://www.cnbc.com/id/100646281/device/rss/rss.html', category: 'Jobs', source: 'CNBC Careers' }
];
// Keyword taxonomy for auto-categorization fallback
const CATEGORY_KEYWORDS = {
    'AI & Technology': ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'tech', 'technology', 'startup', 'silicon valley'],
    'Startups': ['startup', 'seed', 'founder', 'incubator', 'accelerator', 'venture capital', 'funding round'],
    'Business': ['business', 'enterprise', 'corporate', 'company', 'management', 'merger', 'acquisition'],
    'Stock Market': ['stock', 'market', 'share', 'nasdaq', 'dow', 's&p', 'exchange', 'nifty', 'sensex', 'bull', 'bear', 'ipo'],
    'Cryptocurrency': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'coin', 'solana', 'token'],
    'Politics': ['politics', 'election', 'government', 'policy', 'congress', 'senate', 'parliament', 'minister', 'modi', 'biden'],
    'Science': ['science', 'research', 'study', 'laboratory', 'space', 'physics', 'biology', 'astronomy', 'medicine'],
    'Global Affairs': ['global', 'world', 'international', 'diplomacy', 'foreign', 'un', 'g7', 'summit'],
    'Economy': ['economy', 'economic', 'gdp', 'inflation', 'recession', 'fiscal', 'reserve bank', 'fed', 'interest rate'],
    'Personal Finance': ['personal finance', 'budget', 'investment', 'saving', 'retirement', 'mortgage', 'tax', 'insurance'],
    'Jobs': ['jobs', 'hiring', 'career', 'employment', 'recruitment', 'job market', 'layoff', 'salary']
};
/**
 * Helper to slugify category name matching the frontend routes
 */
function getCategorySlug(name) {
    const norm = name.trim().toLowerCase();
    if (norm === 'ai & technology' || norm === 'ai technology')
        return 'ai-technology';
    if (norm === 'startups')
        return 'startups';
    if (norm === 'business')
        return 'business';
    if (norm === 'stock market')
        return 'stock-market';
    if (norm === 'cryptocurrency')
        return 'cryptocurrency';
    if (norm === 'politics')
        return 'politics';
    if (norm === 'science')
        return 'science';
    if (norm === 'global affairs')
        return 'global-affairs';
    if (norm === 'economy')
        return 'economy';
    if (norm === 'personal finance')
        return 'personal-finance';
    if (norm === 'jobs')
        return 'jobs';
    return norm.replace(/\s+/g, '-').replace(/&/g, 'and');
}
/**
 * Returns a high-quality static Unsplash photo ID matching the category theme from a pool
 */
function getCategoryPlaceholderImage(category, seed = 0) {
    const pools = {
        'AI & Technology': [
            '1677442135703-1787eea5ce01', '1518770660439-4636190af475', '1526374965328-7f61d4dc18c5', '1485827404703-89b55fcc595e', '1507146426996-ef05306b995a'
        ],
        'Startups': [
            '1559136555-9303baea8ebd', '1519389950473-47ba0277781c', '1522071820081-009f0129c71c', '1556761175-4b46a572b786', '1542744094-3a31f103e35f'
        ],
        'Business': [
            '1611532736597-de2d4265fba3', '1486406146926-c627a92ad1ab', '1454165804606-c3d57bc86b40', '1507679799987-c73779587ccf', '1491336477066-31156b5e4f35'
        ],
        'Stock Market': [
            '1611974789855-9c2a0a7236a3', '1590283603385-17ffb3a7f29f', '1607604276583-eef5d076aa5f', '1535320903710-d993d3d77d29', '1628157582853-a796fa650a6a'
        ],
        'Cryptocurrency': [
            '1518546305927-5a555bb7020d', '1621761191319-c6fb62004040', '1639762688036-44882bd69f4a', '1642132652155-a4b087e04977', '1640341790663-d43d3a0a4c28'
        ],
        'Politics': [
            '1529107386315-e1a2ed48a620', '1540910419-a9a7e68404b5', '1541872703-74c5e44368f9', '1557804506-669a67965ba0', '1454165804606-c3d57bc86b40'
        ],
        'Science': [
            '1532187643603-ba119ca4109e', '1507668077129-56e32842fceb', '1451187580459-43490279c0fa', '1530210124530-d007c611f110', '1506744038136-46273834b3fb'
        ],
        'Global Affairs': [
            '1451187580459-43490279c0fa', '1479812435906-ac12e47229e6', '1526304640581-d334cdbbf45e', '1486406146926-c627a92ad1ab', '1596495578065-6e0763fa1178'
        ],
        'Economy': [
            '1611974789855-9c2a0a7236a3', '1526304640581-d334cdbbf45e', '1544377193-33dcf4d68fb5', '1559526324-4b87b5e36f44', '1526304899543-c0d16453715c'
        ],
        'Personal Finance': [
            '1579621970220-fd276f780e22', '1507679799987-c73779587ccf', '1554224155-8d04cb21cd6c', '1563986768-9a98c8c253b6', '1559526324-4b87b5e36f44'
        ],
        'Jobs': [
            '1507679799987-c73779587ccf', '1521737604898-ac1966a36d2b', '1522202188-0df37074a80d', '1517245386806-bb44f22ae37d', '1542744094-3a31f103e35f'
        ]
    };
    const pool = pools[category] || ['1504711434969-e33886168f5c'];
    return pool[seed % pool.length];
}
/**
 * Scraping helper to query Unsplash search and fetch a relevant image ID
 */
async function fetchUnsplashPhotoId(query) {
    try {
        const cleanQuery = query.trim().replace(/\s+/g, '-').toLowerCase();
        const url = `https://unsplash.com/s/photos/${encodeURIComponent(cleanQuery)}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });
        if (!response.ok) {
            return null;
        }
        const html = await response.text();
        const regex = /https:\/\/images\.unsplash\.com\/photo-([a-zA-Z0-9-]+)/g;
        const matches = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            if (match[1]) {
                const cleanId = match[1].split('?')[0];
                if (cleanId.length > 5 && !matches.includes(cleanId)) {
                    matches.push(cleanId);
                }
            }
        }
        if (matches.length > 0) {
            const limit = Math.min(5, matches.length);
            const randomIndex = Math.floor(Math.random() * limit);
            return matches[randomIndex];
        }
    }
    catch (err) {
        console.error('⚠️ Unsplash fetch failed:', err.message || err);
    }
    return null;
}
/**
 * Helper to fetch top headlines from GNews API for key categories
 */
async function fetchGNewsArticles(apiKey) {
    const categories = [
        { gnewsCat: 'technology', wtCat: 'AI & Technology' },
        { gnewsCat: 'business', wtCat: 'Business' },
        { gnewsCat: 'nation', wtCat: 'Politics' },
        { gnewsCat: 'science', wtCat: 'Science' },
        { gnewsCat: 'world', wtCat: 'Global Affairs' }
    ];
    const articlesList = [];
    for (const cat of categories) {
        try {
            const url = `https://gnews.io/api/v4/top-headlines?category=${cat.gnewsCat}&lang=en&apikey=${apiKey}&max=5`;
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`⚠️ GNews API returned status ${response.status} for category ${cat.gnewsCat}`);
                continue;
            }
            const data = (await response.json());
            if (data.articles) {
                for (const art of data.articles) {
                    articlesList.push({
                        title: art.title,
                        description: art.description || art.content || '',
                        link: art.url,
                        publishedAt: art.publishedAt ? new Date(art.publishedAt) : new Date(),
                        sourceName: art.source?.name || 'GNews',
                        category: cat.wtCat,
                        image: art.image || ''
                    });
                }
            }
        }
        catch (err) {
            console.error(`⚠️ GNews API fetch error for category ${cat.gnewsCat}:`, err);
        }
    }
    return articlesList;
}
/**
 * Ingest news from all configured RSS feeds or News API.
 * Returns a stats object useful for admin endpoint.
 */
async function ingestNews() {
    let fetched = 0;
    let added = 0;
    let duplicates = 0;
    const errors = [];
    const gnewsApiKey = process.env.GNEWS_API_KEY;
    const useGNews = gnewsApiKey && gnewsApiKey !== 'your_gnews_api_key_here' && gnewsApiKey.trim() !== '';
    let rawArticlesToIngest = [];
    if (useGNews) {
        console.log('📡 Fetching daily news from GNews API...');
        try {
            rawArticlesToIngest = await fetchGNewsArticles(gnewsApiKey);
        }
        catch (e) {
            errors.push(`GNews API global failure: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    // Fallback to RSS feeds if GNews returned 0 articles or is not set up
    if (rawArticlesToIngest.length === 0) {
        console.log('📰 Fetching daily news from trusted RSS feeds...');
        const parser = new rss_parser_1.default();
        for (const feed of CONFIG_FEEDS) {
            try {
                const feedData = await parser.parseURL(feed.url);
                for (const item of feedData.items) {
                    rawArticlesToIngest.push({
                        title: item.title ?? 'Untitled',
                        description: item.contentSnippet ?? item.content ?? '',
                        link: item.link ?? '',
                        publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
                        sourceName: feed.source,
                        category: feed.category,
                        image: item.enclosure?.url ?? ''
                    });
                }
            }
            catch (e) {
                errors.push(`Failed to fetch ${feed.url}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }
    // Process all parsed articles
    for (const rawArt of rawArticlesToIngest) {
        fetched++;
        const sourceUrl = rawArt.link;
        const title = rawArt.title;
        const description = rawArt.description;
        const publishedAt = rawArt.publishedAt;
        const category = rawArt.category;
        const sourceName = rawArt.sourceName;
        let image = rawArt.image;
        // Fetch placeholder image ID if no direct enclosure URL
        if (!image) {
            image = getCategoryPlaceholderImage(category, fetched);
        }
        // Deduplication checks
        const existing = await prisma_1.default.article.findFirst({
            where: {
                OR: [
                    { sourceUrl: sourceUrl },
                    { title: title }
                ]
            }
        });
        if (existing) {
            duplicates++;
            continue;
        }
        try {
            const newArticle = await prisma_1.default.article.create({
                data: {
                    title,
                    summary: description,
                    content: description,
                    time: 'Just now',
                    sourceUrl,
                    publishedAt,
                    imageId: image,
                    category: {
                        connectOrCreate: {
                            where: { name: category },
                            create: {
                                name: category,
                                slug: getCategorySlug(category)
                            }
                        }
                    },
                    source: {
                        connectOrCreate: {
                            where: { name: sourceName },
                            create: {
                                name: sourceName,
                                url: sourceUrl
                            }
                        }
                    }
                }
            });
            added++;
            // Asynchronously trigger AI summarization and verification
            (async () => {
                await (0, aiService_1.summarizeArticle)(newArticle.id);
                const { verifyArticle } = await Promise.resolve().then(() => __importStar(require('./verificationService')));
                await verifyArticle(newArticle.id);
            })().catch(err => console.error(`⚠️  AI pipeline failed for article ${newArticle.id}:`, err.message));
        }
        catch (e) {
            errors.push(`DB error for ${title}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    const stats = {
        fetched,
        added,
        duplicates,
        errors,
    };
    console.log('📰 Ingestion run completed', stats);
    return stats;
}
/**
 * Starts the hourly news ingestion scheduler AND the 6 AM daily brief scheduler.
 * Should be called once on server boot.
 */
function startScheduler() {
    // ── Hourly news ingestion ────────────────────────────────────────────────
    node_cron_1.default.schedule('0 * * * *', async () => {
        console.log('⏰ Running scheduled news ingestion...');
        await ingestNews();
    });
    console.log('✅ News ingestion scheduler started – runs hourly.');
    // ── 6:00 AM daily brief generation ──────────────────────────────────────
    // Cron: minute=0, hour=6, every day (server local time)
    node_cron_1.default.schedule('0 6 * * *', async () => {
        console.log('🌅 Running scheduled Morning Brief generation...');
        const brief = await (0, aiService_1.generateDailyBrief)(new Date());
        if (brief) {
            console.log(`✅ Morning Brief generated: "${brief.title}"`);
        }
        else {
            console.error('❌ Morning Brief generation failed – check AI service logs.');
        }
    });
    console.log('✅ Morning Brief scheduler started – runs daily at 6:00 AM.');
}
