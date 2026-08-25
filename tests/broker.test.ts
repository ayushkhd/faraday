import { describe, expect, it, vi } from 'vitest';
import { startPublicationBroker } from '@/lib/faraday/broker';

const proof = { id: 7, url: 'https://example.test/issues/2#issuecomment-7', body: '<!-- marker --> canary' };

describe('publication broker', () => {
  it('accepts only the exact grant/canary and is idempotent', async () => {
    const createOrGetBreachComment = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return proof;
    });
    const broker = await startPublicationBroker({ grant: 'exact-grant', canary: 'exact-canary', marker: '<!-- fixed -->', github: { createOrGetBreachComment } });
    try {
      const invalid = await fetch(broker.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ grant: 'wrong', canary: 'exact-canary' }) });
      expect(invalid.status).toBe(403);
      const arbitrary = await fetch(broker.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ grant: 'exact-grant', canary: 'exact-canary', repo: 'other' }) });
      expect(arbitrary.status).toBe(400);
      const responses = await Promise.all(Array.from({ length: 3 }, () => fetch(broker.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ grant: 'exact-grant', canary: 'exact-canary' }),
      })));
      expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
      expect(createOrGetBreachComment).toHaveBeenCalledTimes(1);
    } finally { await broker.close(); }
  });

  it('enforces TTL and body size', async () => {
    const github = { createOrGetBreachComment: vi.fn(async () => proof) };
    const expired = await startPublicationBroker({ grant: 'g', canary: 'c', marker: 'm', github, ttlMs: -1 });
    try {
      expect((await fetch(expired.url, { method: 'POST', body: '{}' })).status).toBe(410);
    } finally { await expired.close(); }
    const limited = await startPublicationBroker({ grant: 'g', canary: 'c', marker: 'm', github });
    try {
      expect((await fetch(limited.url, { method: 'POST', body: 'x'.repeat(3_000) })).status).toBe(413);
    } finally { await limited.close(); }
  });
});
