import { describe, expect, it } from 'vitest';
import { getCsrfToken, validateMutationRequest } from '@/lib/faraday/http-security';

function request(overrides: Record<string, string> = {}, url = 'http://127.0.0.1:3000/api/run'): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      host: '127.0.0.1:3000',
      origin: 'http://127.0.0.1:3000',
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
      'x-faraday-csrf': getCsrfToken(),
      ...overrides,
    },
    body: '{}',
  });
}

describe('local mutation request policy', () => {
  it('accepts an approved same-origin loopback request', () => {
    expect(validateMutationRequest(request())).toBeNull();
  });

  it('accepts a browser-visible loopback host when Next.js canonicalizes the internal URL', () => {
    expect(validateMutationRequest(request({}, 'http://localhost:3000/api/run'))).toBeNull();
  });

  it('rejects plain-text, cross-origin, remote-host, and missing-token requests', () => {
    expect(validateMutationRequest(request({ 'content-type': 'text/plain' }))).toBe('INVALID_CONTENT_TYPE');
    expect(validateMutationRequest(request({ origin: 'https://attacker.example' }))).toBe('INVALID_ORIGIN');
    expect(validateMutationRequest(request({ 'sec-fetch-site': 'cross-site' }))).toBe('CROSS_SITE_REQUEST');
    expect(validateMutationRequest(request({ 'x-faraday-csrf': '' }))).toBe('INVALID_CSRF_TOKEN');
    expect(validateMutationRequest(request({ host: 'faraday.example' }, 'http://faraday.example/api/run'))).toBe('INVALID_HOST');
    expect(validateMutationRequest(request({ host: '127.0.0.1:3000@attacker.example' }))).toBe('INVALID_HOST');
  });
});
