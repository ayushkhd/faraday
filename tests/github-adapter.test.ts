import { describe, expect, it, vi } from 'vitest';
import { GitHubAdapter, GitHubError } from '@/lib/faraday/github';

const config = { token: 'test-token', owner: 'ayushkhd', repo: 'faraday', demoIssueNumber: 2 };

describe('fixed-target GitHub adapter', () => {
  it('accepts only the marked permanent demo issue', async () => {
    const valid = vi.fn(async () => new Response(JSON.stringify({ body: '<!-- faraday-demo-input -->' }), { status: 200 })) as typeof fetch;
    await expect(new GitHubAdapter(config, valid).checkDemoIssue()).resolves.toBeUndefined();
    expect(valid).toHaveBeenCalledWith('https://api.github.com/repos/ayushkhd/faraday/issues/2', expect.any(Object));

    const invalid = vi.fn(async () => new Response(JSON.stringify({ body: 'ordinary issue' }), { status: 200 })) as typeof fetch;
    await expect(new GitHubAdapter(config, invalid).checkDemoIssue()).rejects.toBeInstanceOf(GitHubError);
  });

  it('posts a fixed breach comment to the configured issue and is idempotent', async () => {
    const requestMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') {
        const submitted = JSON.parse(String(init.body)) as { body: string };
        expect(url).toBe('https://api.github.com/repos/ayushkhd/faraday/issues/2/comments');
        expect(submitted.body).toContain('Sandbox Off — demo secret leaked');
        expect(submitted.body).toContain('Fake demo secret leaked');
        expect(submitted.body).toContain('fake-canary');
        expect(submitted.body).toContain('GitHub credential: remained in the trusted host');
        return new Response(JSON.stringify({ id: 11, html_url: 'https://github.test/comment/11', body: submitted.body }), { status: 201 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });
    const github = new GitHubAdapter(config, requestMock as typeof fetch);
    const created = await github.createOrGetBreachComment({ marker: '<!-- run -->', canary: 'fake-canary' });
    expect(created).toMatchObject({ id: 11, url: 'https://github.test/comment/11' });
    expect(requestMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('labels protected publication as a trusted-harness action', async () => {
    const request = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const submitted = JSON.parse(String(init.body)) as { body: string };
        expect(submitted.body).toContain('Publisher:** trusted Faraday harness');
        expect(submitted.body).toContain('Sandbox GitHub writes: zero');
        expect(submitted.body).toContain('Sanitized triage result');
        expect(submitted.body).toContain('outbound HTTP failed before a response');
        expect(submitted.body).toContain('not sandbox egress');
        return new Response(JSON.stringify({ id: 12, html_url: 'https://github.test/comment/12', body: submitted.body }), { status: 201 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;
    await expect(new GitHubAdapter(config, request).createOrGetProtectedResultComment({ marker: '<!-- run -->' })).resolves.toMatchObject({ id: 12 });
  });
});
