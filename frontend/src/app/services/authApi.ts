// ── Auth & Personalization API Extensions ─────────────────────────────────────
// Appended to the existing api.ts exports

import type { Article, PaginatedResponse } from './api';

const API_BASE_URL_LOCAL = 'http://localhost:5000/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  profilePicture: string | null;
  role: string;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  provider: string;
  createdAt: string;
}

export interface UserPreferences {
  userId: string;
  interests: string[];
  emailBreakingNews: boolean;
  emailDailyBrief: boolean;
  emailMarketAlerts: boolean;
  emailJobAlerts: boolean;
  pushBreakingNews: boolean;
  pushDailyBrief: boolean;
  preferredLanguage: string;
  feedDensity: string;
  darkMode: boolean;
}

export interface Bookmark {
  id: string;
  userId: string;
  articleId: number;
  createdAt: string;
  article: Article;
}

export interface ReadingHistoryItem {
  id: string;
  userId: string;
  articleId: number;
  readAt: string;
  readSeconds: number;
  completed: boolean;
  article: Article;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'BREAKING_NEWS' | 'DAILY_BRIEF' | 'MARKET_ALERT' | 'JOB_ALERT' | 'SYSTEM';
  title: string;
  body: string;
  articleId?: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface FollowedTopic {
  id: string;
  userId: string;
  topicSlug: string;
  topicName: string;
  createdAt: string;
}

export interface FollowedCompany {
  id: string;
  userId: string;
  companyName: string;
  ticker?: string | null;
  createdAt: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('wk_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function apiRegister(email: string, password: string, name?: string): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function apiLogin(email: string, password: string): Promise<{ user: UserProfile; token: string; preferences: UserPreferences | null }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function apiLogout(): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/auth/logout`, { method: 'POST', headers: authHeaders() });
  localStorage.removeItem('wk_token');
  localStorage.removeItem('wk_user');
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return await res.json();
}

export async function apiGetMe(): Promise<{ user: UserProfile; preferences: UserPreferences | null }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/auth/me`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get profile');
  return data;
}

export async function apiUpdateProfile(data: { name?: string; profilePicture?: string }): Promise<{ user: UserProfile }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/auth/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Update failed');
  return result;
}

export async function apiCompleteOnboarding(interests: string[]): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/auth/me/onboarding`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ interests })
  });
}

// ── Personalization ───────────────────────────────────────────────────────────

export async function apiGetPreferences(): Promise<{ preferences: UserPreferences }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/preferences`, { headers: authHeaders() });
  return await res.json();
}

export async function apiUpdatePreferences(prefs: Partial<UserPreferences>): Promise<{ preferences: UserPreferences }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/preferences`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(prefs)
  });
  return await res.json();
}

export async function apiGetBookmarks(page = 1, limit = 10): Promise<PaginatedResponse<Bookmark>> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/bookmarks?page=${page}&limit=${limit}`, { headers: authHeaders() });
  return await res.json();
}

export async function apiAddBookmark(articleId: number): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/user/bookmarks/${articleId}`, { method: 'POST', headers: authHeaders() });
}

export async function apiRemoveBookmark(articleId: number): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/user/bookmarks/${articleId}`, { method: 'DELETE', headers: authHeaders() });
}

export async function apiIsBookmarked(articleId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL_LOCAL}/user/bookmarks/${articleId}/check`, { headers: authHeaders() });
    const d = await res.json();
    return d.bookmarked === true;
  } catch { return false; }
}

export async function apiGetHistory(page = 1, limit = 20): Promise<PaginatedResponse<ReadingHistoryItem>> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/history?page=${page}&limit=${limit}`, { headers: authHeaders() });
  return await res.json();
}

export async function apiTrackReading(articleId: number, readSeconds: number, completed: boolean): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/user/history/${articleId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ readSeconds, completed })
  });
}

export async function apiGetNotifications(page = 1): Promise<{ data: NotificationItem[]; unreadCount: number; pagination: PaginatedResponse<NotificationItem>['pagination'] }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/notifications?page=${page}`, { headers: authHeaders() });
  return await res.json();
}

export async function apiMarkNotificationRead(notificationId: string): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/user/notifications/${notificationId}/read`, { method: 'PUT', headers: authHeaders() });
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/user/notifications/read-all`, { method: 'PUT', headers: authHeaders() });
}

export async function apiGetPersonalizedFeed(page = 1): Promise<PaginatedResponse<Article> & { interests: string[] }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/feed?page=${page}`, { headers: authHeaders() });
  return await res.json();
}

export async function apiGetPersonalizedBrief(): Promise<{ brief: any; personalized: boolean; interests: string[] }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/brief`, { headers: authHeaders() });
  return await res.json();
}

export async function apiFollowTopic(topicSlug: string, topicName: string): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/user/topics`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ topicSlug, topicName })
  });
}

export async function apiUnfollowTopic(topicSlug: string): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/user/topics/${topicSlug}`, { method: 'DELETE', headers: authHeaders() });
}

export async function apiFollowCompany(companyName: string, ticker?: string): Promise<void> {
  await fetch(`${API_BASE_URL_LOCAL}/user/companies`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ companyName, ticker })
  });
}

export async function apiGetFollowedTopics(): Promise<{ topics: FollowedTopic[] }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/topics`, { headers: authHeaders() });
  return await res.json();
}

export async function apiGetFollowedCompanies(): Promise<{ companies: FollowedCompany[] }> {
  const res = await fetch(`${API_BASE_URL_LOCAL}/user/companies`, { headers: authHeaders() });
  return await res.json();
}
