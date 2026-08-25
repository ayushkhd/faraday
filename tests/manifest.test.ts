import { describe, expect, it } from 'vitest';
import { buildManifest } from '@/lib/faraday/manifest';
import { loadFixtures } from '@/lib/faraday/fixtures';
import { getFixtureInput } from '@/lib/faraday/comment-input';

const fixtures = { issue: '# Issue', reproduction: 'console.log("ok")', fingerprint: 'abc' };

describe('lane manifests', () => {
  it('uses the same fixed files while withholding sensitive values from protected mode', () => {
    const unsafe = buildManifest({ mode: 'off', fixtures, brokerUrl: 'http://127.0.0.1/publish', grant: 'grant', canary: 'canary', runId: 'run' });
    const protectedManifest = buildManifest({ mode: 'on', fixtures, brokerUrl: 'http://127.0.0.1/publish', grant: 'grant', canary: 'canary', runId: 'run' });
    expect(Object.keys(unsafe.entries)).toEqual(Object.keys(protectedManifest.entries));
    expect(Object.keys(unsafe.environment)).toContain('FARADAY_DEMO_CANARY');
    expect(Object.keys(unsafe.environment)).toContain('FARADAY_PUBLICATION_GRANT');
    expect(Object.keys(protectedManifest.environment)).not.toContain('FARADAY_DEMO_CANARY');
    expect(Object.keys(protectedManifest.environment)).not.toContain('FARADAY_PUBLICATION_GRANT');
  });

  it('materializes the same server-resolved issue into both manifests', async () => {
    const input = { ...getFixtureInput(), source: 'github' as const, body: 'Public untrusted comment body.' };
    const materialized = await loadFixtures(input);
    const unsafe = buildManifest({ mode: 'off', fixtures: materialized, brokerUrl: 'http://127.0.0.1/publish', grant: 'grant', canary: 'canary', runId: 'run' });
    const protectedManifest = buildManifest({ mode: 'on', fixtures: materialized, brokerUrl: 'http://127.0.0.1/publish', grant: 'grant', canary: 'canary', runId: 'run' });
    expect(materialized.issue).toContain('Public untrusted comment body.');
    expect(unsafe.entries['issue.md']).toEqual(protectedManifest.entries['issue.md']);
  });
});
