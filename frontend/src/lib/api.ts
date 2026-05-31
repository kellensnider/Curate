import type { Show } from './mockData';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export const USER_ID = 1;

// ─── Backend shapes ──────────────────────────────────────────────────────────

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

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json();
}

// ─── Health ──────────────────────────────────────────────────────────────────

export const checkHealth = () =>
  req<{ status: string }>('/api/health');

// ─── Shows ───────────────────────────────────────────────────────────────────

export const getPopularShows = () =>
  req<BackendShow[]>('/api/shows/popular');

export const searchShows = (q: string, genre?: string, service?: string) => {
  const p = new URLSearchParams({ limit: '60' });
  if (q) p.set('q', q);
  if (genre && genre !== 'All') p.set('genre', genre.toLowerCase());
  if (service) p.set('service', service);
  return req<BackendShow[]>(`/api/shows?${p}`);
};

// ─── Watchlist ────────────────────────────────────────────────────────────────

export const getWatchlist = () =>
  req<BackendWatchlistItem[]>(`/api/watchlist/${USER_ID}`);

export const addToWatchlist = (showId: string) =>
  req<{ success: boolean; rank: number; show: BackendShow }>(
    `/api/watchlist/${USER_ID}`,
    { method: 'POST', body: JSON.stringify({ show_id: showId }) },
  );

export const removeFromWatchlist = (showId: string) =>
  req<{ success: boolean }>(`/api/watchlist/${USER_ID}/${showId}`, {
    method: 'DELETE',
  });

export const reorderWatchlist = (items: { show_id: string; rank: number }[]) =>
  req<{ success: boolean }>(`/api/watchlist/${USER_ID}/rank`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const getSubscriptions = () =>
  req<{
    subscriptions: BackendSubscription[];
    active_count: number;
    monthly_total: number;
  }>(`/api/subscriptions/${USER_ID}`);

export const getServicePrices = () =>
  req<Record<string, ServicePrice>>('/api/subscriptions/prices/all');

export const activateService = (service: string) =>
  req<{ success: boolean; cost: number }>(
    `/api/subscriptions/${USER_ID}/activate`,
    { method: 'POST', body: JSON.stringify({ service }) },
  );

export const cancelService = (service: string) =>
  req<{ success: boolean }>(
    `/api/subscriptions/${USER_ID}/cancel`,
    { method: 'POST', body: JSON.stringify({ service }) },
  );

/** Apply a whole plan at once — runs the MCP tool functions server-side. */
export const applyPlan = (activate: string[], cancel: string[]) =>
  req<{ success: boolean; activated: string[]; cancelled: string[] }>(
    `/api/subscriptions/${USER_ID}/apply`,
    { method: 'POST', body: JSON.stringify({ activate, cancel }) },
  );

// ─── Agent (SSE streaming) ────────────────────────────────────────────────────

export async function* streamAgentChat(
  message: string,
  history: unknown[] = [],
): AsyncGenerator<AgentEvent> {
  const res = await fetch(`${BASE}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

// ─── Shape adapter ────────────────────────────────────────────────────────────

export function adaptShow(s: BackendShow): Show {
  return {
    id: s.externalId ?? (s as any)._id ?? '',
    title: s.title,
    type: s.type ?? 'movie',
    // Use the real catalog poster; fall back to a placeholder only if missing.
    posterUrl: s.posterUrl || `https://picsum.photos/seed/${encodeURIComponent(s.title)}/300/450`,
    backdropUrl: s.backdropUrl,
    overview: s.overview,
    genres: Array.isArray(s.genre) ? s.genre : [],
    streamingServices: Array.isArray(s.services) ? s.services : [],
    year: s.year ?? 0,
    rating: s.priorityWeight ?? s.priority_weight ?? 5,
  };
}
