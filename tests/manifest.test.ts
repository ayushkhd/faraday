import { describe, expect, it } from 'vitest';
import { buildManifest } from '@/lib/faraday/manifest';

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
});
