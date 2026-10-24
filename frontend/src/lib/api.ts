// EduNexus AI — API fetch wrapper for backend calls with in-memory caching and request deduplication

const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://edunexus-ai-api-z0v1.onrender.com'
  : 'http://localhost:8000';
const API_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
export const apiUrl = (endpoint: string) => `${API_URL}${endpoint}`;

// Default demo staff bearer token for explicit sign-in flows and evaluator demos.
export const DEMO_BEARER_TOKEN = 'edunexus-demo-advisor-token';

export function getAuthToken(): string {
  try {
    if (localStorage.getItem('edunexus_logged_out') === 'true') {
      return '';
    }
    const token = localStorage.getItem('edunexus_auth_token');
    if (token && token.trim()) {
      return token.trim();
    }
    return DEMO_BEARER_TOKEN;
  } catch {
    return DEMO_BEARER_TOKEN;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem('edunexus_auth_token', token);
    // Invalidate cached responses when authentication changes
    clearApiCache();
  } catch {
    // LocalStorage unavailable in non-browser environment
  }
}

export interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  bypassCache?: boolean;
  cacheTtlMs?: number;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

// Default in-memory cache TTL for idempotent GET requests: 30 seconds
const DEFAULT_CACHE_TTL_MS = 30_000;

// In-memory cache map: key -> CacheEntry
const apiCache = new Map<string, CacheEntry>();

// In-flight active request map for promise deduplication: key -> Promise<unknown>
const inFlightRequests = new Map<string, Promise<unknown>>();

function buildCacheKey(endpoint: string): string {
  const token = getAuthToken();
  return `${token ? 'auth:' + token.slice(-8) + ':' : 'anon:'}${endpoint}`;
}

/**
 * Synchronously retrieves cached data for an endpoint if present and not expired.
 * Useful for instant UI hydration on component mount without showing a loading spinner.
 */
export function getCachedApiData<T>(endpoint: string): T | null {
  const key = buildCacheKey(endpoint);
  const entry = apiCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > entry.ttl) {
    apiCache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Clears in-memory API cache entries.
 * If endpointPrefix is provided, only entries starting with that prefix are purged.
 */
export function clearApiCache(endpointPrefix?: string): void {
  if (!endpointPrefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(endpointPrefix)) {
      apiCache.delete(key);
    }
  }
}

export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    bypassCache = false,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  } = options;

  const isGet = method.toUpperCase() === 'GET';
  const cacheKey = buildCacheKey(endpoint);

  // 1. Return cached response for GET if valid and not explicitly bypassed
  if (isGet && !bypassCache) {
    const cached = getCachedApiData<T>(endpoint);
    if (cached !== null) {
      return cached;
    }

    // 2. In-flight request deduplication: reuse active promise if another caller already requested it
    const activePromise = inFlightRequests.get(cacheKey);
    if (activePromise) {
      return activePromise as Promise<T>;
    }
  }

  const token = getAuthToken();
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    signal,
  };

  if (body && !isGet) {
    config.body = JSON.stringify(body);
  }

  const executeFetch = async (): Promise<T> => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        const errorMsg = error.detail || error?.error?.message || `API error: ${response.status}`;
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }

      const data = (await response.json()) as T;

      // Cache successful GET responses
      if (isGet && cacheTtlMs > 0) {
        apiCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: cacheTtlMs,
        });
      }

      // Purge cache on mutating requests
      if (!isGet) {
        clearApiCache();
      }

      return data;
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  };

  if (isGet) {
    const requestPromise = executeFetch();
    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  return executeFetch();
}

export async function apiUpload<T>(endpoint: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Upload error: ${response.status}`);
  }

  // File upload mutates data (e.g. CSV ingestion), so clear cache
  clearApiCache();

  return response.json();
}
