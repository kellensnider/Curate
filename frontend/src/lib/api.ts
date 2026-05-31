import type { Show } from './mockData';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export const API_BASE = BASE;
const TOKEN_KEY = 'curate-token';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  preferences?: {
    maxMonthlyBudget: number;
    maxActiveServices: number;
    allowAutoSubscribe: boolean;
    allowAutoCancel: boolean;
  };
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface BackendShow {
  _id?: string;
  externalId: string;
  title: string;
  type: 'movie' | 'series';
  genre: string[];
  year: number;
  services: string[];
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  priorityWeight?: number;
  priority_weight?: number;
  offers?: Array<{
    service: string;
    displayName: string;
    monetizationType: string;
    presentationType: string;
    url: string;
  }>;
}

export interface BackendWatchlistItem {
  _id: string;
  show_id: string;
  rank: number;
  createdAt: string;
  show: BackendShow;
}

export interface BackendSubscription {
  _id: string;
  service: string;
  displayName: string;
  status: 'active' | 'cancelled';
  monthlyCost: number;
  monthly_cost?: number;
  updatedAt: string;
}

export interface ServicePrice {
  name: string;
  monthly: number;
}

export interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done';
  text?: string;
  name?: string;
  input?: unknown;
  history?: unknown[];
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `API ${res.status} ${path}`);
  }

  return res.json();
}

export const signup = (name: string, email: string, password: string) =>
  req<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

export const login = (email: string, password: string) =>
  req<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const logout = () =>
  req<{ success: boolean }>('/api/auth/logout', { method: 'POST' });

export const getCurrentUser = () =>
  req<{ user: AuthUser }>('/api/auth/me');

export const checkHealth = () =>
  req<{ status: string }>('/api/health');

export const getPopularShows = (limit = 2000) =>
  req<BackendShow[]>(`/api/shows/popular?limit=${limit}`);

export const searchShows = (q: string, genre?: string, service?: string) => {
  const p = new URLSearchParams({ limit: '2000' });
  if (q) p.set('q', q);
  if (genre && genre !== 'All') p.set('genre', genre.toLowerCase());
  if (service) p.set('service', service);
  return req<BackendShow[]>(`/api/shows?${p}`);
};

export const getWatchlist = () =>
  req<BackendWatchlistItem[]>('/api/watchlist');

export const addToWatchlist = (showId: string) =>
  req<{ success: boolean; rank: number; show: BackendShow }>(
    '/api/watchlist',
    { method: 'POST', body: JSON.stringify({ show_id: showId }) },
  );

export const removeFromWatchlist = (showId: string) =>
  req<{ success: boolean }>(`/api/watchlist/${showId}`, {
    method: 'DELETE',
  });

export const reorderWatchlist = (items: { show_id: string; rank: number }[]) =>
  req<{ success: boolean }>('/api/watchlist/rank', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });

export const getSubscriptions = () =>
  req<{
    subscriptions: BackendSubscription[];
    active_count: number;
    monthly_total: number;
  }>('/api/subscriptions');

export const getServicePrices = () =>
  req<Record<string, ServicePrice>>('/api/subscriptions/prices/all');

export const activateService = (service: string) =>
  req<{ success: boolean; cost: number }>(
    '/api/subscriptions/activate',
    { method: 'POST', body: JSON.stringify({ service }) },
  );

export const cancelService = (service: string) =>
  req<{ success: boolean }>(
    '/api/subscriptions/cancel',
    { method: 'POST', body: JSON.stringify({ service }) },
  );

export const applyPlan = (activate: string[], cancel: string[]) =>
  req<{ success: boolean; activated: string[]; cancelled: string[] }>(
    '/api/subscriptions/apply',
    { method: 'POST', body: JSON.stringify({ activate, cancel }) },
  );

export interface AutomationResult {
  ok: boolean;
  action?: string;
  message?: string;
  error?: string;
  steps?: string[];
  screenshot?: string;
  url?: string;
}

/**
 * Drive real subscribe/unsubscribe automation for a service (testing harness).
 * Returns the runner's JSON for both success and "ran but failed" (422); throws
 * only when automation is unavailable (disabled / unauthorized / server error).
 */
export async function runAutomation(
  service: string,
  action: 'subscribe' | 'unsubscribe',
  email: string,
  password: string,
): Promise<AutomationResult> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}/api/automation/${service}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ action, email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403 || res.status >= 500) {
    throw new Error(body?.error || `Automation unavailable (${res.status})`);
  }
  return body as AutomationResult;
}

export async function* streamAgentChat(
  message: string,
  history: unknown[] = [],
): AsyncGenerator<AgentEvent> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}/api/agent/chat`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok || !res.body) throw new Error('Agent chat failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      const t = line.trim();
      if (!t || t === '[DONE]') continue;
      if (t.startsWith('data: ')) {
        try {
          yield JSON.parse(t.slice(6)) as AgentEvent;
        } catch {
          /* skip malformed */
        }
      }
    }
  }
}

export function adaptShow(s: BackendShow): Show {
  return {
    id: s.externalId ?? (s as any)._id ?? '',
    title: s.title,
    type: s.type ?? 'movie',
    posterUrl: s.posterUrl || `https://picsum.photos/seed/${encodeURIComponent(s.title)}/300/450`,
    backdropUrl: s.backdropUrl,
    overview: s.overview,
    genres: Array.isArray(s.genre) ? s.genre : [],
    streamingServices: Array.isArray(s.services) ? s.services : [],
    year: s.year ?? 0,
    rating: s.priorityWeight ?? s.priority_weight ?? 5,
  };
}
