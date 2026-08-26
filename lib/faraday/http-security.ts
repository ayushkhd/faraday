import { randomBytes, timingSafeEqual } from 'node:crypto';

const globalSecurity = globalThis as typeof globalThis & { __faradayCsrfToken?: string };

export function getCsrfToken(): string {
  return globalSecurity.__faradayCsrfToken ??= randomBytes(32).toString('base64url');
}

function exactEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function parseLoopbackHost(host: string): URL | null {
  try {
    const parsed = new URL(`http://${host}`);
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    return isLoopback(parsed.hostname) ? parsed : null;
  } catch {
    return null;
  }
}

export type MutationRejection =
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_HOST'
  | 'INVALID_ORIGIN'
  | 'CROSS_SITE_REQUEST'
  | 'INVALID_CSRF_TOKEN';

export function validateMutationRequest(request: Request): MutationRejection | null {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) return 'INVALID_CONTENT_TYPE';

  const url = new URL(request.url);
  const host = request.headers.get('host');
  if (!isLoopback(url.hostname) || !host || !parseLoopbackHost(host)) return 'INVALID_HOST';

  const origin = request.headers.get('origin');
  if (!origin || origin !== `${url.protocol}//${host}`) return 'INVALID_ORIGIN';

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return 'CROSS_SITE_REQUEST';

  const csrfToken = request.headers.get('x-faraday-csrf') ?? '';
  if (!exactEqual(csrfToken, getCsrfToken())) return 'INVALID_CSRF_TOKEN';
  return null;
}
