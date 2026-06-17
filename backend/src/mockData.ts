export interface MockCategory {
  id: number;
  name: string;
  slug: string;
}

export interface MockSource {
  id: number;
  name: string;
  url: string | null;
  logo: string | null;
}

export interface MockArticle {
  id: number;
  title: string;
  summary: string;
  content: string | null;
  time: string;
  publishedAt: Date;
  credibility: number;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  imageId: string | null;
  categoryId: number;
  category: MockCategory;
  sourceId: number;
  source: MockSource;
}

export const MOCK_CATEGORIES: MockCategory[] = [
  { id: 1, name: "AI & Technology", slug: "ai-technology" },
  { id: 2, name: "Startups", slug: "startups" },
  { id: 3, name: "Business", slug: "business" },
  { id: 4, name: "Stock Market", slug: "stock-market" },
  { id: 5, name: "Cryptocurrency", slug: "cryptocurrency" },
  { id: 6, name: "Politics", slug: "politics" },
  { id: 7, name: "Science", slug: "science" },
  { id: 8, name: "Global Affairs", slug: "global-affairs" },
  { id: 9, name: "Economy", slug: "economy" },
  { id: 10, name: "Personal Finance", slug: "personal-finance" },
  { id: 11, name: "Jobs", slug: "jobs" }
];

export const MOCK_SOURCES: MockSource[] = [
  { id: 1, name: "MIT Technology Review", url: null, logo: null },
  { id: 2, name: "Nature", url: null, logo: null },
  { id: 3, name: "Stack Overflow", url: null, logo: null },
  { id: 4, name: "Financial Times", url: null, logo: null },
  { id: 5, name: "TechCrunch", url: null, logo: null },
  { id: 6, name: "Sifted", url: null, logo: null },
  { id: 7, name: "Wall Street Journal", url: null, logo: null },
  { id: 8, name: "Reuters", url: null, logo: null },
  { id: 9, name: "Bloomberg", url: null, logo: null },
  { id: 10, name: "CoinDesk", url: null, logo: null },
  { id: 11, name: "The Block", url: null, logo: null },
  { id: 12, name: "AP News", url: null, logo: null },
  { id: 13, name: "IRS", url: null, logo: null },
  { id: 14, name: "IMF", url: null, logo: null },
  { id: 15, name: "LinkedIn Economic Graph", url: null, logo: null }
];

function generateRichContent(title: string, summary: string): string {
  return `### Overview of the Development\n\n${summary}\n\nIn recent weeks, industry observers have noted a significant pivot toward these exact developments. Analysts attribute this shift to the growing intersection of consumer demands and technological feasibility. For organizations and users involved in this sector, these adjustments could have profound consequences for operational models, strategic roadmaps, and broader economic structures over the next decade.\n\n### In-Depth Analysis and Impact\n\nExperts close to the project have detailed a series of unexpected outcomes from initial pilot testing, which exceeded targets in performance and reliability metrics. A lead analyst commented on the situation, suggesting that early adoption patterns indicate a strong enthusiasm that could quickly translate into standard industry practices. To better understand the scope, the research group plans to publish a complete whitepaper by the end of the next quarter.\n\n### Future Outlook and Next Steps\n\nAs the situation continues to unfold rapidly, market participants are advised to exercise diligence and keep a close eye on technical standards. Further announcements and updates from the primary developers are anticipated in the near term. The full economic impact remains to be fully measured, but the initial signal is clear: this is a major development that is worth knowing and tracking closely.`;
}

const rawArticles: any[] = [];

export const MOCK_ARTICLES: MockArticle[] = rawArticles.map(a => {
  const category = MOCK_CATEGORIES.find(c => c.slug === a.categorySlug) || MOCK_CATEGORIES[0];
  const source = MOCK_SOURCES.find(s => s.name === a.sourceName) || MOCK_SOURCES[0];

  return {
    id: a.id,
    title: a.title,
    summary: a.summary,
    content: generateRichContent(a.title, a.summary),
    time: a.time,
    publishedAt: new Date(Date.now() - a.id * 3600000), // unique timestamp
    credibility: a.credibility,
    sentiment: a.sentiment,
    imageId: a.imageId,
    categoryId: category.id,
    category,
    sourceId: source.id,
    source
  };
});
