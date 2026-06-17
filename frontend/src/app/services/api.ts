const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  _count?: {
    articles: number;
  };
}

export interface Source {
  id: number;
  name: string;
  url?: string | null;
  logo?: string | null;
}

export type VerificationStatus = 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'CONFLICTING_REPORTS';

export interface Article {
  id: number;
  title: string;
  summary: string;
  content?: string | null;
  time: string;
  publishedAt: string;
  credibility: number;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  imageId?: string | null;
  categoryId: number;
  category: Category;
  sourceId: number;
  source: Source;
  verificationStatus: VerificationStatus;
}

export interface SupportingSource {
  name: string;
  url: string;
  matchType: string;
}

export interface VerificationReport {
  id: number;
  articleId: number;
  status: VerificationStatus;
  credibilityScore: number;
  sourcesCount: number;
  whyVerified: string;
  scoreExplanation: string;
  supportingSources: SupportingSource[];
  headlineSensational: boolean;
  headlineClickbait: boolean;
  misleadingContent: boolean;
  missingEvidence: string[];
  unsupportedClaims: string[];
  duplicateIds: number[];
  verifiedAt: string;
  isFlagged: boolean;
  overrideStatus?: VerificationStatus | null;
  overrideCredibility?: number | null;
  overrideReason?: string | null;
  overriddenAt?: string | null;
  article?: {
    id: number;
    title: string;
    publishedAt: string;
    source: { name: string };
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

/**
 * Fetches all categories dynamically from the database
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories (Status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error('fetchCategories API error:', error);
    throw error;
  }
}

/**
 * Fetches articles from the backend with dynamic query parameters
 */
export async function fetchArticles(params?: {
  search?: string;
  categoryId?: number;
  categorySlug?: string;
  sentiment?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Article>> {
  try {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/articles?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch articles (Status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error('fetchArticles API error:', error);
    throw error;
  }
}

/**
 * Fetches a single news article by its unique ID
 */
export async function fetchArticleById(id: number | string): Promise<Article> {
  try {
    const response = await fetch(`${API_BASE_URL}/articles/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch article with ID ${id} (Status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error(`fetchArticleById API error for ID ${id}:`, error);
    throw error;
  }
}

/**
 * Fetches the verification and credibility report for a specific article
 */
export async function fetchVerificationReport(articleId: number | string): Promise<VerificationReport> {
  try {
    const response = await fetch(`${API_BASE_URL}/verification/report/${articleId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch verification report (Status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error(`fetchVerificationReport error for article ${articleId}:`, error);
    throw error;
  }
}

/**
 * Manually triggers AI verification analysis for a specific article (Admin)
 */
export async function triggerVerify(articleId: number | string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/verification/verify/${articleId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken') || 'secret-admin-token'}`
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger verification (Status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error(`triggerVerify error for article ${articleId}:`, error);
    throw error;
  }
}

/**
 * Submits an administrative override for an article's verification report (Admin)
 */
export async function submitOverride(
  articleId: number | string,
  data: { status: VerificationStatus; credibilityScore: number; overrideReason: string }
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/verification/override/${articleId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken') || 'secret-admin-token'}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`Failed to submit override (Status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error(`submitOverride error for article ${articleId}:`, error);
    throw error;
  }
}

/**
 * Fetches today's AI-generated Morning Brief
 */
export async function fetchDailyBrief(): Promise<{
  id: number;
  date: string;
  title: string;
  content: string;
  articleIds: number[];
  categories: string[];
  isPublished: boolean;
  generatedAt: string;
} | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/daily-brief`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('fetchDailyBrief error:', error);
    return null;
  }
}

/**
 * Fetches the AI summary for a specific article
 */
export async function fetchAiSummary(articleId: number | string): Promise<{
  headlineSummary: string;
  shortSummary: string;
  keyTakeaways: string[];
  whyItMatters: string;
  seoDescription: string;
  sentiment: string;
  sentimentScore: number;
  tags: string[];
  readingTimeMinutes: number;
  confidence: number;
  flaggedForReview: boolean;
} | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/summary/${articleId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`fetchAiSummary error for article ${articleId}:`, error);
    return null;
  }
}

/**
 * Fetches flagged articles/reports for the admin review dashboard (Admin)
 */
export async function fetchFlaggedReports(page = 1, limit = 10): Promise<PaginatedResponse<VerificationReport>> {
  try {
    const response = await fetch(`${API_BASE_URL}/verification/flagged?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken') || 'secret-admin-token'}`
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch flagged reports (Status: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error('fetchFlaggedReports error:', error);
    throw error;
  }
}
